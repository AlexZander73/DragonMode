import type { Debt, DragonState, Pet, PetCadence, ProjectionScenario, Quest, Subscription, SubscriptionCadence, Transaction } from "./data";
import { journeyQuest } from "./journey";
import { financialAssetTotal } from "./ledger";

const DAY_MS = 86_400_000;

export const petCadenceDays: Record<PetCadence, number> = { daily: 1, weekly: 7, monthly: 30 };

export function petCareStatus(pet: Pet, now = Date.now()) {
  const elapsedDays = Math.max(0, Math.floor((now - new Date(pet.lastInteraction).getTime()) / DAY_MS));
  const intervalDays = petCadenceDays[pet.cadence];
  const due = elapsedDays >= intervalDays;
  const daysRemaining = Math.max(0, intervalDays - elapsedDays);
  const overdueDays = Math.max(0, elapsedDays - intervalDays);
  return {
    due,
    elapsedDays,
    daysRemaining,
    overdueDays,
    label: due ? (overdueDays ? `Ready for ${overdueDays} ${overdueDays === 1 ? "day" : "days"}` : "Ready today") : `Returns in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`,
  };
}

export const petBondLevel = (pet: Pet) => Math.min(5, Math.max(1, Math.floor(pet.bondXp / 35) + 1));

export const LEVEL_REWARDS: Record<number, { title: string; relic: string; cosmetic: string }> = {
  2: { title: "The First Cartographer", relic: "Emberglass Key", cosmetic: "Ember Library" },
  3: { title: "The Chamber Tender", relic: "Moon Garden Banner", cosmetic: "Moon Garden" },
  4: { title: "The Patient Listener", relic: "Quill's Compass", cosmetic: "Sapphire" },
  5: { title: "The Hearthwarden", relic: "Hearthstone Crown", cosmetic: "Ember" },
  6: { title: "The Sky Reader", relic: "Skyvault Orrery", cosmetic: "Sky Vault" },
  7: { title: "The Chainbreaker", relic: "Chainbreaker Seal", cosmetic: "Amethyst" },
  8: { title: "The Hoardkeeper", relic: "Emerald Ward", cosmetic: "Emerald" },
  9: { title: "The Vaultwarden", relic: "Vaultwarden Lantern", cosmetic: "Vault Aurora" },
  10: { title: "The Ancient Guardian", relic: "Ancient Guardian Crown", cosmetic: "Silver Trail" },
};

const monthBounds = (offset = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1).getTime();
  return { start, end };
};

export const cadenceMonthlyMultiplier: Record<SubscriptionCadence, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
};

export const cadencePeriodDays: Record<SubscriptionCadence, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30.4375,
  quarterly: 91.3125,
  annual: 365.25,
};

export const monthlySubscriptionAmount = (subscription: Subscription) => subscription.amount * cadenceMonthlyMultiplier[subscription.cadence];

export function getHoardSummary(state: DragonState) {
  const available = state.accounts
    .filter((account) => !account.archived && account.includedInHoard && (account.type === "transaction" || account.type === "cash"))
    .reduce((sum, account) => sum + (account.availableBalance ?? account.balance), 0);
  const committed = monthlyTribute(state)
    + state.debts.reduce((sum, debt) => sum + debt.minimum, 0)
    + state.profile.essentialMonthlyCost;
  const guarded = state.chambers.find((chamber) => chamber.id === "vault")?.amount ?? 0;
  const investedPositions = state.investments.reduce((sum, position) => sum + position.units * position.unitPrice, 0);
  const invested = investedPositions || state.chambers.find((chamber) => chamber.id === "sleep")?.amount || 0;
  const total = financialAssetTotal(state);
  const freeGoldRaw = available - committed - state.profile.minimumBuffer;
  const freeGold = Math.max(0, freeGoldRaw);
  return { available, committed, guarded, invested, total, freeGold, freeGoldRaw };
}

export const monthlyTribute = (state: DragonState) => state.subscriptions.reduce(
  (sum, subscription) => sum + monthlySubscriptionAmount(subscription),
  0,
);

export const totalDebt = (state: DragonState) => state.debts.reduce((sum, debt) => sum + debt.balance, 0);

export const averageApr = (state: DragonState) => {
  const total = totalDebt(state);
  return total ? state.debts.reduce((sum, debt) => sum + debt.balance * debt.apr, 0) / total : 0;
};

export const hibernationMonths = (state: DragonState, monthlyCost = state.profile.comfortableMonthlyCost) =>
  monthlyCost > 0 ? getHoardSummary(state).guarded / monthlyCost : 0;

export const hibernationModes = (state: DragonState) => ({
  Essential: hibernationMonths(state, state.profile.essentialMonthlyCost),
  Comfortable: hibernationMonths(state, state.profile.comfortableMonthlyCost),
  "Current lifestyle": hibernationMonths(state, state.profile.lifestyleMonthlyCost),
});

export function transactionsForMonth(state: DragonState, offset = 0) {
  const { start, end } = monthBounds(offset);
  return state.transactions.filter((transaction) => {
    const timestamp = new Date(transaction.date).getTime();
    return timestamp >= start && timestamp < end;
  });
}

export function currentMonthTransactions(state: DragonState) {
  return transactionsForMonth(state);
}

export function getMonthlyFlow(state: DragonState, offset = 0) {
  const transactions = transactionsForMonth(state, offset);
  const inflow = transactions.filter((item) => item.direction === "income" && item.status === "cleared" && !item.transfer).reduce((sum, item) => sum + item.amount, 0);
  const outflow = transactions.filter((item) => item.direction === "expense" && item.status === "cleared" && !item.transfer).reduce((sum, item) => sum + item.amount, 0);
  return { inflow, outflow, net: inflow - outflow, transactions };
}

export function getMonthlyTrend(state: DragonState, months = 6) {
  return Array.from({ length: months }, (_, index) => {
    const offset = index - (months - 1);
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const flow = getMonthlyFlow(state, offset);
    return { label: date.toLocaleDateString(state.profile.locale, { month: "short" }), ...flow };
  });
}

export function getCategoryBreakdown(state: DragonState, offset = 0) {
  const totals = new Map<string, number>();
  transactionsForMonth(state, offset).filter((item) => item.direction === "expense" && item.status === "cleared" && !item.transfer).forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  });
  const rows = [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({ ...row, percent: total ? Math.round((row.value / total) * 100) : 0 }));
}

export function getWorthSummary(state: DragonState) {
  const scored = state.transactions.filter((item) => item.direction === "expense" && item.worthRating);
  const positive = scored.filter((item) => item.worthRating === "Absolutely" || item.worthRating === "Mostly").length;
  const byRating = scored.reduce<Record<string, number>>((summary, item) => {
    const rating = item.worthRating ?? "Unrated";
    summary[rating] = (summary[rating] ?? 0) + item.amount;
    return summary;
  }, {});
  return { rated: scored.length, positivePercent: scored.length ? Math.round((positive / scored.length) * 100) : 0, byRating };
}

export function currentBillingUsage(subscription: Subscription, now = Date.now()) {
  const nextCharge = new Date(subscription.nextCharge).getTime();
  const periodStart = nextCharge - cadencePeriodDays[subscription.cadence] * DAY_MS;
  const periodEnd = nextCharge > now ? nextCharge : now;
  return subscription.usageEvents
    .filter((event) => {
      const timestamp = new Date(event.usedAt).getTime();
      return timestamp >= periodStart && timestamp <= periodEnd;
    })
    .reduce((sum, event) => sum + event.quantity, 0);
}

export function subscriptionCostPerUse(state: DragonState, subscriptionId: string) {
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return 0;
  const uses = currentBillingUsage(subscription);
  return uses ? subscription.amount / uses : subscription.amount;
}

const generatedQuest = (input: Pick<Quest, "id" | "title" | "description" | "reason" | "category" | "xp" | "icon"> & Partial<Quest>): Quest => ({
  difficulty: "Small",
  estimatedMinutes: 2,
  completed: false,
  generatedAt: new Date().toISOString(),
  ...input,
});

export function getActiveQuests(state: DragonState): Quest[] {
  const now = Date.now();
  const stored = [...state.quests];
  const ensure = (candidate: Quest) => {
    const historical = stored.find((item) => item.id === candidate.id);
    if (!historical) stored.push(candidate);
  };

  const livingQuest = journeyQuest(state);
  if (livingQuest) ensure(livingQuest);

  state.transactions.filter((item) => item.unusual && !item.reviewedAt).forEach((transaction) => ensure(generatedQuest({
    id: `q-unusual-${transaction.id}`,
    title: "A Suspicious Charge",
    description: `${transaction.merchant} looks unusual. Review it?`,
    reason: "It differs from the pattern you mapped. It may still be entirely valid.",
    category: "Guard",
    xp: 10,
    relatedEntityId: transaction.id,
    icon: "shield",
  })));

  state.transactions.filter((item) => item.duplicate && !item.reviewedAt).forEach((transaction) => ensure(generatedQuest({
    id: `q-duplicate-${transaction.id}`,
    title: "Possible Echo Charge",
    description: `${transaction.merchant} may appear twice. Check the pair?`,
    reason: "Only you can confirm whether two similar movements are both expected.",
    category: "Guard",
    xp: 12,
    relatedEntityId: transaction.id,
    icon: "shield",
  })));

  const hasCategorisationQuest = stored.some((item) => item.id === "q-categorise" && !item.completed && !item.dismissedAt);
  if (!hasCategorisationQuest) state.transactions.filter((item) => item.category === "Uncategorised").forEach((transaction) => ensure(generatedQuest({
    id: `q-category-${transaction.id}`,
    title: "Place Lost Gold",
    description: `Choose a chamber for ${transaction.merchant}.`,
    reason: "One clear category improves every Scrying view.",
    category: "Tend",
    estimatedMinutes: 1,
    xp: 8,
    relatedEntityId: transaction.id,
    icon: "list",
  })));

  state.subscriptions.filter((item) => item.questEnabled && item.lastUsed && (now - new Date(item.lastUsed).getTime()) / DAY_MS >= item.usageQuestDays).forEach((subscription) => ensure(generatedQuest({
    id: `q-unused-${subscription.id}`,
    title: "Unused Claimant",
    description: `No use has been logged for ${subscription.name} in ${Math.floor((now - new Date(subscription.lastUsed!).getTime()) / DAY_MS)} days.`,
    reason: "No logged use does not necessarily mean no use. A calm review is enough.",
    category: "Guard",
    xp: 15,
    relatedEntityId: subscription.id,
    icon: "scroll",
  })));

  state.subscriptions.filter((item) => item.priceChange && item.priceChange > 0).forEach((subscription) => ensure(generatedQuest({
    id: `q-price-${subscription.id}-${subscription.amount}`,
    title: "A Claimant Changed Tribute",
    description: `${subscription.name} increased by ${subscription.priceChange?.toFixed(2)}.`,
    reason: "A price change deserves visibility, not an automatic cancellation.",
    category: "Guard",
    xp: 12,
    relatedEntityId: subscription.id,
    icon: "scroll",
  })));

  if (getHoardSummary(state).freeGoldRaw < 0) ensure(generatedQuest({
    id: "q-buffer-watch",
    title: "Protect the Next Seven Days",
    description: "Committed gold is pressing against your protected buffer.",
    reason: "The hoard is tighter than expected, but one small adjustment may be enough.",
    category: "Guard",
    xp: 18,
    icon: "shield",
  }));

  state.debts.filter((debt) => debt.progress >= 75).forEach((debt) => ensure(generatedQuest({
    id: `q-debt-milestone-${debt.id}-75`,
    title: "A Chain Is Nearly Loose",
    description: `${debt.name} has crossed 75% of its mapped path.`,
    reason: "Progress remains part of your legacy even if the balance changes later.",
    category: "Grow",
    xp: 20,
    relatedEntityId: debt.id,
    icon: "vault",
  })));

  const activeProjection = state.projections.scenarios[state.projections.activeScenario];
  if (activeProjection && projectScenario(state, activeProjection, 3).monthlyNet < 0) ensure(generatedQuest({
    id: `q-flight-review-${state.projections.activeScenario}`,
    title: "The Flight Path Changed",
    description: "Your active three-month path now trends downward.",
    reason: "A projection is an estimate. Reviewing assumptions is useful; changing course is optional.",
    category: "Learn",
    xp: 14,
    icon: "star",
  }));

  const categoryOrder: Record<Quest["category"], number> = { Guard: 0, Grow: 1, Learn: 2, Tend: 3 };
  return stored
    .filter((item) => !item.completed && !item.dismissedAt && (!item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= now))
    .sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category] || b.xp - a.xp);
}

export function addProgressionXp(state: DragonState, amount: number, milestone?: string) {
  const xp = state.progression.xp + amount;
  let level = state.progression.level;
  let nextLevelXp = state.progression.nextLevelXp;
  const relics = [...state.progression.relics];
  const unlockedCosmetics = [...state.progression.unlockedCosmetics];
  while (xp >= nextLevelXp) {
    level += 1;
    nextLevelXp += 250 + level * 50;
    const reward = LEVEL_REWARDS[level] ?? { title: `Starwarden · Rank ${level}`, relic: `Starforged Sigil ${level}`, cosmetic: level % 2 === 0 ? "Amethyst" : "Ember" };
    const relic = reward.relic;
    if (!relics.includes(relic)) relics.push(relic);
    const cosmetic = reward.cosmetic;
    if (!unlockedCosmetics.includes(cosmetic)) unlockedCosmetics.push(cosmetic);
  }
  const reward = LEVEL_REWARDS[level];
  return {
    ...state.progression,
    xp,
    level,
    nextLevelXp,
    title: reward?.title ?? (level > 10 ? `Starwarden · Rank ${level}` : state.progression.title),
    relics,
    unlockedCosmetics,
    milestones: milestone && !state.progression.milestones.includes(milestone)
      ? [...state.progression.milestones, milestone]
      : state.progression.milestones,
  };
}

export const orderDebts = (debts: Debt[], strategy: string) => {
  if (strategy === "Highest interest first") return [...debts].sort((a, b) => b.apr - a.apr);
  if (strategy === "Smallest first") return [...debts].sort((a, b) => a.balance - b.balance);
  if (strategy === "Custom order") return [...debts].sort((a, b) => a.strategyOrder - b.strategyOrder);
  return [...debts];
};

export function estimateDebtPlan(debts: Debt[], strategy: string, extraMonthly: number) {
  let working = orderDebts(debts.map((debt) => ({ ...debt })), strategy);
  let months = 0;
  let interestPaid = 0;
  let firstVictoryMonth = 0;
  const firstDebtId = working[0]?.id;
  while (working.some((debt) => debt.balance > 0.01) && months < 600) {
    months += 1;
    let rollover = extraMonthly;
    working = orderDebts(working, strategy);
    const active = working.find((item) => item.balance > 0);
    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (debt.apr / 100 / 12);
      interestPaid += interest;
      debt.balance += interest;
      const payment = Math.min(debt.balance, debt.minimum + (debt.id === active?.id ? rollover : 0));
      debt.balance -= payment;
      if (payment < debt.minimum) rollover += debt.minimum - payment;
    }
    if (!firstVictoryMonth && firstDebtId && (working.find((item) => item.id === firstDebtId)?.balance ?? 0) <= 0.01) firstVictoryMonth = months;
  }
  return { months, interestPaid, firstVictoryMonth: firstVictoryMonth || Math.min(months, 1) };
}

export function projectScenario(state: DragonState, scenario: ProjectionScenario, months = 12) {
  const start = getHoardSummary(state).total;
  const monthlySubscriptions = monthlyTribute(state) + scenario.subscriptionChange;
  const monthlyDebtMinimum = state.debts.reduce((sum, debt) => sum + debt.minimum, 0) + scenario.debtExtraPayment;
  const monthlyNet = scenario.expectedMonthlyIncome
    - scenario.essentialSpending
    - scenario.flexibleSpending
    - monthlySubscriptions
    - monthlyDebtMinimum
    - scenario.savingsContribution
    - scenario.investmentContribution;
  const weightedReturn = state.investments.length
    ? state.investments.reduce((sum, position) => sum + position.annualReturnAssumption * position.units * position.unitPrice, 0)
      / Math.max(1, state.investments.reduce((sum, position) => sum + position.units * position.unitPrice, 0))
    : 0;
  const monthlyInvestmentReturn = weightedReturn / 100 / 12;
  const points = Array.from({ length: months + 1 }, (_, index) => {
    const oneOff = index > 0 ? scenario.oneOffPurchase : 0;
    const investmentGrowth = getHoardSummary(state).invested * (Math.pow(1 + monthlyInvestmentReturn, index) - 1);
    return Math.max(0, start + monthlyNet * index - oneOff + investmentGrowth);
  });
  const end = points.at(-1) ?? start;
  const uncertainty = Math.max(600, Math.abs(monthlyNet) * 1.5 + months * 45);
  return { start, end, low: Math.max(0, end - uncertainty), high: end + uncertainty, monthlyNet, points, weightedReturn };
}

export function searchTransactions(transactions: Transaction[], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return transactions;
  return transactions.filter((item) => `${item.merchant} ${item.note} ${item.category}`.toLowerCase().includes(term));
}
