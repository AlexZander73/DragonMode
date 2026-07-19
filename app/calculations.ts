import type { Debt, DragonState, ProjectionScenario, Quest, Transaction } from "./data";

const monthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
};

export function getHoardSummary(state: DragonState) {
  const available = state.accounts
    .filter((account) => !account.archived && account.includedInHoard && account.type === "transaction")
    .reduce((sum, account) => sum + (account.availableBalance ?? account.balance), 0);
  const committed = monthlyTribute(state)
    + state.debts.reduce((sum, debt) => sum + debt.minimum, 0)
    + state.profile.essentialMonthlyCost;
  const guarded = state.chambers.find((chamber) => chamber.id === "vault")?.amount ?? 0;
  const invested = state.chambers.find((chamber) => chamber.id === "sleep")?.amount ?? 0;
  const total = state.chambers.reduce((sum, chamber) => sum + chamber.amount, 0);
  const freeGold = Math.max(0, available - committed - state.profile.minimumBuffer);
  return { available, committed, guarded, invested, total, freeGold };
}

export const monthlyTribute = (state: DragonState) => state.subscriptions.reduce(
  (sum, subscription) => sum + (subscription.cadence === "annual" ? subscription.amount / 12 : subscription.amount),
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

export function currentMonthTransactions(state: DragonState) {
  const start = monthStart();
  return state.transactions.filter((transaction) => new Date(transaction.date).getTime() >= start);
}

export function getMonthlyFlow(state: DragonState) {
  const transactions = currentMonthTransactions(state);
  const inflow = transactions.filter((item) => item.direction === "income").reduce((sum, item) => sum + item.amount, 0);
  const outflow = transactions.filter((item) => item.direction === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { inflow, outflow, net: inflow - outflow, transactions };
}

export function getCategoryBreakdown(state: DragonState) {
  const totals = new Map<string, number>();
  currentMonthTransactions(state).filter((item) => item.direction === "expense").forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  });
  const rows = [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({ ...row, percent: total ? Math.round((row.value / total) * 100) : 0 }));
}

export function getWorthSummary(state: DragonState) {
  const scored = state.transactions.filter((item) => item.direction === "expense" && item.worthRating);
  const positive = scored.filter((item) => item.worthRating === "Absolutely" || item.worthRating === "Mostly").length;
  return { rated: scored.length, positivePercent: scored.length ? Math.round((positive / scored.length) * 100) : 0 };
}

export function subscriptionCostPerUse(state: DragonState, subscriptionId: string) {
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return 0;
  const monthly = subscription.cadence === "monthly" ? subscription.amount : subscription.amount / 12;
  return subscription.usageCount ? monthly / subscription.usageCount : monthly;
}

export function getActiveQuests(state: DragonState): Quest[] {
  const now = Date.now();
  const stored = [...state.quests];
  const ensure = (candidate: Quest) => {
    if (!stored.some((item) => item.id === candidate.id)) stored.push(candidate);
  };

  state.transactions.filter((item) => item.unusual).forEach((transaction) => ensure({
    id: `q-unusual-${transaction.id}`,
    title: "A Suspicious Charge",
    description: `${transaction.merchant} looks unusual. Review it?`,
    reason: "It differs from your recent pattern.",
    category: "Guard",
    difficulty: "Small",
    estimatedMinutes: 2,
    xp: 10,
    completed: false,
    relatedEntityId: transaction.id,
    generatedAt: new Date().toISOString(),
    icon: "shield",
  }));

  const hasCategorisationQuest = stored.some((item) => item.id === "q-categorise" && !item.completed && !item.dismissedAt);
  if (!hasCategorisationQuest) state.transactions.filter((item) => item.category === "Uncategorised").forEach((transaction) => ensure({
    id: `q-category-${transaction.id}`,
    title: "Place Lost Gold",
    description: `Choose a chamber for ${transaction.merchant}.`,
    reason: "One clear category improves every Scrying view.",
    category: "Tend",
    difficulty: "Small",
    estimatedMinutes: 1,
    xp: 8,
    completed: false,
    relatedEntityId: transaction.id,
    generatedAt: new Date().toISOString(),
    icon: "list",
  }));

  state.subscriptions.filter((item) => item.questEnabled && item.lastUsed && (now - new Date(item.lastUsed).getTime()) / 86_400_000 >= item.usageQuestDays).forEach((subscription) => ensure({
    id: `q-unused-${subscription.id}`,
    title: "Unused Claimant",
    description: `No use has been logged for ${subscription.name} in ${Math.floor((now - new Date(subscription.lastUsed!).getTime()) / 86_400_000)} days.`,
    reason: `It renews soon. No logged use does not necessarily mean no use.`,
    category: "Guard",
    difficulty: "Small",
    estimatedMinutes: 2,
    xp: 15,
    completed: false,
    relatedEntityId: subscription.id,
    generatedAt: new Date().toISOString(),
    icon: "scroll",
  }));

  return stored
    .filter((item) => !item.completed && !item.dismissedAt && (!item.snoozedUntil || new Date(item.snoozedUntil).getTime() <= now))
    .sort((a, b) => (a.category === "Guard" ? -1 : 1) - (b.category === "Guard" ? -1 : 1));
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
  const startingFirst = working[0]?.balance ?? 0;
  while (working.some((debt) => debt.balance > 0.01) && months < 600) {
    months += 1;
    let rollover = extraMonthly;
    working = orderDebts(working, strategy);
    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * (debt.apr / 100 / 12);
      interestPaid += interest;
      debt.balance += interest;
      const payment = Math.min(debt.balance, debt.minimum + (debt === working.find((item) => item.balance > 0) ? rollover : 0));
      debt.balance -= payment;
      if (payment < debt.minimum) rollover += debt.minimum - payment;
    }
    if (!firstVictoryMonth && startingFirst - (working[0]?.balance ?? 0) >= Math.min(500, startingFirst)) firstVictoryMonth = months;
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
  const points = Array.from({ length: months + 1 }, (_, index) => {
    const oneOff = index > 0 ? scenario.oneOffPurchase : 0;
    return Math.max(0, start + monthlyNet * index - oneOff);
  });
  const end = points.at(-1) ?? start;
  const uncertainty = Math.max(600, Math.abs(monthlyNet) * 1.5);
  return { start, end, low: Math.max(0, end - uncertainty), high: end + uncertainty, monthlyNet, points };
}

export function searchTransactions(transactions: Transaction[], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return transactions;
  return transactions.filter((item) => `${item.merchant} ${item.note} ${item.category}`.toLowerCase().includes(term));
}
