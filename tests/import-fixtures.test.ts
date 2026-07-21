import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEmptyState, normalizeState, SCHEMA_VERSION, type DragonState, type ImportSourceKind } from "../app/data";
import { commitImportBatch, resolveImportCandidate, stageTextImport, undoImportBatch } from "../app/imports";
import { notificationActionFromEvent } from "../app/native";
import { parseStateBackup, serializeStateBackup } from "../app/storage";

const importFixture = (name: string) => readFile(new URL(`./fixtures/imports/${name}`, import.meta.url), "utf8");
const migrationFixture = (name: string) => readFile(new URL(`./fixtures/migrations/${name}`, import.meta.url), "utf8");

function accountState(balance = 1_000): DragonState {
  const state = createEmptyState();
  state.accounts = [{
    id: "fixture-bank",
    name: "Fixture account",
    type: "transaction",
    balance,
    includedInHoard: true,
    chamberId: "hearth",
    icon: "wallet",
    color: "#123456",
    archived: false,
  }];
  return state;
}

test("representative CSV preserves legitimate same-day duplicates and exact undo", async () => {
  const state = accountState();
  const before = structuredClone({ accounts: state.accounts, chambers: state.chambers, transactions: state.transactions });
  let batch = stageTextImport(state, await importFixture("legitimate-duplicates.csv"), {
    accountId: "fixture-bank",
    sourceKind: "csv",
    dateOrder: "DMY",
    signConvention: "negative-expense",
  });
  assert.equal(batch.rawRowCount, 3);
  assert.equal(batch.candidates.filter((candidate) => candidate.proposedAction === "hold").length, 2);
  for (const candidate of batch.candidates.filter((item) => item.proposedAction === "hold")) {
    batch = resolveImportCandidate(batch, candidate.id, "both-happened");
  }
  const committed = commitImportBatch(state, batch, { closingBalance: 817.5, periodEnd: "2026-07-22T12:00:00.000Z" });
  assert.equal(committed.transactions.length, 3);
  assert.equal(committed.transactions.filter((item) => item.merchant === "Moonfair Pass").length, 2);
  assert.ok(committed.transactions.every((item) => item.rawSourceRow && item.sourceFingerprint));
  assert.equal(committed.imports.reconciliations[0].status, "reconciled");
  const undone = undoImportBatch(committed, batch.id);
  assert.deepEqual({ accounts: undone.accounts, chambers: undone.chambers, transactions: undone.transactions }, before);
});

for (const fixture of [
  { name: "representative.ofx", sourceKind: "ofx", expected: 2 },
  { name: "representative.qfx", sourceKind: "qfx", expected: 1 },
  { name: "representative.qif", sourceKind: "qif", expected: 2 },
] satisfies Array<{ name: string; sourceKind: ImportSourceKind; expected: number }>) {
  test(`${fixture.sourceKind.toUpperCase()} fixture stages, commits, and retains provenance`, async () => {
    const state = accountState();
    const source = await importFixture(fixture.name);
    const batch = stageTextImport(state, source, {
      accountId: "fixture-bank",
      sourceKind: fixture.sourceKind,
      dateOrder: "DMY",
      signConvention: "negative-expense",
    });
    assert.equal(batch.candidates.length, fixture.expected);
    assert.equal(batch.mappingConfirmed, true);
    assert.ok(batch.candidates.every((candidate) => candidate.rawSourceRow.length > 0));
    const committed = commitImportBatch(state, batch);
    assert.equal(committed.transactions.length, fixture.expected);
    assert.ok(committed.transactions.every((transaction) => transaction.origin === "import"));
    if (fixture.sourceKind === "ofx") {
      const repeated = stageTextImport(committed, source, {
        accountId: "fixture-bank",
        sourceKind: fixture.sourceKind,
        dateOrder: "DMY",
        signConvention: "negative-expense",
      });
      assert.ok(repeated.candidates.every((candidate) => candidate.proposedAction === "skip-exact"));
      assert.equal(commitImportBatch(committed, repeated).transactions.length, fixture.expected);
    }
  });
}

test("ambiguous fixture cannot commit until date and sign conventions are explicit", async () => {
  const state = accountState();
  const source = await importFixture("ambiguous-mapping.csv");
  const ambiguous = stageTextImport(state, source, { accountId: "fixture-bank", sourceKind: "csv" });
  assert.equal(ambiguous.mappingConfirmed, false);
  assert.equal(ambiguous.ambiguityWarnings.length, 2);
  assert.throws(() => commitImportBatch(state, ambiguous), /Confirm the import mapping/);
  const confirmed = stageTextImport(state, source, {
    accountId: "fixture-bank",
    sourceKind: "csv",
    dateOrder: "DMY",
    signConvention: "positive-expense",
  });
  assert.equal(confirmed.mappingConfirmed, true);
  assert.ok(commitImportBatch(state, confirmed).transactions.every((item) => item.direction === "expense"));
});

test("static schema-v7 fixture and JSON backup round trip preserve every release-critical domain", async () => {
  const migrated = normalizeState(JSON.parse(await migrationFixture("schema-v7-minimal.json")));
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.equal(migrated.profile.displayName, "Migration Keeper");
  assert.equal(migrated.profile.reducedMotion, true);
  assert.equal(migrated.profile.notificationQuietStart, "20:30");
  assert.equal(migrated.accounts.length, 2);
  assert.equal(migrated.transactions[0].note, "preserve me");
  assert.equal(migrated.goals[0].id, "legacy-goal");
  assert.equal(migrated.pets[0].bondXp, 44);
  assert.deepEqual(migrated.education.completedLoreIds, ["compound-explorer"]);
  assert.equal(migrated.journey.idleRewards[0].id, "legacy-estimate");
  assert.equal(migrated.collection.stardust, 37);
  assert.deepEqual(migrated.progression.storyChoices, { "legacy-choice": "protect" });

  const restored = parseStateBackup(serializeStateBackup(migrated));
  assert.deepEqual(restored, migrated);
  assert.throws(() => parseStateBackup("not-json"), /not valid JSON/);
});

test("every local-notification payload resolves to the intended live screen or record", () => {
  assert.deepEqual(notificationActionFromEvent({ actionId: "used-today", notification: { extra: { subscriptionId: "sub-1" } } }), { type: "subscription-use", subscriptionId: "sub-1" });
  assert.deepEqual(notificationActionFromEvent({ actionId: "open-claimant", notification: { extra: { subscriptionId: "sub-1" } } }), { type: "subscription-open", subscriptionId: "sub-1" });
  assert.deepEqual(notificationActionFromEvent({ actionId: "open-wish", notification: { extra: { wishId: "wish-1" } } }), { type: "wish-open", wishId: "wish-1" });
  assert.deepEqual(notificationActionFromEvent({ actionId: "tap", notification: { extra: { petId: "pet-1" } } }), { type: "open-screen", screen: "pets" });
  assert.deepEqual(notificationActionFromEvent({ actionId: "open-action", notification: { extra: { targetScreen: "import" } } }), { type: "open-screen", screen: "import" });
  assert.equal(notificationActionFromEvent({ actionId: "unknown", notification: { extra: {} } }), null);
});
