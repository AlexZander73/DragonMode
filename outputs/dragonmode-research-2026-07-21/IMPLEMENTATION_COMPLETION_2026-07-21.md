# DragonMode implementation completion

**Completion date:** 21 July 2026
**Source brief:** `CODEX_HANDOFF_DRAGON_MODE_2026-07-21.md`
**Research companion:** `DRAGON_MODE_PRODUCT_RESEARCH_2026-07-21.md`

## Outcome

The July trust-and-engagement initiative is implemented. DragonMode now makes the healthy action—understanding a locally stored financial record—the source of game progress. Balance size, spending, debt, product choices, and estimated interest do not grant collection advantage.

The 21 July release-readiness follow-up also replaced the separate full-screen
onboarding sequence with a skippable coach over the live product, made the
first launch and retired demo-mode copies financially zero, added replay from
Settings without record or reward loss, removed demo-only events and inactive
custom-debt controls, and consolidated Treasury's duplicate headers into one
compact accessible section switcher.

## Implemented

- Trusted Ledger import domain, migration, natural/paste/CSV/OFX/QFX/QIF parsing, explicit date/sign mapping, confidence, provenance, occurrence-aware duplicate review, manual matching, pending-to-posted lineage, refund context, transfer pairing, reconciliation, receipts, and exact undo.
- Account ledger status, confirmed balance snapshots, imported-through dates, visible reconciliation differences, original source inspection, saved mapping templates, and readable merchant/category rules.
- Daily/weekly/pay-cycle/monthly Hoard Check with a maximum of one daily decision, clean all-clear exit, fixed Return Embers, cadence-capped Lore Keys, idempotent reward IDs, warm returns, and no streak loss.
- Dated Idle Vault segmentation across confirmed balances, cleared movements, rate history, promotions, and bonus status. Posted interest comparison is separate; dividend yield remains explicitly illustrative; estimates mutate no financial or game record.
- Thirteen auto-filled Lore calculators with editable scenario overrides, input provenance, assumptions, exclusions, explanations, official sources, review date, and an explicit information/estimate—not advice—boundary.
- Declared versus transaction-linked goal progress and repeat-safe XP events.
- Ten permanent Act I chapters, event-driven Personal Chronicle templates, content IDs/version/locale/facts/fallback/accessibility metadata, replay, alternate choice, skip, plain summary, and story-disable controls.
- Earned-only Relic Constellations with visible odds, full history, fifth-key-reveal protection inside the targeted set, a three-item twelfth-reveal choice, Mythic ceiling, direct Stardust crafting, non-expiring season archives, and zero financial effects.
- Festival of Echoes presentation and permanent Deep Vault Bloom archive.
- Preview-before-apply dragon colours and Lair themes, optional owned-skin rotation, reduced-motion compatibility, and permanent ownership.
- Separately configurable actionable notifications for imports, uncertainties, expected income, story, weekly/monthly review, rates/maturity, recurring costs, Wishes, pets, and price changes, plus quiet hours. Notification bodies contain no financial details.
- Schema-v8 migration, including one-for-one legacy Star Shards to Stardust, and complete local JSON backup/reset coverage.

## Automated verification

Domain coverage includes financial CRUD/reconciliation, transfers, repeated imports, legitimate identical charges, manual matches, pending-to-posted replacement, reused source IDs, ambiguous mapping blocks, natural paste, import undo, reward idempotency and balance fairness, dated interest boundaries, posted-interest separation, the authored campaign contract, calculator edge scenarios, collection guarantees, migration preservation, and cosmetic isolation from finance data.

The final 21 July 2026 automated release gate passed:

- production build, 2 rendered-shell tests, 5 release-contract tests, and all
  48 domain/import/migration/backup/notification tests;
- ESLint and TypeScript with no errors or warnings;
- mobile production build via `npm run mobile:build`;
- unsigned Xcode build plus fresh-install and relaunch certification on an
  iPhone 17 Pro Simulator;
- live in-app walkthrough at desktop, 390 px, and 320 px widths covering Hoard Check, intentional identical purchases, import receipt and exact undo, story/skip/plain summary, ten-point Act I map, Idle Vault, all calculator cards, collection protections, privacy, notification rhythm, and compact navigation;
- no browser console errors or warnings during the walkthrough.

Vendor, icon, and native chunk separation reduced the mobile main application
chunk from roughly 532 KiB to 332 KiB and removed the earlier chunk-size
warning. Minified CSS remains roughly 143 KiB.

Run the final gate with:

`npm run release:verify`

## Remaining release-only work

No additional product feature is required by this initiative. Automation now
covers representative committed import fixtures, migration/backup logic,
notification routing, unsigned Xcode build, and Simulator fresh install and
relaunch. Before distribution, complete only the physical-device and
owner-authority matrix in `RELEASE_CHECKLIST.md`: redacted provider exports,
VoiceOver/largest text, reduced motion, actual permission/notification
delivery, signed TestFlight migration/backup, iOS archive signing, public URLs,
and final store/legal approval.

Future CDR/Open Banking connectivity remains deliberately out of scope and requires a new legal/privacy/security/accreditation decision before implementation.
