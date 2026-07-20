import type { DragonState, InvestmentPosition, Transaction } from "./data";

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const accountChamberId = (state: DragonState, accountId: string) =>
  state.accounts.find((account) => account.id === accountId)?.chamberId;

const transactionChamberId = (state: DragonState, transaction: Transaction) =>
  state.chambers.find((chamber) => chamber.name === transaction.category)?.id
  ?? accountChamberId(state, transaction.accountId);

function adjustAccount(state: DragonState, accountId: string, amount: number) {
  return {
    ...state,
    accounts: state.accounts.map((account) => account.id === accountId ? {
      ...account,
      balance: cents(account.balance + amount),
      availableBalance: account.availableBalance === undefined ? undefined : cents(account.availableBalance + amount),
    } : account),
  };
}

function adjustChamber(state: DragonState, chamberId: string | undefined, amount: number) {
  if (!chamberId) return state;
  return {
    ...state,
    chambers: state.chambers.map((chamber) => chamber.id === chamberId
      ? { ...chamber, amount: cents(chamber.amount + amount) }
      : chamber),
  };
}

function applyEffect(state: DragonState, transaction: Transaction, multiplier: 1 | -1) {
  if (transaction.status !== "cleared") return state;
  const amount = cents(transaction.amount * multiplier);
  if (transaction.transfer) {
    if (!transaction.transferToAccountId || transaction.transferToAccountId === transaction.accountId) return state;
    let next = adjustAccount(state, transaction.accountId, -amount);
    next = adjustAccount(next, transaction.transferToAccountId, amount);
    const sourceChamber = accountChamberId(state, transaction.accountId);
    const destinationChamber = accountChamberId(state, transaction.transferToAccountId);
    if (sourceChamber !== destinationChamber) {
      next = adjustChamber(next, sourceChamber, -amount);
      next = adjustChamber(next, destinationChamber, amount);
    }
    return next;
  }
  const movement = transaction.direction === "income" ? amount : -amount;
  let next = adjustAccount(state, transaction.accountId, movement);
  next = adjustChamber(next, transactionChamberId(state, transaction), movement);
  return next;
}

export function replaceTransaction(state: DragonState, previous: Transaction | null, next: Transaction | null) {
  let updated = previous ? applyEffect(state, previous, -1) : state;
  updated = next ? applyEffect(updated, next, 1) : updated;
  const transactions = previous
    ? next
      ? updated.transactions.map((transaction) => transaction.id === previous.id ? next : transaction)
      : updated.transactions.filter((transaction) => transaction.id !== previous.id)
    : next ? [next, ...updated.transactions] : updated.transactions;
  return { ...updated, transactions, updatedAt: new Date().toISOString() };
}

export function createTransaction(state: DragonState, transaction: Transaction) {
  return replaceTransaction(state, null, transaction);
}

export function deleteTransaction(state: DragonState, transaction: Transaction) {
  return replaceTransaction(state, transaction, null);
}

export function financialAssetTotal(state: DragonState) {
  return cents(state.accounts
    .filter((account) => !account.archived && account.includedInHoard && account.type !== "credit" && account.type !== "loan")
    .reduce((sum, account) => sum + Math.max(0, account.balance), 0));
}

export function syncInvestmentAccounts(state: DragonState, investments: InvestmentPosition[]) {
  const totals = investments.reduce<Record<string, number>>((result, position) => {
    result[position.accountId] = cents((result[position.accountId] ?? 0) + position.units * (position.marketPrice ?? position.unitPrice));
    return result;
  }, {});
  const accountDeltas = state.accounts.reduce<Record<string, number>>((result, account) => {
    if ((account.type === "investment" || account.type === "asset") && account.id in totals) result[account.id] = cents(totals[account.id] - account.balance);
    return result;
  }, {});
  return {
    ...state,
    investments,
    accounts: state.accounts.map((account) => account.id in accountDeltas ? { ...account, balance: totals[account.id], availableBalance: account.availableBalance === undefined ? undefined : totals[account.id] } : account),
    chambers: state.chambers.map((chamber) => {
      const delta = state.accounts.filter((account) => account.chamberId === chamber.id).reduce((sum, account) => sum + (accountDeltas[account.id] ?? 0), 0);
      return delta ? { ...chamber, amount: cents(chamber.amount + delta) } : chamber;
    }),
    updatedAt: new Date().toISOString(),
  };
}
