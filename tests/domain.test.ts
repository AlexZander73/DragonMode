import assert from "node:assert/strict";
import test from "node:test";
import {
  addProgressionXp,
  currentBillingUsage,
  estimateDebtPlan,
  getActiveQuests,
  getHoardSummary,
  monthlySubscriptionAmount,
  monthlyTribute,
  petBondLevel,
  petCareStatus,
  projectScenario,
  searchTransactions,
} from "../app/calculations";
import { createEmptyState, createSeedState, normalizeState, SCHEMA_VERSION } from "../app/data";
import { EXPERIMENTAL_MARKET_DATA } from "../app/constants";
import { calculateIdleReward, captureFinancialSnapshot, processJourneySession, shouldRefreshMarketData } from "../app/journey";

test("subscription cadences normalize to a monthly planning cost", () => {
  const subscription = createSeedState().subscriptions[0];
  assert.equal(monthlySubscriptionAmount({ ...subscription, amount: 12, cadence: "monthly" }), 12);
  assert.equal(monthlySubscriptionAmount({ ...subscription, amount: 120, cadence: "annual" }), 10);
  assert.equal(monthlySubscriptionAmount({ ...subscription, amount: 30, cadence: "quarterly" }), 10);
  assert.ok(monthlySubscriptionAmount({ ...subscription, amount: 10, cadence: "weekly" }) > 43);
});

test("hoard summary separates available, guarded, invested, and free gold", () => {
  const state = createSeedState();
  const summary = getHoardSummary(state);
  assert.equal(summary.available, 6210.3);
  assert.equal(summary.guarded, 7850);
  assert.ok(Math.abs(summary.invested - 8649.94) < 0.01);
  assert.equal(summary.committed, monthlyTribute(state) + 240 + state.profile.essentialMonthlyCost);
  assert.equal(summary.freeGold, Math.max(0, summary.available - summary.committed - state.profile.minimumBuffer));
});

test("billing usage only counts events in the current claimant period", () => {
  const subscription = createSeedState().subscriptions[0];
  const now = Date.now();
  const withEvents = {
    ...subscription,
    nextCharge: new Date(now + 10 * 86_400_000).toISOString(),
    usageEvents: [
      { id: "recent", usedAt: new Date(now - 2 * 86_400_000).toISOString(), quantity: 2, source: "manual" as const },
      { id: "old", usedAt: new Date(now - 40 * 86_400_000).toISOString(), quantity: 8, source: "manual" as const },
    ],
  };
  assert.equal(currentBillingUsage(withEvents, now), 2);
});

test("quest engine exposes review, category, claimant, and price-change prompts", () => {
  const quests = getActiveQuests(createSeedState());
  assert.ok(quests.some((quest) => quest.id === "q-unusual-t5"));
  assert.ok(quests.some((quest) => quest.id === "q-categorise" || quest.id === "q-category-t5"));
  assert.ok(quests.some((quest) => quest.id === "q-unused-s4"));
  assert.ok(quests.some((quest) => quest.id.startsWith("q-price-s3")));
});

test("debt strategies produce bounded payoff estimates", () => {
  const state = createSeedState();
  const snowball = estimateDebtPlan(state.debts, "Smallest first", 50);
  const avalanche = estimateDebtPlan(state.debts, "Highest interest first", 50);
  assert.ok(snowball.months > 0 && snowball.months < 600);
  assert.ok(avalanche.interestPaid > 0);
  assert.ok(avalanche.interestPaid <= estimateDebtPlan(state.debts, "Minimum payments", 0).interestPaid);
});

test("projection points and uncertainty respond to scenario assumptions", () => {
  const state = createSeedState();
  const current = projectScenario(state, state.projections.scenarios["Current Flight"], 12);
  const resting = projectScenario(state, state.projections.scenarios.Resting, 12);
  assert.equal(current.points.length, 13);
  assert.ok(current.high > current.end && current.end > current.low);
  assert.ok(current.end > resting.end);
});

test("XP awards preserve permanent milestones and unlock level rewards", () => {
  const state = createSeedState();
  state.progression.xp = 1995;
  const progression = addProgressionXp(state, 10, "test-milestone");
  assert.equal(progression.level, 9);
  assert.ok(progression.relics.includes("Level 9 Sigil"));
  assert.ok(progression.milestones.includes("test-milestone"));
});

test("pet care cadences become due without punishing bond progress", () => {
  const state = createSeedState();
  const daily = { ...state.pets[0], lastInteraction: new Date(Date.now() - 2 * 86_400_000).toISOString() };
  const weekly = { ...state.pets[1], lastInteraction: new Date(Date.now() - 3 * 86_400_000).toISOString() };
  assert.equal(petCareStatus(daily).due, true);
  assert.equal(petCareStatus(weekly).due, false);
  assert.ok(petBondLevel({ ...daily, bondXp: daily.bondXp + 40 }) >= petBondLevel(daily));
});

test("search and schema migration retain usable local data", () => {
  const state = createSeedState();
  assert.equal(searchTransactions(state.transactions, "groceries").length, 2);
  const legacy = structuredClone(state) as unknown as Record<string, unknown>;
  legacy.schemaVersion = 1;
  delete legacy.investments;
  const migrated = normalizeState(legacy);
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.ok(migrated.investments.length > 0);
  assert.ok(migrated.accounts.every((account) => account.icon && account.color));
  assert.equal(migrated.pets.length, 3);
  assert.equal(migrated.journey.selectedAvatarId, "asha");
  assert.equal(migrated.journey.marketRefreshHours, 24);
  assert.equal(migrated.goals.length, 2);
  assert.deepEqual(migrated.progression.storyChoices, {});
});

test("personal first-run state is truly empty while keeping the fantasy shell", () => {
  const state = createEmptyState();
  assert.equal(state.profile.dataMode, "personal");
  assert.deepEqual(state.accounts, []);
  assert.deepEqual(state.transactions, []);
  assert.deepEqual(state.subscriptions, []);
  assert.deepEqual(state.debts, []);
  assert.deepEqual(state.wishes, []);
  assert.deepEqual(state.goals, []);
  assert.deepEqual(state.investments, []);
  assert.ok(state.chambers.length >= 6);
  assert.ok(state.pets.length >= 3);
  assert.equal(state.progression.level, 1);
  assert.equal(state.journey.marketAutoRefresh, false);
});

test("release configuration keeps experimental market retrieval disabled", () => {
  assert.equal(EXPERIMENTAL_MARKET_DATA, false);
  assert.equal(createSeedState().journey.marketAutoRefresh, false);
});

test("seed goals are editable milestones rather than financial transfers", () => {
  const state = createSeedState();
  const before = structuredClone({ accounts: state.accounts, transactions: state.transactions });
  const goal = state.goals[0];
  goal.currentAmount += 25;
  assert.ok(goal.currentAmount < goal.targetAmount);
  assert.deepEqual({ accounts: state.accounts, transactions: state.transactions }, before);
});

test("Journey direction follows total assets less debt without punishing small movement", () => {
  const state = createSeedState();
  const now = new Date("2026-07-20T12:00:00.000Z");
  const base = captureFinancialSnapshot(state, new Date("2026-07-13T12:00:00.000Z"));
  const steady = captureFinancialSnapshot(state, now, { ...base, netWorth: base.netWorth - 10 });
  const risingState = { ...state, accounts: state.accounts.map((account) => account.id === "a2" ? { ...account, balance: account.balance + 500 } : account) };
  const shelteredState = { ...state, debts: state.debts.map((debt) => debt.id === "d1" ? { ...debt, balance: debt.balance + 500 } : debt) };
  assert.equal(steady.direction, "steady");
  assert.equal(captureFinancialSnapshot(risingState, now, base).direction, "rising");
  assert.equal(captureFinancialSnapshot(shelteredState, now, base).direction, "sheltered");
});

test("Journey cash flow excludes transfers and keeps irregular income visible", () => {
  const state = createSeedState();
  state.transactions.unshift({ id: "test-transfer", accountId: "a1", date: new Date().toISOString(), merchant: "Internal transfer", amount: 9999, direction: "income", category: "Income", note: "", status: "cleared", createdManually: true, transfer: true });
  const snapshot = captureFinancialSnapshot(state);
  const expectedIncome = state.transactions.filter((item) => item.direction === "income" && item.status === "cleared" && !item.transfer && Date.now() - new Date(item.date).getTime() <= 30 * 86_400_000).reduce((sum, item) => sum + item.amount, 0);
  assert.equal(snapshot.inflow30, expectedIncome);
  const session = processJourneySession(state);
  assert.ok(session.journey.incomeSources.some((item) => item.name === "Freelance Bounty" && item.reliability === "variable"));
});

test("Idle Vault estimates yield without changing any financial record", () => {
  const state = createSeedState();
  const before = structuredClone({ accounts: state.accounts, investments: state.investments, transactions: state.transactions });
  const reward = calculateIdleReward(state, new Date(Date.now() - 14 * 86_400_000).toISOString());
  assert.ok(reward && reward.total > 0 && reward.starShards > 0);
  assert.ok(reward?.sources.some((item) => item.kind === "interest"));
  assert.ok(reward?.sources.some((item) => item.kind === "dividend"));
  assert.deepEqual({ accounts: state.accounts, investments: state.investments, transactions: state.transactions }, before);
});

test("Journey cadence creates no more than one due chapter and preserves progression", () => {
  const state = createSeedState();
  const now = new Date("2026-07-20T12:00:00.000Z");
  state.journey.lastOpenedAt = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  const first = processJourneySession(state, now);
  const second = processJourneySession(first, new Date(now.getTime() + 60_000));
  assert.equal(first.journey.chapters.length, 1);
  assert.equal(second.journey.chapters.length, 1);
  assert.equal(second.progression.level, state.progression.level);
  const weekly = structuredClone(first);
  weekly.journey.cadence = "weekly";
  const early = processJourneySession(weekly, new Date(now.getTime() + 2 * 86_400_000));
  const due = processJourneySession(weekly, new Date(now.getTime() + 8 * 86_400_000));
  assert.equal(early.journey.chapters.length, 1);
  assert.equal(due.journey.chapters.length, 2);
});

test("market refresh throttle respects the selected stale interval", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  assert.equal(shouldRefreshMarketData(undefined, 24, now), true);
  assert.equal(shouldRefreshMarketData("2026-07-20T00:00:00.000Z", 24, now), false);
  assert.equal(shouldRefreshMarketData("2026-07-18T00:00:00.000Z", 24, now), true);
});
