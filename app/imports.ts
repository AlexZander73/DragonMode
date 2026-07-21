import type {
  DragonState,
  ImportBatch,
  ImportCandidateAction,
  ImportedCandidate,
  ImportMappingTemplate,
  ImportResolution,
  ImportRule,
  ImportSourceKind,
  ReconciliationRecord,
  Transaction,
} from "./data";
import { createTransaction, replaceTransaction } from "./ledger";

const PARSER_VERSION = "trusted-ledger-1";
const DAY_MS = 86_400_000;
const MAX_SOURCE_CHARACTERS = 5_000_000;
const MAX_SOURCE_ROWS = 10_000;

export type ImportStageOptions = {
  accountId: string;
  sourceKind?: ImportSourceKind;
  sourceDisplayName?: string;
  locale?: string;
  currency?: string;
  dateOrder?: ImportBatch["dateOrder"];
  signConvention?: ImportBatch["signConvention"];
  mappingTemplate?: ImportMappingTemplate;
};

export type ImportCommitOptions = {
  closingBalance?: number;
  periodStart?: string;
  periodEnd?: string;
  tolerance?: number;
  reconciliationNote?: string;
};

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function stableSourceHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const cleanCell = (value = "") => value.trim().replace(/^\uFEFF/, "");

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(cleanCell(current));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(cleanCell(current));
  return cells;
}

const delimiterScore = (line: string, delimiter: string) => parseDelimitedLine(line, delimiter).length;

function detectDelimiter(lines: string[], template?: ImportMappingTemplate) {
  if (template) return template.delimiter;
  const first = lines.find((line) => line.trim()) ?? "";
  return ([",", "\t", ";"] as Array<"," | "\t" | ";">).sort((a, b) => delimiterScore(first, b) - delimiterScore(first, a))[0];
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function columnIndex(headers: string[], patterns: RegExp[], explicit?: string) {
  if (explicit) {
    const wanted = normalizeHeader(explicit);
    const index = headers.findIndex((header) => header === wanted);
    if (index >= 0) return index;
  }
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
}

function parseMoney(value: string) {
  const trimmed = cleanCell(value);
  if (!trimmed) return null;
  const parenthesized = /^\(.*\)$/.test(trimmed);
  const normalized = trimmed.replace(/[()$£€¥\s]/g, "").replace(/,(?=\d{3}(?:\D|$))/g, "").replace(/,(\d{1,2})$/, ".$1");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parenthesized ? -Math.abs(parsed) : parsed;
}

function parseDate(value: string, order: ImportBatch["dateOrder"]) {
  const raw = cleanCell(value);
  if (!raw) return null;
  const direct = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw) ? new Date(raw) : null;
  if (direct && Number.isFinite(direct.getTime())) return direct.toISOString();
  const match = raw.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})(?:\s+.*)?$/);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isFinite(fallback.getTime()) ? fallback.toISOString() : null;
  }
  let year: number;
  let month: number;
  let day: number;
  if (order === "YMD" || match[1].length === 4) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
  } else if (order === "MDY") {
    month = Number(match[1]); day = Number(match[2]); year = Number(match[3]);
  } else {
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
  }
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function normalizeMerchant(value: string) {
  return cleanCell(value)
    .replace(/\b(?:visa|debit|purchase|card|pos|eftpos|transaction)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[-*\s]+|[-*\s]+$/g, "")
    .trim() || "Unlabelled movement";
}

function similarityKey(input: { accountId: string; date: string; amount: number; direction: string; merchant: string }) {
  return [input.accountId, input.date.slice(0, 10), input.amount.toFixed(2), input.direction, normalizeMerchant(input.merchant).toLowerCase()].join("|");
}

function sourceFingerprint(input: { accountId: string; sourceTransactionId?: string; date: string; amount: number; direction: string; merchant: string; occurrenceIndex: number }) {
  const identity = input.sourceTransactionId
    ? `source:${input.sourceTransactionId}|${input.date.slice(0, 10)}|${input.amount.toFixed(2)}|${input.direction}`
    : `${similarityKey(input)}|occurrence:${input.occurrenceIndex}`;
  return stableSourceHash(`${input.accountId}|${identity}`);
}

function applyRules(merchant: string, accountId: string, rules: ImportRule[]) {
  const matching = rules
    .filter((rule) => (!rule.accountId || rule.accountId === accountId) && rule.merchantPattern && merchant.toLowerCase().includes(rule.merchantPattern.toLowerCase()))
    .sort((a, b) => b.priority - a.priority);
  const rule = matching[0];
  return { merchant: rule?.renameMerchant || merchant, category: rule?.category || "Uncategorised", ruleId: rule?.id };
}

type ParsedRow = {
  raw: string;
  rowNumber: number;
  dateValue: string;
  description: string;
  amountValue?: string;
  debitValue?: string;
  creditValue?: string;
  statusValue?: string;
  sourceId?: string;
  inferredDate?: boolean;
  directionHint?: "income" | "expense";
};

function tabularRows(text: string, template?: ImportMappingTemplate): ParsedRow[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines, template);
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const normalizedFirst = rows[0].map(normalizeHeader);
  const headerLooksReal = normalizedFirst.some((value) => /date|description|merchant|narration|amount|debit|credit/.test(value));
  const headers = headerLooksReal ? normalizedFirst : [];
  const date = columnIndex(headers, [/^date$/, /transaction date/, /posted date/, /value date/], template?.columns.date);
  const description = columnIndex(headers, [/description/, /merchant/, /narration/, /details/, /memo/, /payee/], template?.columns.description);
  const amount = columnIndex(headers, [/^amount$/, /transaction amount/, /value/], template?.columns.amount);
  const debit = columnIndex(headers, [/debit/, /withdrawal/, /money out/], template?.columns.debit);
  const credit = columnIndex(headers, [/credit/, /deposit/, /money in/], template?.columns.credit);
  const status = columnIndex(headers, [/status/], template?.columns.status);
  const sourceId = columnIndex(headers, [/transaction id/, /reference/, /^id$/, /fitid/], template?.columns.sourceId);
  const body = headerLooksReal ? rows.slice(1) : rows;
  return body.map((cells, bodyIndex) => {
    const dateIndex = date >= 0 ? date : 0;
    const amountIndex = amount >= 0 ? amount : cells.length - 1;
    const descriptionIndex = description >= 0 ? description : Math.min(1, cells.length - 1);
    return {
      raw: lines[bodyIndex + (headerLooksReal ? 1 : 0)],
      rowNumber: bodyIndex + (headerLooksReal ? 2 : 1),
      dateValue: cells[dateIndex] ?? "",
      description: cells[descriptionIndex] ?? "",
      amountValue: cells[amountIndex] ?? "",
      debitValue: debit >= 0 ? cells[debit] : undefined,
      creditValue: credit >= 0 ? cells[credit] : undefined,
      statusValue: status >= 0 ? cells[status] : undefined,
      sourceId: sourceId >= 0 ? cells[sourceId] : undefined,
    };
  });
}

function looseTextRows(text: string): ParsedRow[] {
  return text.replace(/\r\n?/g, "\n").split("\n").reduce<ParsedRow[]>((result, line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return result;
    const strict = trimmed.match(/^(\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4})\s+(.+?)\s+([()\-$£€¥\d][\d,.()\-$£€¥]*)$/);
    if (strict) {
      result.push({ raw: line, rowNumber: index + 1, dateValue: strict[1], description: strict[2], amountValue: strict[3] });
      return result;
    }
    const dateMatch = trimmed.match(/\b\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}\b/);
    const moneyMatches = [...trimmed.matchAll(/(?:\(?[-+]?(?:[$£€¥]\s*)?\d[\d,]*(?:\.\d{1,2})?\)?)/g)];
    const amountMatch = [...moneyMatches].reverse().find((match) => !dateMatch || match.index! < dateMatch.index! || match.index! >= dateMatch.index! + dateMatch[0].length);
    if (!amountMatch) return result;
    const directionHint = /\b(?:spent|paid|bought|purchase|withdrew|withdrawal)\b/i.test(trimmed)
      ? "expense" as const
      : /\b(?:received|earned|salary|income|deposit|refund)\b/i.test(trimmed)
        ? "income" as const
        : undefined;
    const signedAmount = directionHint === "expense" && !amountMatch[0].includes("-") ? `-${amountMatch[0]}` : amountMatch[0];
    const description = trimmed
      .replace(dateMatch?.[0] ?? "", " ")
      .replace(amountMatch[0], " ")
      .replace(/\b(?:today|yesterday|spent|paid|bought|purchase|received|earned|at|from)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim() || "Imported movement";
    const inferred = !dateMatch;
    const dateValue = dateMatch?.[0] ?? new Date().toISOString().slice(0, 10);
    result.push({ raw: line, rowNumber: index + 1, dateValue, description, amountValue: signedAmount, inferredDate: inferred, directionHint });
    return result;
  }, []);
}

function ofxRows(text: string): ParsedRow[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>|$))/gi) ?? [];
  const field = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim() ?? "";
  return blocks.reduce<ParsedRow[]>((result, block, index) => {
    const rawDate = field(block, "DTPOSTED") || field(block, "DTUSER");
    const dateValue = rawDate.match(/^(\d{4})(\d{2})(\d{2})/) ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
    const amountValue = field(block, "TRNAMT");
    if (!dateValue || !amountValue) return result;
    result.push({
      raw: block.trim(),
      rowNumber: index + 1,
      dateValue,
      description: field(block, "NAME") || field(block, "MEMO") || "Imported movement",
      amountValue,
      statusValue: /PENDING/i.test(field(block, "TRNTYPE")) ? "pending" : "cleared",
      sourceId: field(block, "FITID") || undefined,
    });
    return result;
  }, []);
}

function qifRows(text: string): ParsedRow[] {
  const records = text.replace(/\r\n?/g, "\n").split(/^\^\s*$/m);
  return records.reduce<ParsedRow[]>((result, record, index) => {
    const values = record.split("\n");
    const take = (prefix: string) => values.find((line) => line.startsWith(prefix))?.slice(1).trim() ?? "";
    const dateValue = take("D");
    const amountValue = take("T");
    if (!dateValue || !amountValue) return result;
    result.push({ raw: record.trim(), rowNumber: index + 1, dateValue, description: take("P") || take("M") || "Imported movement", amountValue, sourceId: take("N") || undefined });
    return result;
  }, []);
}

function parsedRows(text: string, sourceKind: ImportSourceKind, template?: ImportMappingTemplate) {
  if (sourceKind === "ofx" || sourceKind === "qfx") return ofxRows(text);
  if (sourceKind === "qif") return qifRows(text);
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim());
  const delimiter = detectDelimiter(lines, template);
  const looksTabular = delimiterScore(lines[0] ?? "", delimiter) >= 3;
  return looksTabular ? tabularRows(text, template) : looseTextRows(text);
}

function findPendingMatch(state: DragonState, candidate: Pick<ImportedCandidate, "accountId" | "amount" | "normalizedMerchant" | "date" | "status" | "sourceTransactionId">) {
  if (candidate.status !== "cleared") return undefined;
  return state.transactions.find((transaction) => {
    const amountDifference = Math.abs(transaction.amount - candidate.amount);
    const plausibleSettlementChange = amountDifference <= Math.max(5, transaction.amount * 0.25);
    if (transaction.status !== "pending" || transaction.accountId !== candidate.accountId || !plausibleSettlementChange) return false;
    const nearDate = Math.abs(new Date(transaction.date).getTime() - new Date(candidate.date).getTime()) <= 10 * DAY_MS;
    const sameMerchant = normalizeMerchant(transaction.merchant).toLowerCase() === candidate.normalizedMerchant.toLowerCase();
    return nearDate && sameMerchant;
  });
}

function findPossibleDuplicate(state: DragonState, candidate: Pick<ImportedCandidate, "accountId" | "amount" | "normalizedMerchant" | "date" | "direction">) {
  const key = similarityKey({ ...candidate, merchant: candidate.normalizedMerchant });
  return state.transactions.find((transaction) => similarityKey({ ...transaction, merchant: transaction.merchant }) === key);
}

function findRefundMatch(state: DragonState, candidate: Pick<ImportedCandidate, "accountId" | "amount" | "normalizedMerchant" | "date" | "direction">) {
  if (candidate.direction !== "income") return undefined;
  return state.transactions.find((transaction) => transaction.accountId === candidate.accountId
    && transaction.direction === "expense"
    && Math.abs(transaction.amount - candidate.amount) <= 0.01
    && normalizeMerchant(transaction.merchant).toLowerCase() === candidate.normalizedMerchant.toLowerCase()
    && new Date(candidate.date).getTime() >= new Date(transaction.date).getTime()
    && new Date(candidate.date).getTime() - new Date(transaction.date).getTime() <= 90 * DAY_MS);
}

function findTransferCandidate(state: DragonState, candidate: Pick<ImportedCandidate, "accountId" | "amount" | "date" | "direction">) {
  return state.transactions.find((transaction) => transaction.accountId !== candidate.accountId
    && transaction.direction !== candidate.direction
    && Math.abs(transaction.amount - candidate.amount) <= 0.01
    && Math.abs(new Date(transaction.date).getTime() - new Date(candidate.date).getTime()) <= 3 * DAY_MS);
}

export function stageTextImport(state: DragonState, text: string, options: ImportStageOptions): ImportBatch {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error("Paste at least one transaction row first");
  if (normalizedText.length > MAX_SOURCE_CHARACTERS) throw new Error("This source is larger than the 5 MB safety limit. Split it into smaller statement periods.");
  const sourceLineCount = normalizedText.split(/\r?\n/).length;
  if (sourceLineCount > MAX_SOURCE_ROWS) throw new Error("This source has more than 10,000 rows. Split it into smaller statement periods.");
  if (!state.accounts.some((account) => account.id === options.accountId)) throw new Error("Choose a balance for these rows");
  const batchId = uid("import");
  const dateOrder = options.mappingTemplate?.dateOrder ?? options.dateOrder ?? (options.locale?.startsWith("en-US") ? "MDY" : "DMY");
  const signConvention = options.mappingTemplate?.signConvention ?? options.signConvention ?? "negative-expense";
  const sourceHash = stableSourceHash(normalizedText);
  const priorBatch = state.imports.batches.find((batch) => batch.sourceHash === sourceHash && batch.accountId === options.accountId && batch.status === "committed");
  const sourceKind = options.sourceKind ?? "paste";
  const rows = parsedRows(normalizedText, sourceKind, options.mappingTemplate);
  if (!rows.length) throw new Error("DragonMode could not find dated transaction rows. Try CSV columns for date, description, and amount.");
  const occurrences = new Map<string, number>();
  const candidates: ImportedCandidate[] = [];
  const skippedSourceRows: NonNullable<ImportBatch["skippedSourceRows"]> = [];
  for (const row of rows) {
    const date = parseDate(row.dateValue, dateOrder);
    const debit = parseMoney(row.debitValue ?? "");
    const credit = parseMoney(row.creditValue ?? "");
    const amountCell = parseMoney(row.amountValue ?? "");
    const hasDebitCredit = debit !== null || credit !== null;
    const rawAmount = hasDebitCredit ? (credit !== null && credit !== 0 ? Math.abs(credit) : debit !== null ? -Math.abs(debit) : null) : amountCell;
    if (!date || rawAmount === null || Math.abs(rawAmount) < 0.000001) {
      skippedSourceRows.push({ rowNumber: row.rowNumber, raw: row.raw, reason: !date ? "No valid date" : rawAmount === null ? "No valid amount" : "Zero-value or summary row" });
      continue;
    }
    const direction = row.directionHint ?? (hasDebitCredit
      ? (rawAmount >= 0 ? "income" : "expense")
      : signConvention === "positive-expense"
        ? (rawAmount >= 0 ? "expense" : "income")
        : (rawAmount < 0 ? "expense" : "income"));
    const baseMerchant = normalizeMerchant(row.description);
    const ruled = applyRules(baseMerchant, options.accountId, state.imports.rules);
    const similarity = similarityKey({ accountId: options.accountId, date, amount: Math.abs(rawAmount), direction, merchant: ruled.merchant });
    const occurrenceIndex = occurrences.get(similarity) ?? 0;
    occurrences.set(similarity, occurrenceIndex + 1);
    const draft: ImportedCandidate = {
      id: uid("candidate"),
      batchId,
      rawSourceRow: row.raw,
      rawRowNumber: row.rowNumber,
      sourceTransactionId: row.sourceId || undefined,
      date,
      postedDate: date,
      amount: Math.abs(rawAmount),
      currency: options.currency ?? state.profile.preferredCurrency,
      direction,
      status: /pending|authoris/i.test(row.statusValue ?? "") ? "pending" : "cleared",
      originalDescription: row.description,
      normalizedMerchant: ruled.merchant,
      accountId: options.accountId,
      categorySuggestion: ruled.category,
      fieldConfidence: { date: row.inferredDate ? 0.65 : date ? 0.96 : 0.2, amount: rawAmount !== null ? 0.98 : 0.2, merchant: row.description ? 0.9 : 0.4, account: 1 },
      confidence: row.inferredDate ? 0.78 : date && row.description ? 0.94 : 0.7,
      duplicateReasons: [],
      fingerprint: "",
      occurrenceIndex,
      proposedAction: "add",
    };
    draft.fingerprint = sourceFingerprint({ ...draft, merchant: draft.normalizedMerchant });
    const exact = state.transactions.find((transaction) => transaction.accountId === draft.accountId && (
      (draft.sourceTransactionId && transaction.sourceTransactionId === draft.sourceTransactionId && transaction.amount === draft.amount && transaction.direction === draft.direction && transaction.date.slice(0, 10) === draft.date.slice(0, 10))
      || transaction.sourceFingerprint === draft.fingerprint
    ));
    const pending = findPendingMatch(state, draft);
    const possible = findPossibleDuplicate(state, draft);
    const refund = findRefundMatch(state, draft);
    const transfer = findTransferCandidate(state, draft);
    let proposedAction: ImportCandidateAction = "add";
    if (priorBatch || exact) {
      proposedAction = "skip-exact";
      draft.matchedTransactionId = exact?.id;
      draft.duplicateReasons.push(priorBatch ? "This exact row was already added" : "A row with the same bank reference already exists");
    } else if (pending) {
      proposedAction = "hold";
      draft.lifecycleRelationship = "pending-posted";
      draft.matchedTransactionId = pending.id;
      draft.duplicateClusterId = stableSourceHash(`pending|${pending.id}|${draft.id}`);
      draft.duplicateReasons.push("A pending movement may have become this posted movement");
    } else if (refund) {
      draft.lifecycleRelationship = "refund";
      draft.matchedTransactionId = refund.id;
      draft.duplicateReasons.push("This income may refund an earlier expense; both movements remain visible");
    } else if (transfer) {
      proposedAction = "hold";
      draft.transferCandidateId = transfer.id;
      draft.matchedTransactionId = transfer.id;
      draft.duplicateClusterId = stableSourceHash(`transfer|${transfer.id}|${draft.id}`);
      draft.duplicateReasons.push("An equal opposite movement appears in another balance you track");
    } else if (possible) {
      proposedAction = "hold";
      draft.matchedTransactionId = possible.id;
      draft.duplicateClusterId = stableSourceHash(`echo|${possible.id}|${similarity}`);
      draft.duplicateReasons.push("Same balance, date, amount, direction, and merchant");
      if (possible.createdManually) draft.duplicateReasons.push("An existing manual entry may match this import");
    }
    candidates.push({ ...draft, proposedAction });
  }
  if (!candidates.length) throw new Error("Rows were found, but no valid date and amount pairs could be interpreted");
  const ambiguousNumericDate = rows.some((row) => {
    const match = row.dateValue.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-]\d{2,4}$/);
    return Boolean(match && Number(match[1]) <= 12 && Number(match[2]) <= 12 && Number(match[1]) !== Number(match[2]));
  });
  const amountOnlyRows = rows.filter((row) => !row.debitValue && !row.creditValue && parseMoney(row.amountValue ?? "") !== null);
  const signAmbiguous = amountOnlyRows.length > 0 && amountOnlyRows.every((row) => (parseMoney(row.amountValue ?? "") ?? 0) >= 0) && !amountOnlyRows.every((row) => row.directionHint);
  const ambiguityWarnings = [
    ...(ambiguousNumericDate && !options.dateOrder && !options.mappingTemplate ? ["Some dates could mean day/month or month/day"] : []),
    ...(signAmbiguous && !options.signConvention && !options.mappingTemplate ? ["Positive amounts could mean money in or money out"] : []),
  ];
  const withinBatchGroups = candidates.reduce<Map<string, ImportedCandidate[]>>((groups, candidate) => {
    const key = similarityKey({ ...candidate, merchant: candidate.normalizedMerchant });
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
    return groups;
  }, new Map());
  for (const group of withinBatchGroups.values()) {
    if (group.length < 2) continue;
    const clusterId = stableSourceHash(`batch-echo|${batchId}|${similarityKey({ ...group[0], merchant: group[0].normalizedMerchant })}`);
    for (const candidate of group) {
      if (candidate.proposedAction !== "add") continue;
      candidate.proposedAction = "hold";
      candidate.duplicateClusterId = clusterId;
      candidate.duplicateReasons.push(`${group.length} similar rows appear in this source; they may all be real`);
    }
  }
  return {
    id: batchId,
    sourceKind,
    sourceDisplayName: options.sourceDisplayName ?? (options.sourceKind === "csv" ? "CSV import" : "Pasted transactions"),
    accountId: options.accountId,
    createdAt: new Date().toISOString(),
    sourceHash,
    parserVersion: PARSER_VERSION,
    rawSource: normalizedText,
    locale: options.locale ?? state.profile.locale,
    dateOrder,
    signConvention,
    mappingConfirmed: ambiguityWarnings.length === 0,
    ambiguityWarnings,
    rawRowCount: rows.length,
    skippedSourceRows,
    candidates,
    counts: { added: 0, matched: 0, replaced: 0, skipped: candidates.filter((candidate) => candidate.proposedAction === "skip-exact").length, held: candidates.filter((candidate) => candidate.proposedAction === "hold").length },
    status: "staged",
  };
}

export function resolveImportCandidate(batch: ImportBatch, candidateId: string, resolution: ImportResolution): ImportBatch {
  const resolvedAt = new Date().toISOString();
  return {
    ...batch,
    candidates: batch.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, resolution, resolvedAt } : candidate),
  };
}

const candidateToTransaction = (candidate: ImportedCandidate, batch: ImportBatch): Transaction => ({
  id: uid("tx"),
  accountId: candidate.accountId,
  date: candidate.date,
  authorizedDate: candidate.authorizedDate,
  postedDate: candidate.postedDate ?? candidate.date,
  merchant: candidate.normalizedMerchant,
  amount: candidate.amount,
  direction: candidate.direction,
  category: candidate.categorySuggestion,
  note: "",
  status: candidate.status,
  createdManually: false,
  origin: "import",
  importBatchId: batch.id,
  importCandidateId: candidate.id,
  originalDescription: candidate.originalDescription,
  rawSourceRow: candidate.rawSourceRow,
  sourceTransactionId: candidate.sourceTransactionId,
  sourceFingerprint: candidate.fingerprint,
  occurrenceIndex: candidate.occurrenceIndex,
  confidence: candidate.confidence,
});

function applyCandidate(state: DragonState, batch: ImportBatch, candidate: ImportedCandidate) {
  const resolution = candidate.resolution;
  if (candidate.proposedAction === "skip-exact" || resolution === "ignore") {
    return { state, result: "skipped" as const };
  }
  if (resolution === "one-is-echo" && candidate.matchedTransactionId) {
    const matched = state.transactions.find((transaction) => transaction.id === candidate.matchedTransactionId);
    if (matched) {
      const imported = candidateToTransaction(candidate, batch);
      return {
        state: {
          ...state,
          transactions: state.transactions.map((transaction) => transaction.id === matched.id ? {
            ...transaction,
            importBatchId: batch.id,
            importCandidateId: candidate.id,
            originalDescription: imported.originalDescription,
            rawSourceRow: imported.rawSourceRow,
            sourceTransactionId: imported.sourceTransactionId,
            sourceFingerprint: imported.sourceFingerprint,
            occurrenceIndex: imported.occurrenceIndex,
            confidence: imported.confidence,
            matchLineage: [...(transaction.matchLineage ?? []), imported.id],
          } : transaction),
        },
        result: "matched" as const,
        transactionId: matched.id,
      };
    }
  }
  if (resolution === "one-is-echo") return { state, result: "skipped" as const };
  if (candidate.proposedAction === "hold" && (!resolution || resolution === "not-sure")) {
    return { state, result: "held" as const };
  }
  if ((resolution === "pending-posted" || candidate.proposedAction === "replace-pending") && candidate.matchedTransactionId) {
    const previous = state.transactions.find((transaction) => transaction.id === candidate.matchedTransactionId);
    if (previous) {
      const replacement = { ...candidateToTransaction(candidate, batch), id: previous.id, matchLineage: [...(previous.matchLineage ?? []), previous.sourceFingerprint ?? previous.id] };
      return { state: replaceTransaction(state, previous, replacement), result: "replaced" as const, transactionId: replacement.id };
    }
  }
  if (resolution === "confirm-transfer" && candidate.transferCandidateId) {
    const counterpart = state.transactions.find((transaction) => transaction.id === candidate.transferCandidateId);
    if (counterpart) {
      const pairId = uid("transfer-pair");
      const transaction = candidateToTransaction(candidate, batch);
      const created = createTransaction(state, transaction);
      return {
        state: {
          ...created,
          transactions: created.transactions.map((item) => item.id === counterpart.id
            ? { ...item, transfer: true, transferPairId: pairId, transferToAccountId: candidate.accountId }
            : item.id === transaction.id
              ? { ...item, transfer: true, transferPairId: pairId, transferToAccountId: counterpart.accountId }
              : item),
        },
        result: "added" as const,
        transactionId: transaction.id,
      };
    }
  }
  if (candidate.proposedAction === "match" && candidate.matchedTransactionId) return { state, result: "matched" as const, transactionId: candidate.matchedTransactionId };
  const transaction = candidateToTransaction(candidate, batch);
  return { state: createTransaction(state, transaction), result: "added" as const, transactionId: transaction.id };
}

export function commitImportBatch(state: DragonState, stagedBatch: ImportBatch, options: ImportCommitOptions = {}): DragonState {
  if (stagedBatch.status !== "staged") throw new Error("These rows are no longer waiting to be saved");
  if (!stagedBatch.mappingConfirmed) throw new Error(`Check how these rows were read first: ${stagedBatch.ambiguityWarnings.join("; ")}`);
  let working: DragonState = state;
  const results = { added: 0, matched: 0, replaced: 0, skipped: 0, held: 0 };
  const committedIds = new Map<string, string>();
  const before = {
    accounts: structuredClone(state.accounts),
    chambers: structuredClone(state.chambers),
    transactions: structuredClone(state.transactions),
    reconciliations: structuredClone(state.imports.reconciliations),
  };
  for (const candidate of stagedBatch.candidates) {
    const applied = applyCandidate(working, stagedBatch, candidate);
    working = applied.state;
    results[applied.result] += 1;
    if (applied.transactionId) committedIds.set(candidate.id, applied.transactionId);
  }

  let reconciliation: ReconciliationRecord | undefined;
  if (typeof options.closingBalance === "number") {
    const accountBefore = state.accounts.find((account) => account.id === stagedBatch.accountId)?.balance ?? 0;
    const accountAfter = working.accounts.find((account) => account.id === stagedBatch.accountId)?.balance ?? accountBefore;
    const difference = options.closingBalance - accountAfter;
    const tolerance = options.tolerance ?? 0.01;
    reconciliation = {
      id: uid("reconciliation"),
      accountId: stagedBatch.accountId,
      importBatchId: stagedBatch.id,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd ?? new Date().toISOString(),
      closingBalance: options.closingBalance,
      expectedClosingBalance: accountAfter,
      movementDelta: accountAfter - accountBefore,
      difference,
      tolerance,
      includedCandidateIds: stagedBatch.candidates.filter((candidate) => committedIds.has(candidate.id)).map((candidate) => candidate.id),
      excludedCandidateIds: stagedBatch.candidates.filter((candidate) => !committedIds.has(candidate.id)).map((candidate) => candidate.id),
      status: Math.abs(difference) <= tolerance ? "reconciled" : "unresolved",
      confirmedAt: Math.abs(difference) <= tolerance ? new Date().toISOString() : undefined,
      note: options.reconciliationNote,
    };
    working = {
      ...working,
      accounts: working.accounts.map((account) => account.id === stagedBatch.accountId ? {
        ...account,
        lastConfirmedBalance: Math.abs(difference) <= tolerance ? options.closingBalance : account.lastConfirmedBalance,
        lastConfirmedAt: Math.abs(difference) <= tolerance ? reconciliation?.confirmedAt : account.lastConfirmedAt,
        importedThrough: reconciliation?.periodEnd,
        reconciliationStatus: Math.abs(difference) <= tolerance ? "reconciled" : "needs-review",
        reconciliationDifference: difference,
        balanceSnapshots: Math.abs(difference) <= tolerance ? [...(account.balanceSnapshots ?? []), { id: uid("balance"), accountId: account.id, balance: options.closingBalance!, capturedAt: reconciliation!.periodEnd, source: "reconciliation" as const, importBatchId: stagedBatch.id, confirmed: true }].slice(-400) : account.balanceSnapshots,
      } : account),
    };
  }

  const committedBatch: ImportBatch = {
    ...stagedBatch,
    importedAt: new Date().toISOString(),
    status: "committed",
    counts: results,
    reconciliationId: reconciliation?.id,
    undoSnapshot: before,
    candidates: stagedBatch.candidates.map((candidate) => ({ ...candidate, committedTransactionId: committedIds.get(candidate.id) })),
    receiptNote: `${results.added} added · ${results.replaced} updated · ${results.skipped} already safe · ${results.held} held for later`,
  };
  return {
    ...working,
    imports: {
      ...working.imports,
      batches: [committedBatch, ...working.imports.batches.filter((batch) => batch.id !== committedBatch.id)].slice(0, 100),
      reconciliations: reconciliation ? [reconciliation, ...working.imports.reconciliations] : working.imports.reconciliations,
    },
  };
}

export function undoImportBatch(state: DragonState, batchId: string): DragonState {
  const batch = state.imports.batches.find((item) => item.id === batchId);
  if (!batch || batch.status !== "committed" || !batch.undoSnapshot) throw new Error("This import can no longer be undone");
  return {
    ...state,
    accounts: structuredClone(batch.undoSnapshot.accounts),
    chambers: structuredClone(batch.undoSnapshot.chambers),
    transactions: structuredClone(batch.undoSnapshot.transactions),
    imports: {
      ...state.imports,
      reconciliations: structuredClone(batch.undoSnapshot.reconciliations),
      batches: state.imports.batches.map((item) => item.id === batchId ? { ...item, status: "undone" as const, undoSnapshot: undefined, receiptNote: `${item.receiptNote ?? "Import"} · undone safely` } : item),
    },
  };
}

export function resolveCommittedCandidate(state: DragonState, batchId: string, candidateId: string, resolution: ImportResolution): DragonState {
  const batch = state.imports.batches.find((item) => item.id === batchId);
  const candidate = batch?.candidates.find((item) => item.id === candidateId);
  if (!batch || batch.status !== "committed" || !candidate || candidate.committedTransactionId) throw new Error("This candidate is not waiting for review");
  const resolved = { ...candidate, resolution, resolvedAt: new Date().toISOString() };
  const applied = applyCandidate(state, batch, resolved);
  const counts = { ...batch.counts };
  counts.held = Math.max(0, counts.held - 1);
  counts[applied.result] += 1;
  const nextBatch = {
    ...batch,
    counts,
    candidates: batch.candidates.map((item) => item.id === candidateId ? { ...resolved, committedTransactionId: applied.transactionId } : item),
    receiptNote: `${counts.added} added · ${counts.replaced} updated · ${counts.skipped} already safe · ${counts.held} held for later`,
  };
  return {
    ...applied.state,
    accounts: applied.state.accounts.map((account) => account.id === candidate.accountId && applied.result !== "held" ? { ...account, reconciliationStatus: "needs-review", reconciliationDifference: account.reconciliationDifference } : account),
    imports: { ...applied.state.imports, batches: applied.state.imports.batches.map((item) => item.id === batchId ? nextBatch : item) },
  };
}

export function unresolvedImportCandidates(state: DragonState) {
  const now = Date.now();
  return state.imports.batches.flatMap((batch) => batch.status === "committed" ? batch.candidates.filter((candidate) => candidate.proposedAction === "hold" && (
    !candidate.resolution
    || (candidate.resolution === "not-sure" && (!candidate.resolvedAt || now - new Date(candidate.resolvedAt).getTime() >= 3 * DAY_MS))
  )) : []);
}
