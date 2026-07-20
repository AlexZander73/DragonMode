import { addProgressionXp } from "./calculations";
import type { CheckInRecord, DragonState, ImportedCandidate } from "./data";
import { unresolvedImportCandidates } from "./imports";

const DAY_MS = 86_400_000;

export type HoardCheckReview =
  | { kind: "import"; title: string; body: string; batchId: string; candidate: ImportedCandidate }
  | { kind: "transaction"; title: string; body: string; transactionId: string }
  | { kind: "reconciliation"; title: string; body: string; accountId: string }
  | { kind: "price-change"; title: string; body: string; subscriptionId: string };

export type HoardCheckSummary = {
  kind: CheckInRecord["kind"];
  mappedThrough?: string;
  ledgerStatus: "mapped" | "approximate" | "needs-review" | "empty";
  primaryReview?: HoardCheckReview;
  unresolvedCount: number;
  upcomingCount: number;
  upcomingLabel: string;
  message: string;
  alreadyCompleted: boolean;
};

const sameUtcDay = (left?: string, right = new Date()) => Boolean(left && left.slice(0, 10) === right.toISOString().slice(0, 10));

function elapsedDays(value: string | undefined, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - new Date(value).getTime()) / DAY_MS);
}

function checkKind(state: DragonState, now: Date): CheckInRecord["kind"] {
  if (!state.checkIns.history.length) return "daily";
  const firstRecorded = state.checkIns.history.at(-1)?.completedAt;
  if (elapsedDays(state.checkIns.lastMonthlyAt ?? firstRecorded, now) >= 28) return "monthly";
  if (elapsedDays(state.checkIns.lastWeeklyAt ?? state.checkIns.lastDailyAt, now) >= 7) return "weekly";
  const payCheckpoint = state.checkIns.lastPayCycleAt ?? state.checkIns.lastWeeklyAt ?? state.journey.lastOpenedAt;
  const newIncome = state.transactions.some((transaction) => transaction.direction === "income" && transaction.status === "cleared" && new Date(transaction.date).getTime() > new Date(payCheckpoint).getTime());
  if (newIncome && elapsedDays(state.checkIns.lastPayCycleAt, now) >= 5) return "pay-cycle";
  return "daily";
}

export function mappedThroughDate(state: DragonState) {
  const dates = [
    ...state.accounts.map((account) => account.importedThrough).filter((value): value is string => Boolean(value)),
    ...state.transactions.map((transaction) => transaction.postedDate ?? transaction.date),
  ].map((value) => new Date(value)).filter((date) => Number.isFinite(date.getTime()));
  return dates.sort((a, b) => b.getTime() - a.getTime())[0]?.toISOString();
}

export function getHoardCheck(state: DragonState, now = new Date()): HoardCheckSummary {
  const kind = checkKind(state, now);
  const unresolved = unresolvedImportCandidates(state);
  const unusual = state.transactions.find((transaction) => (transaction.unusual || transaction.duplicate) && !transaction.reviewedAt);
  const reconciliation = state.accounts.find((account) => account.reconciliationStatus === "needs-review");
  const priceChange = state.subscriptions.find((subscription) => Boolean(subscription.priceChange));
  let primaryReview: HoardCheckReview | undefined;
  const importCandidate = unresolved[0];
  if (importCandidate) {
    const batch = state.imports.batches.find((item) => item.id === importCandidate.batchId);
    primaryReview = { kind: "import", title: "One echo needs your truth", body: importCandidate.duplicateReasons.join(" "), batchId: batch?.id ?? importCandidate.batchId, candidate: importCandidate };
  } else if (reconciliation) {
    primaryReview = { kind: "reconciliation", title: `${reconciliation.name} needs a balance check`, body: `The current difference is ${Math.abs(reconciliation.reconciliationDifference ?? 0).toFixed(2)}. It is still visible and has not been silently adjusted.`, accountId: reconciliation.id };
  } else if (unusual) {
    primaryReview = { kind: "transaction", title: "One movement deserves a glance", body: `${unusual.merchant} is marked as ${unusual.duplicate ? "a possible echo" : "unusual"}.`, transactionId: unusual.id };
  } else if (priceChange) {
    primaryReview = { kind: "price-change", title: "A recurring cost changed", body: `${priceChange.name} changed by ${Math.abs(priceChange.priceChange ?? 0).toFixed(2)}. No action is assumed.`, subscriptionId: priceChange.id };
  }
  const cutoff = now.getTime() + 14 * DAY_MS;
  const upcoming = [
    ...state.subscriptions.map((item) => ({ date: item.nextCharge, label: item.name })),
    ...state.debts.map((item) => ({ date: item.nextDue, label: item.name })),
  ].filter((item) => {
    const time = new Date(item.date).getTime();
    return time >= now.getTime() && time <= cutoff;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const mappedThrough = mappedThroughDate(state);
  const ledgerStatus = !state.accounts.length ? "empty" : primaryReview?.kind === "reconciliation" || unresolved.length ? "needs-review" : state.accounts.some((account) => account.reconciliationStatus !== "reconciled") ? "approximate" : "mapped";
  const lastForKind = kind === "monthly" ? state.checkIns.lastMonthlyAt : kind === "weekly" ? state.checkIns.lastWeeklyAt : kind === "pay-cycle" ? state.checkIns.lastPayCycleAt : state.checkIns.lastDailyAt;
  return {
    kind,
    mappedThrough,
    ledgerStatus,
    primaryReview,
    unresolvedCount: unresolved.length + state.accounts.filter((account) => account.reconciliationStatus === "needs-review").length,
    upcomingCount: upcoming.length,
    upcomingLabel: upcoming[0] ? `${upcoming[0].label} is next` : "No mapped bills are due in the next 14 days",
    message: primaryReview ? "One useful thing is ready. Everything else can wait." : mappedThrough ? `The hoard is mapped through ${new Date(mappedThrough).toLocaleDateString(state.profile.locale)}. Nothing else needs you.` : "The map is quiet. Add or import only what feels useful.",
    alreadyCompleted: kind === "daily" ? sameUtcDay(state.checkIns.lastDailyAt, now) : sameUtcDay(lastForKind, now),
  };
}

export function completeHoardCheck(state: DragonState, summary: HoardCheckSummary, reviewedCandidateIds: string[] = [], now = new Date()): DragonState {
  if (summary.alreadyCompleted) return state;
  const day = now.toISOString().slice(0, 10);
  const cadenceKey = summary.kind === "weekly" ? `${now.getUTCFullYear()}-w${Math.ceil((Number(day.slice(5, 7)) * 31 + Number(day.slice(8, 10))) / 7)}` : summary.kind === "monthly" ? day.slice(0, 7) : summary.kind === "pay-cycle" ? `pay-${day}` : day;
  const eventId = `hoard-check-${summary.kind}-${cadenceKey}`;
  if (state.progression.rewardEventIds.includes(eventId)) return state;
  const loreKey = summary.kind === "weekly" || summary.kind === "monthly" ? 1 : 0;
  const record: CheckInRecord = { id: eventId, kind: summary.kind, completedAt: now.toISOString(), mappedThrough: summary.mappedThrough, reviewedCandidateIds, rewardEventIds: [eventId] };
  const progressed = addProgressionXp(state, summary.kind === "daily" ? 3 : summary.kind === "weekly" ? 8 : 6, eventId);
  return {
    ...state,
    checkIns: {
      ...state.checkIns,
      history: [record, ...state.checkIns.history].slice(0, 400),
      returnEmbers: state.checkIns.returnEmbers + 1,
      loreKeys: state.checkIns.loreKeys + loreKey,
      lastDailyAt: now.toISOString(),
      lastWeeklyAt: summary.kind === "weekly" || summary.kind === "monthly" ? now.toISOString() : state.checkIns.lastWeeklyAt,
      lastPayCycleAt: summary.kind === "pay-cycle" || summary.kind === "monthly" ? now.toISOString() : state.checkIns.lastPayCycleAt,
      lastMonthlyAt: summary.kind === "monthly" ? now.toISOString() : state.checkIns.lastMonthlyAt,
    },
    progression: progressed,
  };
}
