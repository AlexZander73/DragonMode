import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("release boot path is zero-state and has no demo restoration route", async () => {
  const [page, onboarding, data] = await Promise.all([read("app/page.tsx"), read("app/onboarding.ts"), read("app/data.ts")]);
  assert.match(page, /const cloneInitialState = \(\) => createEmptyState\(\)/);
  assert.doesNotMatch(page, /createSeedState|Restore demo|Reset demo data|Demo hoard restored/);
  assert.match(onboarding, /saved\.profile\.dataMode === "demo" \? createEmptyState\(\) : saved/);
  assert.match(data, /accounts: \[\]/);
  assert.match(data, /collection: \{ \.\.\.seed\.collection, stardust: 0, ownedItemIds: \[\]/);
});

test("guided setup is live, skippable, replayable, and preserves records", async () => {
  const [page, onboarding] = await Promise.all([read("app/page.tsx"), read("app/onboarding.ts")]);
  assert.match(page, /role="region" aria-label="Guided setup"/);
  assert.match(page, />Skip<\/button>/);
  assert.match(page, /Replay guided setup/);
  assert.match(page, /without changing your records/);
  assert.match(onboarding, /restartGuidedTutorial/);
  assert.doesNotMatch(onboarding, /progression|accounts:|transactions:|rewards/);
});

test("manual tracking language and quiet home tools stay intentional", async () => {
  const [page, css] = await Promise.all([read("app/page.tsx"), read("app/globals.css")]);
  const manualMovementForm = page.slice(page.indexOf("function AddTransaction"), page.indexOf("function AddSubscription"));
  assert.match(page, /Map your first balance/);
  assert.match(page, /You enter this balance yourself/);
  assert.match(page, /Your Dragon \{state\.profile\.dragonName\}/);
  assert.doesNotMatch(page, />Add (an |first )?account</i);
  assert.doesNotMatch(page, /Start from zero, on purpose/);
  assert.match(page, /hoard-check-launcher/);
  assert.match(page, /Read a statement/);
  assert.match(page, /Pair as one movement/);
  assert.match(page, /cannot move, send, or schedule money/);
  assert.match(page, /Any real movement happens through your own provider/);
  assert.doesNotMatch(page, /Transfer between mapped balances|Record transfer|Move treasure to the Deep Vault|Confirm transfer/);
  assert.doesNotMatch(manualMovementForm, /transfer/i);
  assert.match(css, /\.mobile-shell\s*\{[^}]*height: 100dvh/s);
  assert.match(css, /\.bottom-nav\s*\{[^}]*inset: auto 0 0/s);
});

test("user-facing copy stays plain and reminder choices cannot overlap", async () => {
  const [page, css] = await Promise.all([read("app/page.tsx"), read("app/globals.css")]);
  assert.match(page, /Choose only the reminders that help/);
  assert.match(page, /Backups and reset/);
  assert.match(page, /Statement helper/);
  assert.doesNotMatch(page, /Local-first records|Privacy at a glance|release candidate|Release mode|market-data calls|System permission|parser confidence|Imported source and provenance|Export complete JSON backup|Import JSON backup/);
  assert.match(css, /\.notification-list\s*\{[^}]*display: grid/s);
  assert.match(css, /\.notification-choice\s*\{[^}]*display: grid[^}]*grid-template-columns: 20px minmax\(0, 1fr\)/s);
});

test("keyboard, motion, text, and semantic accessibility contracts remain present", async () => {
  const [page, css, layout, mobile] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/layout.tsx"),
    read("mobile/index.html"),
  ]);
  assert.match(layout, /<html lang="en">/);
  assert.match(mobile, /viewport-fit=cover/);
  assert.match(page, /role="dialog" aria-modal="true" aria-labelledby="modal-title"/);
  assert.match(page, /event\.key !== "Tab"/);
  assert.match(page, /last\.focus\(\)/);
  assert.match(page, /previouslyFocused\?\.focus\(\)/);
  assert.match(page, /role="switch"/);
  assert.match(page, /aria-current=/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.reduce-motion \*/);
  assert.match(css, /--font-scale/);
});

test("release metadata, local-only privacy, and non-advice boundaries are explicit", async () => {
  const [packageJson, plist, privacyManifest, privacy, capacitor] = await Promise.all([
    read("package.json"),
    read("ios/App/App/Info.plist"),
    read("ios/App/App/PrivacyInfo.xcprivacy"),
    read("PRIVACY.md"),
    read("capacitor.config.ts"),
  ]);
  assert.equal(JSON.parse(packageJson).version, "1.0.0");
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  assert.match(plist, /UIInterfaceOrientationPortrait/);
  assert.match(privacyManifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(privacy, /does not collect data\s+from the app/i);
  assert.match(privacy, /does\s+not place trades/i);
  assert.match(privacy, /cannot initiate, schedule, send, receive, or otherwise move money/i);
  assert.match(capacitor, /appId: "app\.dragonmode\.mobile"/);
});

test("starter and implementation placeholders are absent from shipped surfaces", async () => {
  const shipped = (await Promise.all([
    read("app/page.tsx"),
    read("app/layout.tsx"),
    read("app/globals.css"),
    read("mobile/index.html"),
    read("README.md"),
  ])).join("\n");
  assert.doesNotMatch(shipped, /TODO|FIXME|Lorem ipsum|Your site is taking shape|Building your site|Restore the demo hoard|Reset demo data/i);
});
