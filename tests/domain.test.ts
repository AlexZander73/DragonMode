import assert from "node:assert/strict";
import test from "node:test";
import {
  addProgressionXp,
  currentBillingUsage,
  estimateDebtPlan,
  getActiveQuests,
  getHoardSummary,
  getMonthlyFlow,
  monthlySubscriptionAmount,
  monthlyTribute,
  petBondLevel,
  petCareStatus,
  projectScenario,
  searchTransactions,
} from "../app/calculations";
import { createEmptyState, createSeedState, normalizeState, SCHEMA_VERSION } from "../app/data";
import { EXPERIMENTAL_MARKET_DATA } from "../app/constants";
import { calculateIdleReward, captureFinancialSnapshot, createJourneyChapter, EVERGREEN_ACT_ONE, processJourneySession, shouldRefreshMarketData } from "../app/journey";
import { createTransaction, deleteTransaction, replaceTransaction } from "../app/ledger";
import { commitImportBatch, resolveImportCandidate, stageTextImport, undoImportBatch } from "../app/imports";
import { completeHoardCheck, getHoardCheck } from "../app/check-ins";
import { buildCalculatorResults, completeLoreCard, recalculateResult } from "../app/education";
import { archiveSeason, RELIC_ITEMS, revealRelic } from "../app/collection";
import { completeGuidedTutorial, prepareReleaseState, restartGuidedTutorial, setGuidedTutorialStep } from "../app/onboarding";

test("fresh release state is private, guided, and financially zeroed", () => {
  const state = prepareReleaseState(null, new Date("2026-07-21T12:00:00.000Z"));
  const summary = getHoardSummary(state);
  assert.equal(state.profile.dataMode, "personal");
  assert.equal(state.profile.tutorialComplete, false);
  assert.equal(state.profile.onboardingComplete, false);
  assert.equal(state.profile.minimumBuffer, 0);
  assert.equal(state.profile.comfortableMonthlyCost, 0);
  assert.equal(state.profile.essentialMonthlyCost, 0);
  assert.equal(state.profile.lifestyleMonthlyCost, 0);
  assert.deepEqual([state.accounts, state.transactions, state.subscriptions, state.debts, state.goals, state.wishes, state.investments], [[], [], [], [], [], [], []]);
  assert.ok(state.chambers.every((chamber) => chamber.amount === 0 && chamber.target === 0));
  assert.deepEqual(summary, { total: 0, available: 0, committed: 0, guarded: 0, invested: 0, freeGold: 0, freeGoldRaw: 0 });
  assert.equal(state.progression.level, 1);
  assert.equal(state.progression.xp, 0);
  assert.deepEqual(state.progression.relics, []);
  assert.ok(state.pets.every((pet) => pet.bondXp === 0));
  assert.equal(state.journey.currentNode, 0);
  assert.deepEqual(state.journey.snapshots, []);
  assert.deepEqual(state.journey.chapters, []);
});

test("retired demo-mode vaults cannot leak placeholder finances into the release", () => {
  const state = prepareReleaseState(createSeedState(), new Date("2026-07-21T12:00:00.000Z"));
  assert.equal(state.profile.dataMode, "personal");
  assert.equal(state.profile.tutorialComplete, false);
  assert.deepEqual([state.accounts, state.transactions, state.subscriptions, state.debts, state.goals, state.investments], [[], [], [], [], [], []]);
  assert.equal(getHoardSummary(state).total, 0);
});

test("guided setup progress, completion, and replay preserve user records and rewards", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "keeper-account", name: "Everyday", type: "transaction", balance: 42, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123456", archived: false, reconciliationStatus: "reconciled" }];
  state.progression.xp = 37;
  const records = structuredClone(state.accounts);
  const stepped = setGuidedTutorialStep(state, 99);
  assert.equal(stepped.profile.tutorialChapter, 6);
  const completed = completeGuidedTutorial(stepped);
  assert.equal(completed.profile.tutorialComplete, true);
  assert.equal(completed.profile.onboardingComplete, true);
  assert.equal(completed.profile.dataMode, "personal");
  assert.deepEqual(completed.accounts, records);
  assert.equal(completed.progression.xp, 37);
  const replaying = restartGuidedTutorial(completed);
  assert.equal(replaying.profile.tutorialComplete, false);
  assert.equal(replaying.profile.tutorialChapter, 0);
  assert.deepEqual(replaying.accounts, records);
  assert.equal(replaying.progression.xp, 37);
});

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
  assert.ok(progression.relics.includes("Vaultwarden Lantern"));
  assert.ok(progression.milestones.includes("test-milestone"));
});

test("ledger creation, editing, deletion, and transfers reconcile every affected balance", () => {
  const base = createSeedState();
  const expense = {
    id: "ledger-expense",
    accountId: "a1",
    date: "2026-07-20T12:00:00.000Z",
    merchant: "Hearth supplies",
    amount: 25.5,
    direction: "expense" as const,
    category: "The Hearth",
    note: "",
    status: "cleared" as const,
    createdManually: true,
  };
  const created = createTransaction(base, expense);
  assert.equal(created.accounts.find((item) => item.id === "a1")?.balance, 6184.8);
  assert.equal(created.chambers.find((item) => item.id === "hearth")?.amount, 6214.8);

  const edited = { ...expense, amount: 40, direction: "income" as const };
  const replaced = replaceTransaction(created, expense, edited);
  assert.equal(replaced.accounts.find((item) => item.id === "a1")?.balance, 6250.3);
  assert.equal(replaced.chambers.find((item) => item.id === "hearth")?.amount, 6280.3);

  const restored = deleteTransaction(replaced, edited);
  assert.equal(restored.accounts.find((item) => item.id === "a1")?.balance, base.accounts.find((item) => item.id === "a1")?.balance);
  assert.equal(restored.chambers.find((item) => item.id === "hearth")?.amount, base.chambers.find((item) => item.id === "hearth")?.amount);

  const transfer = { ...expense, id: "ledger-transfer", merchant: "Deep Vault transfer", amount: 300, category: "Transfer", transfer: true, transferToAccountId: "a2" };
  const moved = createTransaction(base, transfer);
  assert.equal(moved.accounts.find((item) => item.id === "a1")?.balance, 5910.3);
  assert.equal(moved.accounts.find((item) => item.id === "a2")?.balance, 8150);
  assert.equal(moved.chambers.find((item) => item.id === "hearth")?.amount, 5940.3);
  assert.equal(moved.chambers.find((item) => item.id === "vault")?.amount, 8150);
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

test("schema v7 migration preserves records, settings, story, pets, estimates, and legacy cosmetic value", () => {
  const legacy = createSeedState();
  legacy.schemaVersion = 7;
  legacy.journey.starShards = 37;
  legacy.journey.idleRewards = [{ id: "old-estimate", from: "2026-07-01T00:00:00.000Z", to: "2026-07-02T00:00:00.000Z", estimatedInterest: 1, estimatedDividends: 0, total: 1, starShards: 5, sources: [] }];
  const raw = structuredClone(legacy) as unknown as Record<string, unknown>;
  delete raw.collection;
  delete raw.imports;
  delete raw.checkIns;
  delete raw.education;
  const migrated = normalizeState(raw);
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.transactions.length, legacy.transactions.length);
  assert.equal(migrated.pets.length, legacy.pets.length);
  assert.equal(migrated.profile.reducedMotion, legacy.profile.reducedMotion);
  assert.equal(migrated.journey.idleRewards[0].id, "old-estimate");
  assert.equal(migrated.collection.stardust, 37);
  assert.deepEqual(migrated.progression.relics, legacy.progression.relics);
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
  assert.ok(reward && reward.total > 0 && reward.starShards === 0);
  assert.ok(reward?.sources.some((item) => item.kind === "interest"));
  assert.ok(reward?.sources.some((item) => item.kind === "dividend"));
  assert.deepEqual({ accounts: state.accounts, investments: state.investments, transactions: state.transactions }, before);
});

test("Idle Vault splits promotion boundaries and does not apply the final balance retroactively", () => {
  const from = new Date("2026-07-01T12:00:00.000Z");
  const middle = "2026-07-06T12:00:00.000Z";
  const to = new Date("2026-07-11T12:00:00.000Z");
  const state = createEmptyState();
  state.accounts = [{
    id: "savings", name: "Promo saver", type: "savings", balance: 2000, apy: 3, promotionalApy: 5,
    promotionStart: from.toISOString(), promotionEnd: middle, compounding: "daily", includedInHoard: true,
    chamberId: "vault", icon: "vault", color: "#123", archived: false,
    balanceSnapshots: [{ id: "opening", accountId: "savings", balance: 1000, capturedAt: from.toISOString(), source: "reconciliation", confirmed: true }],
  }];
  state.transactions = [{ id: "deposit", accountId: "savings", date: middle, merchant: "Deposit", amount: 1000, direction: "income", category: "Income", note: "", status: "cleared", createdManually: true }];
  const reward = calculateIdleReward(state, from.toISOString(), to);
  const interest = reward?.sources.find((source) => source.kind === "interest");
  assert.ok(interest && interest.promotionalAmount && interest.promotionalAmount > 0);
  assert.ok((interest?.baseAmount ?? 0) > (interest?.promotionalAmount ?? 0));
  const allHigh = structuredClone(state);
  allHigh.accounts[0].balanceSnapshots = [{ ...allHigh.accounts[0].balanceSnapshots![0], balance: 2000 }];
  allHigh.transactions = [];
  const allHighReward = calculateIdleReward(allHigh, from.toISOString(), to);
  assert.ok((reward?.estimatedInterest ?? 0) < (allHighReward?.estimatedInterest ?? 0));
});

test("posted interest is compared beside an estimate without being duplicated into it", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "saver", name: "Saver", type: "savings", balance: 1005, apy: 5, compounding: "daily", includedInHoard: true, chamberId: "vault", icon: "vault", color: "#123", archived: false, balanceSnapshots: [{ id: "open", accountId: "saver", balance: 1000, capturedAt: "2026-07-01T12:00:00.000Z", source: "reconciliation", confirmed: true }] }];
  state.transactions = [{ id: "interest", accountId: "saver", date: "2026-07-15T12:00:00.000Z", merchant: "Interest payment", amount: 5, direction: "income", category: "Income", note: "", status: "cleared", createdManually: false, origin: "import" }];
  const reward = calculateIdleReward(state, "2026-07-01T12:00:00.000Z", new Date("2026-07-21T12:00:00.000Z"));
  const source = reward?.sources.find((item) => item.id === "interest-saver");
  assert.equal(source?.postedAmount, 5);
  assert.ok(source?.amount && source.amount < 5);
  assert.equal(state.accounts[0].balance, 1005);
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

test("the evergreen campaign has ten permanent authored chapters with accessible content metadata", () => {
  assert.equal(EVERGREEN_ACT_ONE.length, 10);
  assert.equal(new Set(EVERGREEN_ACT_ONE.map((chapter) => chapter.contentId)).size, 10);
  const state = createEmptyState();
  const now = new Date("2026-07-21T12:00:00.000Z");
  const snapshot = captureFinancialSnapshot(state, now);
  const chapter = createJourneyChapter(state, snapshot, now);
  assert.equal(chapter.contentId, "act1-sleeping-door");
  assert.equal(chapter.contentVersion, 1);
  assert.ok(chapter.accessibilitySummary && chapter.fallbackCopy && chapter.replayable);
});

test("market refresh throttle respects the selected stale interval", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  assert.equal(shouldRefreshMarketData(undefined, 24, now), true);
  assert.equal(shouldRefreshMarketData("2026-07-20T00:00:00.000Z", 24, now), false);
  assert.equal(shouldRefreshMarketData("2026-07-18T00:00:00.000Z", 24, now), true);
});

test("trusted import keeps two legitimate identical theme-park passes when confirmed", () => {
  const state = createEmptyState();
  state.accounts = [
    { id: "bank", name: "Daily account", type: "transaction", balance: 1000, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123456", archived: false },
  ];
  const csv = "Date,Description,Amount,Transaction ID\n21/07/2026,Moonfair Pass,-79.00,pass-a\n21/07/2026,Moonfair Pass,-79.00,pass-b";
  let batch = stageTextImport(state, csv, { accountId: "bank", sourceKind: "csv", dateOrder: "DMY" });
  assert.equal(batch.candidates.length, 2);
  assert.ok(batch.candidates.every((candidate) => candidate.proposedAction === "hold"));
  for (const candidate of batch.candidates) batch = resolveImportCandidate(batch, candidate.id, "both-happened");
  const committed = commitImportBatch(state, batch);
  assert.equal(committed.transactions.length, 2);
  assert.equal(committed.imports.batches[0].counts.added, 2);
  assert.equal(committed.accounts[0].balance, 842);
});

test("trusted import skips an exact repeated source and preserves a receipt", () => {
  const state = createEmptyState();
  state.accounts = [
    { id: "bank", name: "Daily account", type: "transaction", balance: 1000, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123456", archived: false },
  ];
  const csv = "Date,Description,Amount,Transaction ID\n20/07/2026,Hearth Market,-45.20,bank-1";
  const first = commitImportBatch(state, stageTextImport(state, csv, { accountId: "bank", sourceKind: "csv" }));
  const repeated = stageTextImport(first, csv, { accountId: "bank", sourceKind: "csv" });
  assert.equal(repeated.candidates[0].proposedAction, "skip-exact");
  const second = commitImportBatch(first, repeated);
  assert.equal(second.transactions.length, 1);
  assert.equal(second.imports.batches[0].counts.skipped, 1);
});

test("trusted import can replace a pending transaction with its posted record", () => {
  const state = createEmptyState();
  state.accounts = [
    { id: "bank", name: "Daily account", type: "transaction", balance: 1000, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123456", archived: false },
  ];
  state.transactions = [{ id: "pending", accountId: "bank", date: "2026-07-20T12:00:00.000Z", merchant: "Copper Kettle", amount: 18, direction: "expense", category: "The Roost", note: "", status: "pending", createdManually: false }];
  const csv = "Date,Description,Amount,Status\n21/07/2026,Copper Kettle,-21.00,Cleared";
  let batch = stageTextImport(state, csv, { accountId: "bank", sourceKind: "csv" });
  assert.equal(batch.candidates[0].lifecycleRelationship, "pending-posted");
  batch = resolveImportCandidate(batch, batch.candidates[0].id, "pending-posted");
  const committed = commitImportBatch(state, batch);
  assert.equal(committed.transactions.length, 1);
  assert.equal(committed.transactions[0].status, "cleared");
  assert.equal(committed.transactions[0].amount, 21);
});

test("trusted import reconciliation remains visible and batch undo is exact", () => {
  const state = createEmptyState();
  state.accounts = [
    { id: "bank", name: "Daily account", type: "transaction", balance: 1000, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123456", archived: false },
  ];
  const before = structuredClone({ accounts: state.accounts, transactions: state.transactions, chambers: state.chambers });
  const csv = "Date,Description,Amount\n21/07/2026,Hearth Market,-45.20";
  const batch = stageTextImport(state, csv, { accountId: "bank", sourceKind: "csv" });
  const committed = commitImportBatch(state, batch, { closingBalance: 954.8, periodEnd: "2026-07-21T12:00:00.000Z" });
  assert.equal(committed.imports.reconciliations[0].status, "reconciled");
  assert.equal(committed.accounts[0].reconciliationStatus, "reconciled");
  const undone = undoImportBatch(committed, batch.id);
  assert.deepEqual({ accounts: undone.accounts, transactions: undone.transactions, chambers: undone.chambers }, before);
  assert.equal(undone.imports.batches[0].status, "undone");
});

test("trusted import blocks ambiguous date and sign defaults until the mapping is explicit", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "bank", name: "Daily", type: "transaction", balance: 100, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false }];
  const source = "Date,Description,Amount\n07/08/2026,Moon Market,25.00";
  const ambiguous = stageTextImport(state, source, { accountId: "bank", sourceKind: "csv" });
  assert.equal(ambiguous.mappingConfirmed, false);
  assert.throws(() => commitImportBatch(state, ambiguous), /Check how these rows were read first/);
  const confirmed = stageTextImport(state, source, { accountId: "bank", sourceKind: "csv", dateOrder: "DMY", signConvention: "positive-expense" });
  assert.equal(confirmed.mappingConfirmed, true);
  assert.equal(commitImportBatch(state, confirmed).transactions[0].direction, "expense");
});

test("universal paste accepts a natural one-line entry and keeps the original wording", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "bank", name: "Daily", type: "transaction", balance: 100, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false }];
  const batch = stageTextImport(state, "I spent $12.50 at Copper Kettle today", { accountId: "bank", sourceKind: "paste", dateOrder: "DMY", signConvention: "negative-expense" });
  assert.equal(batch.candidates[0].direction, "expense");
  assert.equal(batch.candidates[0].amount, 12.5);
  assert.equal(batch.candidates[0].rawSourceRow, "I spent $12.50 at Copper Kettle today");
  assert.ok(batch.candidates[0].fieldConfidence.date < 0.8);
});

test("an imported row can be explicitly matched to a manual movement without double-counting", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "bank", name: "Daily", type: "transaction", balance: 75, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false }];
  state.transactions = [{ id: "manual", accountId: "bank", date: "2026-07-21T12:00:00.000Z", merchant: "Moon Market", amount: 25, direction: "expense", category: "The Hearth", note: "", status: "cleared", createdManually: true, origin: "manual" }];
  let batch = stageTextImport(state, "Date,Description,Amount,Transaction ID\n21/07/2026,Moon Market,-25.00,source-1", { accountId: "bank", sourceKind: "csv", dateOrder: "DMY", signConvention: "negative-expense" });
  batch = resolveImportCandidate(batch, batch.candidates[0].id, "one-is-echo");
  const committed = commitImportBatch(state, batch);
  assert.equal(committed.transactions.length, 1);
  assert.equal(committed.accounts[0].balance, 75);
  assert.equal(committed.imports.batches[0].counts.matched, 1);
  assert.equal(committed.transactions[0].rawSourceRow?.includes("Moon Market"), true);
});

test("two imported account sides form one logical transfer and zero cash-flow income or spending", () => {
  let state = createEmptyState();
  state.accounts = [
    { id: "from", name: "From", type: "transaction", balance: 100, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false },
    { id: "to", name: "To", type: "savings", balance: 200, includedInHoard: true, chamberId: "vault", icon: "vault", color: "#456", archived: false },
  ];
  state = commitImportBatch(state, stageTextImport(state, "Date,Description,Amount\n21/07/2026,Transfer out,-50", { accountId: "from", sourceKind: "csv", dateOrder: "DMY", signConvention: "negative-expense" }));
  let second = stageTextImport(state, "Date,Description,Amount\n21/07/2026,Transfer in,50", { accountId: "to", sourceKind: "csv", dateOrder: "DMY", signConvention: "negative-expense" });
  assert.ok(second.candidates[0].transferCandidateId);
  second = resolveImportCandidate(second, second.candidates[0].id, "confirm-transfer");
  state = commitImportBatch(state, second);
  assert.equal(state.transactions.length, 2);
  assert.ok(state.transactions.every((transaction) => transaction.transfer));
  assert.equal(new Set(state.transactions.map((transaction) => transaction.transferPairId)).size, 1);
  const flow = getMonthlyFlow(state);
  assert.equal(flow.inflow, 0);
  assert.equal(flow.outflow, 0);
});

test("reused source IDs with different movement facts are not silently skipped", () => {
  const state = createEmptyState();
  state.accounts = [{ id: "bank", name: "Daily", type: "transaction", balance: 100, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false }];
  const first = commitImportBatch(state, stageTextImport(state, "Date,Description,Amount,Transaction ID\n20/07/2026,First,-10,reused", { accountId: "bank", sourceKind: "csv", dateOrder: "DMY", signConvention: "negative-expense" }));
  const second = stageTextImport(first, "Date,Description,Amount,Transaction ID\n21/07/2026,Second,-20,reused", { accountId: "bank", sourceKind: "csv", dateOrder: "DMY", signConvention: "negative-expense" });
  assert.notEqual(second.candidates[0].proposedAction, "skip-exact");
});

test("progression reward events are idempotent", () => {
  const state = createEmptyState();
  const once = { ...state, progression: addProgressionXp(state, 10, "same-event") };
  const twice = addProgressionXp(once, 10, "same-event");
  assert.equal(once.progression.xp, 10);
  assert.equal(twice.xp, 10);
});

test("Hoard Check rewards stewardship equally regardless of balance and never punishes absence", () => {
  const small = createEmptyState();
  const large = createEmptyState();
  small.accounts = [{ id: "small", name: "Small", type: "transaction", balance: 10, includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#123", archived: false, reconciliationStatus: "reconciled", importedThrough: "2026-07-20T12:00:00.000Z" }];
  large.accounts = [{ ...small.accounts[0], id: "large", name: "Large", balance: 1_000_000 }];
  const now = new Date("2026-07-21T12:00:00.000Z");
  assert.equal(getHoardCheck(small, now).kind, "daily");
  const smallChecked = completeHoardCheck(small, getHoardCheck(small, now), [], now);
  const largeChecked = completeHoardCheck(large, getHoardCheck(large, now), [], now);
  assert.equal(smallChecked.checkIns.returnEmbers, 1);
  assert.equal(largeChecked.checkIns.returnEmbers, 1);
  assert.equal(smallChecked.progression.xp, largeChecked.progression.xp);
  const repeated = completeHoardCheck(smallChecked, getHoardCheck(smallChecked, now), [], now);
  assert.equal(repeated.checkIns.returnEmbers, 1);
});

test("Lore calculators are auto-filled, editable, explicit about assumptions, and idempotent", () => {
  const state = createSeedState();
  const cards = buildCalculatorResults(state, new Date("2026-07-21T12:00:00.000Z"));
  assert.ok(cards.length >= 13);
  assert.ok(cards.every((card) => card.fields.length && card.assumptions.length && card.exclusions.length && card.sourceUrl.startsWith("https://")));
  const interest = cards.find((card) => card.id === "promotion-cliff")!;
  const original = interest.result;
  const changed = recalculateResult(state, interest, { Balance: 50_000, Rate: 6 });
  assert.notEqual(changed, original);
  const once = completeLoreCard(state, interest.id);
  const twice = completeLoreCard(once, interest.id);
  assert.equal(once.education.completedLoreIds.length, 1);
  assert.equal(twice.checkIns.loreKeys, once.checkIns.loreKeys);
});

test("calculator backlog includes distinct compound, repayment, and rate-change illustrations", () => {
  const state = createSeedState();
  const cards = buildCalculatorResults(state, new Date("2026-07-21T12:00:00.000Z"));
  const compound = cards.find((card) => card.id === "compound-explorer")!;
  const credit = cards.find((card) => card.id === "credit-fixed-payment")!;
  const rateChange = cards.find((card) => card.id === "loan-rate-change")!;
  assert.match(recalculateResult(state, compound, { Principal: 1000, "Annual rate": 0, "Monthly contribution": 100, Years: 1 }), /2,200/);
  assert.match(recalculateResult(state, credit, { Balance: 1000, APR: 0, Minimum: 100, "Extra payment": 100 }), /10 months.*5/);
  assert.notEqual(recalculateResult(state, rateChange, { Balance: 5000, "Current APR": 5, "Scenario APR": 8, "Monthly payment": 250 }), rateChange.result);
});

test("Relic reveals require earned keys and never mutate financial records", () => {
  const state = createSeedState();
  state.checkIns.loreKeys = 0;
  assert.throws(() => revealRelic(state, "targeted", { eventId: "no-key" }), /earned Lore Key/);
  state.checkIns.loreKeys = 1;
  const before = structuredClone({ accounts: state.accounts, transactions: state.transactions, debts: state.debts, investments: state.investments, goals: state.goals });
  const revealed = revealRelic(state, "targeted", { eventId: "earned-key" });
  assert.equal(revealed.checkIns.loreKeys, 0);
  assert.equal(revealed.collection.reveals.length, 1);
  assert.equal(revealed.collection.reveals[0].oddsShown, true);
  assert.deepEqual({ accounts: revealed.accounts, transactions: revealed.transactions, debts: revealed.debts, investments: revealed.investments, goals: revealed.goals }, before);
});

test("Relic protections guarantee a new fifth reveal and a Mythic by the thirtieth", () => {
  const state = createEmptyState();
  state.checkIns.loreKeys = 2;
  state.collection.ownedItemIds = ["echo-lantern"];
  state.collection.pullsSinceNew = 4;
  const fifth = revealRelic(state, "surprise", { setId: "festival-of-echoes", eventId: "fifth-protected" });
  assert.equal(fifth.collection.reveals[0].duplicate, false);
  assert.notEqual(fifth.collection.reveals[0].itemId, "echo-lantern");
  assert.equal(fifth.collection.reveals[0].setId, "festival-of-echoes");
  fifth.collection.pullsSinceMythic = 29;
  const thirtieth = revealRelic(fifth, "targeted", { setId: "festival-of-echoes", eventId: "mythic-protected" });
  assert.equal(thirtieth.collection.reveals[0].rarity, "mythic");
});

test("Stardust crafting is direct, duplicate-free, and archived seasons remain available", () => {
  const state = createEmptyState();
  const item = RELIC_ITEMS.find((candidate) => candidate.id === "vault-bloom")!;
  state.collection.stardust = item.craftCost;
  const crafted = revealRelic(state, "crafted", { setId: item.setId, chosenItemId: item.id, eventId: "direct-craft" });
  assert.ok(crafted.collection.ownedItemIds.includes(item.id));
  assert.equal(crafted.collection.stardust, 0);
  assert.equal(crafted.checkIns.loreKeys, 0);
  assert.throws(() => revealRelic(crafted, "crafted", { setId: item.setId, chosenItemId: item.id, eventId: "duplicate-craft" }), /already/);
  const archived = archiveSeason(crafted, "deep-vault-bloom");
  assert.ok(archived.collection.archivedSeasonIds.includes("deep-vault-bloom"));
  assert.ok(RELIC_ITEMS.some((candidate) => candidate.setId === "deep-vault-bloom"));
});
