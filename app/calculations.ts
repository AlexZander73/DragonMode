import type { DragonState } from "./data";

export function getHoardSummary(state: DragonState) {
  const available = state.accounts.filter((account) => account.type === "transaction").reduce((sum, account) => sum + account.balance, 0);
  const committed = state.subscriptions.reduce((sum, subscription) => sum + (subscription.cadence === "annual" ? subscription.amount / 12 : subscription.amount), 0)
    + state.debts.reduce((sum, debt) => sum + debt.minimum, 0) + 3900;
  const guarded = state.chambers.find((chamber) => chamber.id === "vault")?.amount ?? 0;
  const invested = state.chambers.find((chamber) => chamber.id === "sleep")?.amount ?? 0;
  const total = state.chambers.reduce((sum, chamber) => sum + chamber.amount, 0);
  const freeGold = Math.max(0, available - committed - 1200);
  return { available, committed, guarded, invested, total, freeGold };
}

export const monthlyTribute = (state: DragonState) => state.subscriptions.reduce((sum, subscription) => sum + (subscription.cadence === "annual" ? subscription.amount / 12 : subscription.amount), 0);
export const totalDebt = (state: DragonState) => state.debts.reduce((sum, debt) => sum + debt.balance, 0);
export const averageApr = (state: DragonState) => {
  const total = totalDebt(state);
  return total ? state.debts.reduce((sum, debt) => sum + debt.balance * debt.apr, 0) / total : 0;
};
export const hibernationMonths = (state: DragonState, monthlyCost = 1706.5) => getHoardSummary(state).guarded / monthlyCost;

