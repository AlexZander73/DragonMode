import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COMMON_FINANCE_ICONS,
  automaticallyChooseFinanceIcon,
  financeIconsForCategory,
  financeIconStyle,
  resolveFinanceIconKey,
} from "../app/common-finance-icons";
import { createEmptyState } from "../app/data";
import { parseStateBackup, serializeStateBackup } from "../app/storage";

test("the local finance pack exposes 128 unique icons across four families", () => {
  assert.equal(COMMON_FINANCE_ICONS.length, 128);
  assert.equal(new Set(COMMON_FINANCE_ICONS.map((icon) => icon.key)).size, 128);
  for (const category of ["subscription", "purchase", "income", "investment"] as const) {
    assert.equal(financeIconsForCategory(category).length, 32);
  }
});

test("the source registry stays identical to the downloadable asset manifest", async () => {
  const source = JSON.parse(await readFile(new URL("../app/common-finance-icons-manifest.json", import.meta.url), "utf8"));
  const publicPack = JSON.parse(await readFile(new URL("../public/art/icon-packs/common-finance/manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(source, publicPack);
});

test("common titles choose specific icons without a network or AI lookup", () => {
  assert.equal(automaticallyChooseFinanceIcon("Netflix monthly", "subscription"), "subscription.video-streaming");
  assert.equal(automaticallyChooseFinanceIcon("Woolworths 1234", "purchase"), "purchase.groceries");
  assert.equal(automaticallyChooseFinanceIcon("ATO tax refund", "income"), "income.tax-refund");
  assert.equal(automaticallyChooseFinanceIcon("Vanguard Australian Shares Index ETF", "investment"), "investment.broad-market-etf");
});

test("automatic matching follows a renamed item while a valid manual choice wins", () => {
  assert.equal(resolveFinanceIconKey("Spotify", "subscription"), "subscription.music-streaming");
  assert.equal(resolveFinanceIconKey("Netflix", "subscription"), "subscription.video-streaming");
  assert.equal(resolveFinanceIconKey("Netflix", "subscription", "subscription.gym", "manual"), "subscription.gym");
  assert.equal(resolveFinanceIconKey("Netflix", "subscription", "purchase.books", "manual"), "subscription.video-streaming");
});

test("atlas styles point to local files and deterministic grid positions", () => {
  assert.deepEqual(financeIconStyle("subscription.video-streaming"), {
    backgroundImage: "url(\"/art/icon-packs/common-finance/subscriptions-core-atlas-v1.png\")",
    backgroundPosition: "0% 0%",
    backgroundSize: "400% 400%",
  });
  assert.equal(financeIconStyle("subscription.dating")?.backgroundPosition, "100% 100%");
});

test("manual icon preferences survive backup and restore", () => {
  const state = createEmptyState();
  state.transactions.push({
    id: "icon-test",
    accountId: "missing-but-preserved",
    date: "2026-07-23T12:00:00.000Z",
    merchant: "Local market",
    amount: 12,
    direction: "expense",
    category: "The Hearth",
    note: "",
    status: "cleared",
    createdManually: true,
    iconKey: "purchase.cafe",
    iconMode: "manual",
  });
  const restored = parseStateBackup(serializeStateBackup(state));
  assert.equal(restored.transactions[0].iconKey, "purchase.cafe");
  assert.equal(restored.transactions[0].iconMode, "manual");
});
