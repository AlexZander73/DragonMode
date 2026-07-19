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
  projectScenario,
  searchTransactions,
} from "../app/calculations";
import { createSeedState, normalizeState, SCHEMA_VERSION } from "../app/data";

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
});
