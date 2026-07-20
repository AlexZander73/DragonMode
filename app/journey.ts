import {
  JOURNEY_AVATARS,
  type Account,
  type DragonState,
  type FinancialSnapshot,
  type IdleReward,
  type IncomeCadence,
  type IncomeKind,
  type IncomeSource,
  type JourneyChapter,
  type JourneyDirection,
  type Quest,
} from "./data";

const DAY_MS = 86_400_000;
const MAX_IDLE_DAYS = 365;

export const journeyDayKey = (value: Date | string | number = new Date()) => new Date(value).toISOString().slice(0, 10);

export function journeyAssets(state: DragonState) {
  return state.accounts
    .filter((account) => account.includedInHoard && !account.archived && account.balance > 0)
    .reduce((sum, account) => sum + account.balance, 0);
}

export function journeyDebt(state: DragonState) {
  return state.debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
}

const recentFlow = (state: DragonState, now: Date, days = 30) => {
  const cutoff = now.getTime() - days * DAY_MS;
  return state.transactions
    .filter((item) => item.status === "cleared" && !item.transfer && new Date(item.date).getTime() >= cutoff)
    .reduce((result, item) => ({
      inflow: result.inflow + (item.direction === "income" ? item.amount : 0),
      outflow: result.outflow + (item.direction === "expense" ? item.amount : 0),
    }), { inflow: 0, outflow: 0 });
};

export function captureFinancialSnapshot(state: DragonState, now = new Date(), previous?: FinancialSnapshot): FinancialSnapshot {
  const assets = journeyAssets(state);
  const debt = journeyDebt(state);
  const netWorth = assets - debt;
  const flow = recentFlow(state, now);
  const change = previous ? netWorth - previous.netWorth : 0;
  const threshold = previous ? Math.max(25, Math.abs(previous.netWorth) * (state.journey.stabilityPercent / 100)) : Number.POSITIVE_INFINITY;
  const direction: JourneyDirection = change > threshold ? "rising" : change < -threshold ? "sheltered" : "steady";
  return {
    id: `snapshot-${journeyDayKey(now)}`,
    capturedAt: now.toISOString(),
    assets,
    debt,
    netWorth,
    inflow30: flow.inflow,
    outflow30: flow.outflow,
    direction,
    change,
  };
}

const inferIncomeKind = (label: string): IncomeKind => {
  const value = label.toLowerCase();
  if (/payroll|salary|payday|wage/.test(value)) return "salary";
  if (/commission|royalty/.test(value)) return "commission";
  if (/freelance|contract|invoice|bounty/.test(value)) return "contract";
  if (/interest/.test(value)) return "interest";
  if (/dividend|distribution/.test(value)) return "dividend";
  if (/business|sale|shop/.test(value)) return "business";
  if (/gift/.test(value)) return "gift";
  return "other";
};

const inferCadence = (dates: number[]): IncomeCadence => {
  if (dates.length < 2) return "irregular";
  const sorted = [...dates].sort((a, b) => b - a);
  const averageDays = sorted.slice(0, -1).reduce((sum, value, index) => sum + (value - sorted[index + 1]) / DAY_MS, 0) / (sorted.length - 1);
  if (averageDays <= 9) return "weekly";
  if (averageDays <= 20) return "fortnightly";
  if (averageDays <= 45) return "monthly";
  if (averageDays <= 120) return "quarterly";
  if (averageDays <= 400) return "annual";
  return "irregular";
};

export function syncIncomeSources(state: DragonState): IncomeSource[] {
  const byName = state.transactions.filter((item) => item.direction === "income" && item.status === "cleared").reduce<Record<string, { amounts: number[]; dates: number[]; latest: string }>>((result, item) => {
    const current = result[item.merchant] ?? { amounts: [], dates: [], latest: item.date };
    current.amounts.push(item.amount);
    current.dates.push(new Date(item.date).getTime());
    if (new Date(item.date).getTime() > new Date(current.latest).getTime()) current.latest = item.date;
    result[item.merchant] = current;
    return result;
  }, {});
  const retained = state.journey.incomeSources.map((item) => ({ ...item }));
  for (const [name, values] of Object.entries(byName)) {
    const existing = retained.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const expectedAmount = values.amounts.reduce((sum, value) => sum + value, 0) / values.amounts.length;
    if (existing) {
      existing.expectedAmount = Math.round(expectedAmount * 100) / 100;
      existing.lastSeenAt = values.latest;
    } else {
      const cadence = inferCadence(values.dates);
      retained.push({
        id: `income-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        name,
        kind: inferIncomeKind(name),
        cadence,
        expectedAmount: Math.round(expectedAmount * 100) / 100,
        reliability: cadence === "irregular" ? "variable" : "steady",
        lastSeenAt: values.latest,
      });
    }
  }
  return retained;
}

const compoundingPeriods = (account: Account) => account.compounding === "annual" ? 1 : account.compounding === "monthly" ? 12 : 365;

const transactionDeltaForAccount = (state: DragonState, accountId: string, fromExclusive: number, toInclusive: number) => state.transactions
  .filter((transaction) => transaction.status === "cleared" && new Date(transaction.date).getTime() > fromExclusive && new Date(transaction.date).getTime() <= toInclusive)
  .reduce((sum, transaction) => {
    let delta = 0;
    if (transaction.accountId === accountId) delta += transaction.direction === "income" ? transaction.amount : -transaction.amount;
    if (transaction.transfer && transaction.transferToAccountId === accountId) delta += transaction.direction === "income" ? -transaction.amount : transaction.amount;
    return sum + delta;
  }, 0);

export function accountBalanceAt(state: DragonState, account: Account, at: Date) {
  const target = at.getTime();
  const snapshots = [...(account.balanceSnapshots ?? [])]
    .filter((snapshot) => snapshot.confirmed && new Date(snapshot.capturedAt).getTime() <= target)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const snapshot = snapshots.at(-1);
  if (snapshot) return Math.max(0, snapshot.balance + transactionDeltaForAccount(state, account.id, new Date(snapshot.capturedAt).getTime(), target));
  const now = Date.now();
  if (target >= now) return Math.max(0, account.balance);
  return Math.max(0, account.balance - transactionDeltaForAccount(state, account.id, target, now));
}

const rateAt = (account: Account, timestamp: number) => {
  const period = [...(account.rateHistory ?? [])]
    .filter((item) => timestamp >= new Date(item.startsAt).getTime() && (!item.endsAt || timestamp < new Date(item.endsAt).getTime()))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
  const baseApy = period?.baseApy ?? account.apy ?? 0;
  const promotionStart = account.promotionStart ? new Date(account.promotionStart).getTime() : Number.POSITIVE_INFINITY;
  const promotionEnd = account.promotionEnd ? new Date(account.promotionEnd).getTime() : Number.NEGATIVE_INFINITY;
  const promotionActive = Boolean(account.promotionalApy && timestamp >= promotionStart && timestamp < promotionEnd);
  const promotionalApy = period?.promotionalApy ?? (promotionActive ? account.promotionalApy : undefined);
  const bonusStatus = period?.bonusStatus ?? account.bonusStatus ?? "unknown";
  const bonusApy = bonusStatus === "met" ? (period?.bonusApy ?? account.bonusApy ?? 0) : 0;
  return { baseApy, promotionalApy, bonusApy, bonusStatus };
};

const interestFor = (balance: number, annualRate: number, years: number, periods: number) => annualRate > 0 && balance > 0 && years > 0
  ? balance * (Math.pow(1 + annualRate / 100 / periods, periods * years) - 1)
  : 0;

const accountInterest = (state: DragonState, account: Account, from: Date, to: Date): IdleReward["sources"][number] | null => {
  if (!["savings", "cash", "transaction"].includes(account.type)) return null;
  const boundaries = [from.getTime(), to.getTime()];
  const addBoundary = (value?: string) => {
    if (!value) return;
    const time = new Date(value).getTime();
    if (time > from.getTime() && time < to.getTime()) boundaries.push(time);
  };
  addBoundary(account.promotionStart);
  addBoundary(account.promotionEnd);
  for (const period of account.rateHistory ?? []) { addBoundary(period.startsAt); addBoundary(period.endsAt); }
  for (const snapshot of account.balanceSnapshots ?? []) addBoundary(snapshot.capturedAt);
  for (const transaction of state.transactions.filter((item) => item.accountId === account.id || (item.transfer && item.transferToAccountId === account.id))) addBoundary(transaction.date);
  const ordered = [...new Set(boundaries)].sort((a, b) => a - b);
  const periods = compoundingPeriods(account);
  let accrued = 0;
  let baseAmount = 0;
  let promotionalAmount = 0;
  let bonusAmount = 0;
  let lastBalance = accountBalanceAt(state, account, from);
  let highestRate = 0;
  let observedBonusStatus: "met" | "not-met" | "unknown" = account.bonusStatus ?? "unknown";
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index];
    const end = ordered[index + 1];
    if (end <= start) continue;
    const realBalance = accountBalanceAt(state, account, new Date(start));
    const balance = Math.max(0, realBalance + accrued);
    lastBalance = realBalance;
    const midpoint = start + (end - start) / 2;
    const rate = rateAt(account, midpoint);
    observedBonusStatus = rate.bonusStatus;
    const promotionalUplift = Math.max(0, (rate.promotionalApy ?? rate.baseApy) - rate.baseApy);
    const years = (end - start) / DAY_MS / 365;
    const totalRate = rate.baseApy + promotionalUplift + rate.bonusApy;
    const totalForPeriod = interestFor(balance, totalRate, years, periods);
    const base = totalRate ? totalForPeriod * rate.baseApy / totalRate : 0;
    const promo = totalRate ? totalForPeriod * promotionalUplift / totalRate : 0;
    const bonus = totalRate ? totalForPeriod * rate.bonusApy / totalRate : 0;
    baseAmount += base;
    promotionalAmount += promo;
    bonusAmount += bonus;
    accrued += base + promo + bonus;
    highestRate = Math.max(highestRate, rate.baseApy + promotionalUplift + rate.bonusApy);
  }
  const amount = baseAmount + promotionalAmount + bonusAmount;
  if (amount < 0.005) return null;
  const postedAmount = state.transactions
    .filter((transaction) => transaction.accountId === account.id && transaction.status === "cleared" && transaction.direction === "income" && !transaction.transfer && /interest/i.test(`${transaction.merchant} ${transaction.originalDescription ?? ""}`) && new Date(transaction.date).getTime() >= from.getTime() && new Date(transaction.date).getTime() <= to.getTime())
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return {
    id: `interest-${account.id}`,
    label: account.name,
    kind: "interest",
    amount,
    baseAmount,
    promotionalAmount,
    bonusAmount,
    bonusStatus: observedBonusStatus,
    from: from.toISOString(),
    to: to.toISOString(),
    balanceUsed: lastBalance,
    annualRate: highestRate,
    postedAmount: postedAmount || undefined,
    differenceFromPosted: postedAmount ? postedAmount - amount : undefined,
    assumption: account.balanceSnapshots?.length ? "Uses confirmed snapshots and cleared movements between rate boundaries." : "Derived backward from the current balance and known cleared movements; confirm against a statement.",
  };
};

export function calculateIdleReward(state: DragonState, fromValue: string, to = new Date()): IdleReward | null {
  const requestedFrom = new Date(fromValue);
  if (!Number.isFinite(requestedFrom.getTime()) || to.getTime() <= requestedFrom.getTime()) return null;
  const from = new Date(Math.max(requestedFrom.getTime(), to.getTime() - MAX_IDLE_DAYS * DAY_MS));
  const sources: IdleReward["sources"] = [];
  for (const account of state.accounts) {
    const source = accountInterest(state, account, from, to);
    if (source) sources.push(source);
  }
  const elapsedYears = (to.getTime() - from.getTime()) / DAY_MS / 365;
  for (const position of state.investments) {
    const value = position.units * (position.marketPrice ?? position.unitPrice);
    const amount = value * ((position.dividendYield ?? 0) / 100) * elapsedYears;
    if (amount >= 0.005) sources.push({ id: `dividend-${position.id}`, label: position.name, kind: "dividend", amount, from: from.toISOString(), to: to.toISOString(), balanceUsed: value, annualRate: position.dividendYield ?? 0, assumption: "Illustration using the last confirmed/manual value and trailing yield; it is not accrued or spendable cash." });
  }
  const estimatedInterest = sources.filter((item) => item.kind === "interest").reduce((sum, item) => sum + item.amount, 0);
  const estimatedDividends = sources.filter((item) => item.kind === "dividend").reduce((sum, item) => sum + item.amount, 0);
  const total = estimatedInterest + estimatedDividends;
  if (total < 0.005) return null;
  return {
    id: `idle-${from.getTime()}-${to.getTime()}`,
    from: from.toISOString(),
    to: to.toISOString(),
    estimatedInterest,
    estimatedDividends,
    total,
    starShards: 0,
    keeperReward: 0,
    estimateLabel: "Editable illustration; never added to real balances",
    sources,
  };
}

const chapterCopy = (state: DragonState, snapshot: FinancialSnapshot): Omit<JourneyChapter, "id" | "dayKey" | "createdAt"> => {
  const variableIncome = state.journey.incomeSources.find((item) => item.reliability !== "steady");
  const variation = state.journey.currentNode % 3;
  if (snapshot.direction === "rising") return {
    direction: "rising",
    title: snapshot.debt < (state.journey.snapshots.at(-1)?.debt ?? snapshot.debt) ? ["The Chain Gives Way", "A Link Turns Silver", "The Gate Loses Weight"][variation] : ["The Sunroad Opens", "Lanterns Above Greenwater", "The Orchard Wakes"][variation],
    speaker: ["Asha Emberwright", "Sol Arden", "Kael Windmere"][variation],
    opening: ["The road climbs because several real things moved together: assets held, obligations eased, or income arrived. We celebrate the direction without demanding that every day look like this one.", "A brighter constellation settles over the map. Sol names the gain, then reminds the party that ordinary days belong here too.", "A tailwind arrives. Kael measures it carefully: useful movement, never a promise that every crossing will be easy."][variation],
    ending: ["Asha marks the gain on the atlas, then leaves space for ordinary days. Progress is allowed to breathe.", "The new light becomes a waypoint rather than a demand. It will still be here after a quieter week.", "Kael folds the map with a smile. The tailwind was used with care, and that is enough."][variation],
    choices: ["Protect part of this gain", "Aim it at the next debt marker", "Celebrate before choosing"],
    actionTitle: snapshot.debt > 0 ? "Choose the next chain marker" : "Give part of the gain a job",
    actionDescription: snapshot.debt > 0 ? "Review one debt and decide whether its next planned payment still fits." : "Choose one small amount to protect, invest, or enjoy intentionally.",
    actionCategory: "Grow",
  };
  if (snapshot.direction === "sheltered") return {
    direction: "sheltered",
    title: ["The Bridge After Rain", "Shelter at Hollow Pine", "The Lantern in the Pass"][variation],
    speaker: ["Mara Ironroot", "Bramble Stoneheart", "Moss"][variation],
    opening: ["The road changed beneath us. That is information, not failure. Mara lights the nearest stones and asks only what would make the next seven days safer.", "Rain closes the high trail, so Bramble opens the archive shelter. A changed route is not a lost journey; it is a reason to travel more gently.", "The pass narrows and Moss settles beside the last warm lantern. The dragon does not ask for a perfect plan—only one kind next step."][variation],
    ending: ["The bridge does not need to be rebuilt tonight. One sound plank is enough to keep the path open.", "The storm writes no verdict. The party leaves with dry maps, a smaller pack, and every earlier victory intact.", "Moss keeps watch while the keeper rests. Hope is not postponed; it is part of the shelter."][variation],
    choices: ["Protect the next seven days", "Review one pressure point", "Rest before I decide"],
    actionTitle: "Make the next seven days gentler",
    actionDescription: "Review one upcoming bill, minimum payment, or flexible cost. Changing it is optional; seeing it clearly is the quest.",
    actionCategory: "Guard",
  };
  return {
    direction: "steady",
    title: variableIncome ? ["Caravans at Stillwater", "The Market Between Bells", "A Contract at Moonrise"][variation] : ["Camp at Stillwater", "The Quiet Watchtower", "Tea at the Mile Stone"][variation],
    speaker: variableIncome ? ["Pip Reedwhistle", "Asha Emberwright", "Sol Arden"][variation] : ["Bramble Stoneheart", "Kael Windmere", "Mara Ironroot"][variation],
    opening: variableIncome ? [`${variableIncome.name} follows a less regular road. Pip records the quiet stretch as part of the rhythm—not as missing progress.`, `The market is quiet between arrivals. Asha checks the tools and gives variable work room to be variable.`, `Sol marks ${variableIncome.name} as a constellation that appears on its own rhythm, visible even when it is not due today.`][variation] : ["The hoard held its ground. Bramble calls this a worthy chapter: a pause where plans can be checked without urgency.", "No warning bell rings from the tower. Kael uses the quiet to check one compass bearing, then lets the day remain ordinary.", "Mara pours tea beside the mile stone. A steady chapter is not empty; it is the ground that keeps future choices open."][variation],
    ending: ["The lantern remains lit. Staying steady protected choices that tomorrow can use.", "One assumption is checked, the rest are allowed to wait. The watch remains calm.", "The party leaves the mile stone exactly where it was, carrying more clarity than before."][variation],
    choices: ["Mark the next expected income", "Check the protected buffer", "Let steady be enough today"],
    actionTitle: variableIncome ? "Mark the next likely arrival" : "Check one steady assumption",
    actionDescription: variableIncome ? "Review an irregular income source and record its best current expectation without treating it as guaranteed." : "Confirm that one recurring cost or buffer target still matches real life.",
    actionCategory: "Tend",
  };
};

type AuthoredChapter = Omit<JourneyChapter, "id" | "dayKey" | "createdAt" | "direction"> & { contentId: string };

export const EVERGREEN_ACT_ONE: AuthoredChapter[] = [
  { contentId: "act1-sleeping-door", chapterNumber: 1, narrativeLayer: "evergreen", replayable: true, title: "The Sleeping Door", speaker: "Moss", opening: "A door of green glass waits beneath the lair. It does not ask how large the hoard is. It asks what kind of keeper will carry the light.", ending: "The door remembers the answer as a tone, not a rule. Every useful tool remains open whichever path you named.", choices: ["Lead with gentleness", "Lead with curiosity", "Lead with quiet courage"], actionTitle: "Choose how the Atlas should speak", actionDescription: "Review your plain-language and story settings. Nothing financial changes.", actionCategory: "Tend" },
  { contentId: "act1-count-treasure", chapterNumber: 2, narrativeLayer: "evergreen", replayable: true, title: "Count the Treasure", speaker: "Bramble Stoneheart", opening: "Bramble opens the first ledger and leaves room for both confirmed figures and honest approximations. A map may begin before every road is known.", ending: "One account is enough to wake the chamber. The original source remains beside every imported mark.", choices: ["Map one confirmed account", "Begin with an approximation", "Paste what the bank already shows"], actionTitle: "Map or import one account", actionDescription: "Add one useful balance or use the Trusted Ledger preview.", actionCategory: "Tend" },
  { contentId: "act1-echoes-ledger", chapterNumber: 3, narrativeLayer: "evergreen", replayable: true, title: "Echoes in the Ledger", speaker: "Bramble Stoneheart", opening: "Two marks ring with the same date, merchant, and amount. Bramble refuses to erase either: similarity is a question, never proof.", ending: "The archive now knows three honest answers: both happened, one is an echo, or not sure yet.", choices: ["Both may be true", "Follow the source evidence", "Leave uncertainty visible"], actionTitle: "Review one possible echo", actionDescription: "Use the side-by-side evidence and keep human truth in control.", actionCategory: "Guard" },
  { contentId: "act1-procession-claimants", chapterNumber: 4, narrativeLayer: "evergreen", replayable: true, title: "Procession of Claimants", speaker: "Asha Emberwright", opening: "The recurring claimants arrive without accusation. Each carries a cadence, a next date, and a question about whether it still belongs in the hall.", ending: "The hall is clearer. Keeping, changing, and deciding later are all valid endings.", choices: ["Name the repeating costs", "Review one changed price", "Let the quiet claimants wait"], actionTitle: "Review one recurring cost", actionDescription: "Confirm a cadence, next charge, or price change without pressure to cancel.", actionCategory: "Guard" },
  { contentId: "act1-scrying-pool", chapterNumber: 5, narrativeLayer: "evergreen", replayable: true, title: "Wake the Scrying Pool", speaker: "Kael Windmere", opening: "Kael wakes the pool with mapped movements. The reflection shows ranges and assumptions—not a single future pretending to be certain.", ending: "The pool becomes a tool instead of an oracle. Every assumption can be changed.", choices: ["Show the cautious range", "Follow the current path", "Inspect the assumptions first"], actionTitle: "Open one editable illustration", actionDescription: "Visit the Lore Library and inspect where each number came from.", actionCategory: "Learn" },
  { contentId: "act1-chain-deep", chapterNumber: 6, narrativeLayer: "evergreen", replayable: true, title: "The Chain in the Deep", speaker: "Mara Ironroot", opening: "Mara lays the chains side by side: smallest first, highest rate first, minimums, or a custom order. None is declared the moral path.", ending: "The comparison remains an illustration. The keeper keeps the choice—and the right to make no change today.", choices: ["Compare the methods", "Protect the next payment", "Pause without losing progress"], actionTitle: "Compare two debt paths", actionDescription: "Inspect payoff time and interest assumptions without selecting a strategy automatically.", actionCategory: "Learn" },
  { contentId: "act1-sleeping-wish", chapterNumber: 7, narrativeLayer: "evergreen", replayable: true, title: "The Sleeping Wish", speaker: "Asha Emberwright", opening: "A wish rests beneath a soft cloth. The pause is not a test of virtue; it is simply room for desire, cost, timing, and real life to speak together.", ending: "Claimed, saved, released, or extended—the wish becomes information rather than judgement.", choices: ["Keep the wish resting", "See its impact with my numbers", "Let the wish change shape"], actionTitle: "Reflect on one resting Wish", actionDescription: "Use the editable impact illustration; any outcome remains valid.", actionCategory: "Tend" },
  { contentId: "act1-star-vault", chapterNumber: 8, narrativeLayer: "evergreen", replayable: true, title: "The Star Vault", speaker: "Sol Arden", opening: "Sol separates three lights: base interest, promotional uplift, and a bonus whose conditions are not yet known. None is poured into the real balance before it posts.", ending: "The estimate is useful because its limits are visible. A future statement may confirm or correct it.", choices: ["Inspect the rate periods", "Mark the promotion ending", "Leave unknown bonuses unknown"], actionTitle: "Review one account rate", actionDescription: "Confirm base, promotion end, bonus status, or maturity details.", actionCategory: "Learn" },
  { contentId: "act1-storm-map", chapterNumber: 9, narrativeLayer: "evergreen", replayable: true, title: "The Storm Map", speaker: "Mara Ironroot", opening: "Rain crosses the map and one balance refuses to reconcile. Mara draws the difference in clear ink. No hidden adjustment is allowed to make the storm look prettier.", ending: "The difference remains visible, bounded, and reversible. Earlier victories stay exactly where they were.", choices: ["Review the difference", "Hold uncertain rows for later", "Ask for one gentler next step"], actionTitle: "Check reconciliation coverage", actionDescription: "Review the latest receipt or confirm a balance. Do not force a guess.", actionCategory: "Guard" },
  { contentId: "act1-keeper-constellation", chapterNumber: 10, narrativeLayer: "evergreen", replayable: true, title: "The Keeper’s Constellation", speaker: "Moss", opening: "The first ten pages rise into a constellation shaped by returns, questions, and honest records—not by the size of the treasure beneath them.", ending: "A Relic Constellation opens. Surprise is optional, crafting is always possible, and every season will return.", choices: ["Open a surprise relic", "Target a collection", "Craft the next known light"], actionTitle: "Choose a cosmetic path", actionDescription: "Visit Relic Constellations. No reward affects financial outcomes.", actionCategory: "Grow" },
];

function personalChronicleCopy(state: DragonState, now: Date): AuthoredChapter | null {
  const seen = new Set(state.journey.chapters.map((chapter) => chapter.contentId));
  const committed = state.imports.batches.find((batch) => batch.status === "committed");
  if (committed && !seen.has("chronicle-first-import")) return { contentId: "chronicle-first-import", narrativeLayer: "chronicle", replayable: true, triggerId: committed.id, factsUsed: [committed.id, committed.accountId], title: "Ink That Remembers", speaker: "Bramble Stoneheart", opening: `Bramble seals ${committed.sourceDisplayName} into the archive. Every accepted, skipped, and held row keeps its source trail.`, ending: "The receipt remains reversible, and the archive remembers what changed without exposing it beyond this device.", choices: ["Read the receipt", "Inspect one original row", "Carry the batch onward"], actionTitle: "Review the import receipt", actionDescription: "Confirm what was added, skipped, updated, or held.", actionCategory: "Guard" };
  const reconciled = state.imports.reconciliations.find((item) => item.status === "reconciled");
  if (reconciled && !seen.has("chronicle-first-reconciliation")) return { contentId: "chronicle-first-reconciliation", narrativeLayer: "chronicle", replayable: true, triggerId: reconciled.id, factsUsed: [reconciled.id, reconciled.accountId], title: "The Balanced Bell", speaker: "Bramble Stoneheart", opening: "For the first time, the ledger and a confirmed balance ring the same note. Bramble celebrates the evidence, not the amount.", ending: "The bell becomes a permanent memory of a ledger that could explain itself.", choices: ["Archive the receipt", "Thank the careful evidence", "Let the bell ring once"], actionTitle: "Keep the confirmed date", actionDescription: "No action is required; the reconciliation remains in history.", actionCategory: "Tend" };
  const pairedCharges = state.imports.batches.flatMap((batch) => batch.candidates).find((candidate) => candidate.resolution === "both-happened" && candidate.duplicateClusterId);
  if (pairedCharges && !seen.has("chronicle-legitimate-pair")) return { contentId: "chronicle-legitimate-pair", narrativeLayer: "chronicle", replayable: true, triggerId: pairedCharges.id, factsUsed: [pairedCharges.id, pairedCharges.duplicateClusterId!], title: "Two Tickets at Moonfair", speaker: "Bramble Stoneheart", opening: "Two identical marks enter the archive together. The keeper confirms that both happened, and Bramble keeps both without turning similarity into erasure.", ending: "The archive remembers that human truth can look exactly alike twice.", choices: ["Keep both source trails", "Remember the distinction", "Let the pair stand"], actionTitle: "Review the confirmed pair", actionDescription: "Both movements remain independent and traceable.", actionCategory: "Guard" };
  const posted = state.imports.batches.flatMap((batch) => batch.candidates).find((candidate) => candidate.resolution === "pending-posted");
  if (posted && !seen.has("chronicle-pending-posted")) return { contentId: "chronicle-pending-posted", narrativeLayer: "chronicle", replayable: true, triggerId: posted.id, factsUsed: [posted.id, posted.matchedTransactionId ?? "pending"], title: "The Vanishing Hold", speaker: "Bramble Stoneheart", opening: "A temporary hold settles into its posted form. The lineage is kept, but the balance carries only one movement.", ending: "What changed is visible; what was temporary is not counted twice.", choices: ["Follow the lineage", "Keep the posted truth", "Close the hold gently"], actionTitle: "Inspect the replacement trail", actionDescription: "The original pending identity remains in provenance.", actionCategory: "Guard" };
  const verifiedInterest = state.transactions.find((transaction) => transaction.direction === "income" && transaction.status === "cleared" && /interest/i.test(transaction.merchant));
  if (verifiedInterest && !seen.has("chronicle-posted-interest")) return { contentId: "chronicle-posted-interest", narrativeLayer: "chronicle", replayable: true, triggerId: verifiedInterest.id, factsUsed: [verifiedInterest.id, verifiedInterest.accountId], title: "A Star Becomes Ink", speaker: "Sol Arden", opening: "An interest movement has posted as a real record. Sol places it beside the earlier illustration without claiming that the estimate caused or predicted it.", ending: "Estimated light and posted ink remain separate, ready to compare.", choices: ["Compare the two", "Keep the posted record", "Review the rate period"], actionTitle: "Compare posted and estimated interest", actionDescription: "Inspect the account rate and the real transaction without changing either.", actionCategory: "Learn" };
  const irregularArrival = state.journey.incomeSources.find((source) => source.reliability !== "steady" && source.lastSeenAt);
  if (irregularArrival && !seen.has("chronicle-irregular-income")) return { contentId: "chronicle-irregular-income", narrativeLayer: "chronicle", replayable: true, triggerId: irregularArrival.id, factsUsed: [irregularArrival.id, irregularArrival.lastSeenAt!], title: "The Caravan Arrives", speaker: "Pip Reedwhistle", opening: "An irregular income route appears again. Pip records the arrival without turning its timing into a promise about the next one.", ending: "The route stays visible, variable, and welcome in the plan.", choices: ["Update the best current expectation", "Keep the route irregular", "Celebrate the arrival"], actionTitle: "Review the income route", actionDescription: "Adjust its cadence or expectation only if useful.", actionCategory: "Tend" };
  const completedGoal = state.goals.find((goal) => goal.status === "completed");
  if (completedGoal && !seen.has(`chronicle-goal-${completedGoal.id}`)) return { contentId: `chronicle-goal-${completedGoal.id}`, narrativeLayer: "chronicle", replayable: true, triggerId: completedGoal.id, factsUsed: [completedGoal.id], title: "A Light Reaches Its Mark", speaker: "Asha Emberwright", opening: "A chosen milestone is now marked complete. Asha celebrates the keeper’s stated and linked progress without moving any money herself.", ending: "The milestone becomes a permanent page, even if the next goal changes shape.", choices: ["Name what helped", "Keep the page quietly", "Choose no next goal yet"], actionTitle: "Review the completed goal", actionDescription: "Declared and linked progress remain distinguishable.", actionCategory: "Grow" };
  const decidedWish = state.wishes.find((wish) => wish.status !== "resting");
  if (decidedWish && !seen.has(`chronicle-wish-${decidedWish.id}`)) return { contentId: `chronicle-wish-${decidedWish.id}`, narrativeLayer: "chronicle", replayable: true, triggerId: decidedWish.id, factsUsed: [decidedWish.id, decidedWish.status], title: "The Wish Chooses a Shape", speaker: "Asha Emberwright", opening: `A resting wish was ${decidedWish.status}. Asha records the choice without ranking it: each ending can be thoughtful.`, ending: "The pause did its work by making room for a decision, not by demanding one answer.", choices: ["Remember the reason", "Let the choice rest", "Return to the wider map"], actionTitle: "Keep or edit the reflection", actionDescription: "The outcome remains yours and can inform future choices without judgement.", actionCategory: "Tend" };
  const returnedAfter = (now.getTime() - new Date(state.journey.lastOpenedAt).getTime()) / DAY_MS;
  const returnTier = returnedAfter >= 90 ? "90" : returnedAfter >= 30 ? "30" : returnedAfter >= 7 ? "7" : "";
  if (returnTier && !seen.has(`chronicle-warm-return-${returnTier}`)) return { contentId: `chronicle-warm-return-${returnTier}`, narrativeLayer: "chronicle", replayable: true, triggerId: `return-${Math.floor(returnedAfter)}`, factsUsed: [state.journey.lastOpenedAt], title: "The Lantern Was Kept", speaker: "Moss", opening: "The lair did not count the days as failures. Moss kept one lantern warm and the map waited without taking anything away.", ending: "The return becomes a page of its own: evidence that a paused path can continue gently.", choices: ["See what changed", "Take one small check", "Simply return"], actionTitle: "Complete one calm Hoard Check", actionDescription: "One useful glance is enough. No catch-up streak is required.", actionCategory: "Tend" };
  return null;
}

export function createJourneyChapter(state: DragonState, snapshot: FinancialSnapshot, now = new Date()): JourneyChapter {
  const dayKey = journeyDayKey(now);
  const chronicle = personalChronicleCopy(state, now);
  const completedEvergreen = new Set(state.journey.chapters.filter((chapter) => chapter.narrativeLayer === "evergreen").map((chapter) => chapter.contentId));
  const evergreen = EVERGREEN_ACT_ONE.find((chapter) => !completedEvergreen.has(chapter.contentId));
  const copy = chronicle ?? evergreen ?? chapterCopy(state, snapshot);
  const carriedChoice = latestJourneyChapter(state)?.selectedChoice;
  return { id: `journey-${dayKey}-${copy.contentId ?? "road"}`, dayKey, createdAt: now.toISOString(), direction: snapshot.direction, contentVersion: 1, locale: state.profile.locale, fallbackCopy: "A calm summary is available. No financial task depends on reading this scene.", accessibilitySummary: `${copy.title}. Optional story about ${copy.actionTitle.toLowerCase()}.`, reviewedAt: "2026-07-21", narrativeLayer: copy.narrativeLayer ?? "fallback", ...copy, opening: carriedChoice ? `${copy.opening} The party remembers your earlier choice: “${carriedChoice}.”` : copy.opening };
}

function journeyChapterDue(state: DragonState, now: Date) {
  if (!state.journey.enabled) return false;
  const latest = latestJourneyChapter(state);
  if (!latest) return true;
  if (latest.dayKey === journeyDayKey(now)) return false;
  const elapsed = now.getTime() - new Date(latest.createdAt).getTime();
  if (state.journey.cadence === "daily") return elapsed >= DAY_MS;
  if (state.journey.cadence === "weekly") return elapsed >= 7 * DAY_MS;
  const newIncome = state.transactions.some((item) => item.direction === "income" && item.status === "cleared" && new Date(item.date).getTime() > new Date(latest.createdAt).getTime());
  return newIncome || elapsed >= 14 * DAY_MS;
}

export function processJourneySession(state: DragonState, now = new Date()): DragonState {
  const incomeSources = syncIncomeSources(state);
  const journeyWithIncome = { ...state, journey: { ...state.journey, incomeSources } };
  const existingSnapshot = state.journey.snapshots.find((item) => journeyDayKey(item.capturedAt) === journeyDayKey(now));
  const targetTime = now.getTime() - state.journey.comparisonDays * DAY_MS;
  const priorSnapshots = [...state.journey.snapshots]
    .filter((item) => journeyDayKey(item.capturedAt) !== journeyDayKey(now))
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const previousSnapshot = priorSnapshots.filter((item) => new Date(item.capturedAt).getTime() <= targetTime).at(-1) ?? priorSnapshots.at(-1);
  const snapshot = captureFinancialSnapshot(journeyWithIncome, now, previousSnapshot);
  const snapshots = existingSnapshot ? state.journey.snapshots.map((item) => item.id === existingSnapshot.id ? { ...snapshot, id: existingSnapshot.id, direction: existingSnapshot.direction, change: existingSnapshot.change } : item) : [...state.journey.snapshots, snapshot].slice(-90);
  const chapter = journeyChapterDue(journeyWithIncome, now) ? createJourneyChapter({ ...journeyWithIncome, journey: { ...journeyWithIncome.journey, snapshots } }, existingSnapshot ? { ...snapshot, direction: existingSnapshot.direction, change: existingSnapshot.change } : snapshot, now) : null;
  const idleReward = calculateIdleReward(journeyWithIncome, state.journey.lastOpenedAt, now);
  return {
    ...state,
    journey: {
      ...state.journey,
      incomeSources,
      lastOpenedAt: now.toISOString(),
      lastSnapshotAt: now.toISOString(),
      currentNode: chapter ? (state.journey.currentNode + 1) % EVERGREEN_ACT_ONE.length : state.journey.currentNode,
      snapshots,
      chapters: chapter ? [...state.journey.chapters, chapter].slice(-60) : state.journey.chapters,
      idleRewards: idleReward ? [idleReward, ...state.journey.idleRewards].slice(0, 50) : state.journey.idleRewards,
    },
  };
}

export function latestJourneyChapter(state: DragonState) {
  return [...state.journey.chapters].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function journeyQuest(state: DragonState): Quest | null {
  const chapter = latestJourneyChapter(state);
  if (!chapter || chapter.goalCompletedAt) return null;
  return {
    id: `q-${chapter.id}`,
    title: chapter.actionTitle,
    description: chapter.actionDescription,
    reason: `Suggested by today’s ${chapter.direction} Journey chapter. It is optional and may be dismissed or snoozed.`,
    category: chapter.actionCategory,
    difficulty: "Small",
    estimatedMinutes: 3,
    xp: 14,
    completed: false,
    generatedAt: chapter.createdAt,
    relatedEntityId: chapter.id,
    icon: "map",
  };
}

export function selectedJourneyAvatar(state: DragonState) {
  return JOURNEY_AVATARS.find((item) => item.id === state.journey.selectedAvatarId) ?? JOURNEY_AVATARS[0];
}

export function shouldRefreshMarketData(lastQuoteAt: string | undefined, hours: number, now = new Date()) {
  if (!lastQuoteAt) return true;
  return now.getTime() - new Date(lastQuoteAt).getTime() >= Math.max(1, hours) * 3_600_000;
}
