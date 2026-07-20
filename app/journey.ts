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

const accountInterest = (account: Account, from: Date, to: Date) => {
  if (!account.apy || account.balance <= 0 || !["savings", "cash", "transaction"].includes(account.type)) return 0;
  const boundaries = [from.getTime(), to.getTime()];
  if (account.promotionStart) boundaries.push(Math.max(from.getTime(), Math.min(to.getTime(), new Date(account.promotionStart).getTime())));
  if (account.promotionEnd) boundaries.push(Math.max(from.getTime(), Math.min(to.getTime(), new Date(account.promotionEnd).getTime())));
  const ordered = [...new Set(boundaries)].sort((a, b) => a - b);
  let workingBalance = account.balance;
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = ordered[index];
    const end = ordered[index + 1];
    if (end <= start) continue;
    const midpoint = start + (end - start) / 2;
    const promotional = Boolean(account.promotionalApy && account.promotionStart && account.promotionEnd && midpoint >= new Date(account.promotionStart).getTime() && midpoint <= new Date(account.promotionEnd).getTime());
    const annualRate = (promotional ? account.promotionalApy : account.apy) ?? 0;
    const periods = compoundingPeriods(account);
    const years = (end - start) / DAY_MS / 365;
    workingBalance *= Math.pow(1 + annualRate / 100 / periods, periods * years);
  }
  return Math.max(0, workingBalance - account.balance);
};

export function calculateIdleReward(state: DragonState, fromValue: string, to = new Date()): IdleReward | null {
  const requestedFrom = new Date(fromValue);
  if (!Number.isFinite(requestedFrom.getTime()) || to.getTime() <= requestedFrom.getTime()) return null;
  const from = new Date(Math.max(requestedFrom.getTime(), to.getTime() - MAX_IDLE_DAYS * DAY_MS));
  const sources: IdleReward["sources"] = [];
  for (const account of state.accounts) {
    const amount = accountInterest(account, from, to);
    if (amount >= 0.005) sources.push({ id: `interest-${account.id}`, label: account.name, kind: "interest", amount });
  }
  const elapsedYears = (to.getTime() - from.getTime()) / DAY_MS / 365;
  for (const position of state.investments) {
    const value = position.units * (position.marketPrice ?? position.unitPrice);
    const amount = value * ((position.dividendYield ?? 0) / 100) * elapsedYears;
    if (amount >= 0.005) sources.push({ id: `dividend-${position.id}`, label: position.name, kind: "dividend", amount });
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
    starShards: Math.max(1, Math.round(total * 4)),
    sources,
  };
}

const chapterCopy = (state: DragonState, snapshot: FinancialSnapshot): Omit<JourneyChapter, "id" | "dayKey" | "createdAt"> => {
  const variableIncome = state.journey.incomeSources.find((item) => item.reliability !== "steady");
  if (snapshot.direction === "rising") return {
    direction: "rising",
    title: snapshot.debt < (state.journey.snapshots.at(-1)?.debt ?? snapshot.debt) ? "The Chain Gives Way" : "The Sunroad Opens",
    speaker: "Asha Emberwright",
    opening: "The road climbs because several real things moved together: assets held, obligations eased, or income arrived. We celebrate the direction without demanding that every day look like this one.",
    ending: "Asha marks the gain on the atlas, then leaves space for ordinary days. Progress is allowed to breathe.",
    choices: ["Protect part of this gain", "Aim it at the next debt marker", "Celebrate before choosing"],
    actionTitle: snapshot.debt > 0 ? "Choose the next chain marker" : "Give part of the gain a job",
    actionDescription: snapshot.debt > 0 ? "Review one debt and decide whether its next planned payment still fits." : "Choose one small amount to protect, invest, or enjoy intentionally.",
    actionCategory: "Grow",
  };
  if (snapshot.direction === "sheltered") return {
    direction: "sheltered",
    title: "The Bridge After Rain",
    speaker: "Mara Ironroot",
    opening: "The road changed beneath us. That is information, not failure. Mara lights the nearest stones and asks only what would make the next seven days safer.",
    ending: "The bridge does not need to be rebuilt tonight. One sound plank is enough to keep the path open.",
    choices: ["Protect the next seven days", "Review one pressure point", "Rest before I decide"],
    actionTitle: "Make the next seven days gentler",
    actionDescription: "Review one upcoming bill, minimum payment, or flexible cost. Changing it is optional; seeing it clearly is the quest.",
    actionCategory: "Guard",
  };
  return {
    direction: "steady",
    title: variableIncome ? "Caravans at Stillwater" : "Camp at Stillwater",
    speaker: variableIncome ? "Pip Reedwhistle" : "Bramble Stoneheart",
    opening: variableIncome ? `${variableIncome.name} follows a less regular road. Pip records the quiet stretch as part of the rhythm—not as missing progress.` : "The hoard held its ground. Bramble calls this a worthy chapter: a pause where plans can be checked without urgency.",
    ending: "The lantern remains lit. Staying steady protected choices that tomorrow can use.",
    choices: ["Mark the next expected income", "Check the protected buffer", "Let steady be enough today"],
    actionTitle: variableIncome ? "Mark the next likely arrival" : "Check one steady assumption",
    actionDescription: variableIncome ? "Review an irregular income source and record its best current expectation without treating it as guaranteed." : "Confirm that one recurring cost or buffer target still matches real life.",
    actionCategory: "Tend",
  };
};

export function createJourneyChapter(state: DragonState, snapshot: FinancialSnapshot, now = new Date()): JourneyChapter {
  const dayKey = journeyDayKey(now);
  return { id: `journey-${dayKey}`, dayKey, createdAt: now.toISOString(), ...chapterCopy(state, snapshot) };
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
      currentNode: chapter ? (state.journey.currentNode + 1) % 12 : state.journey.currentNode,
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
