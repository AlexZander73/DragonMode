# Dragon Mode

**Protect your hoard. Rest easier.**

Dragon Mode is a visual-first fantasy finance mobile MVP. It turns manually mapped balances, spending, recurring costs, savings, projections, purchase decisions, debt, and financial maintenance into a bright dragon-hoard adventure without shame or punishment.

## Built with Codex and GPT-5.6

Dragon Mode was developed with **OpenAI Codex, powered by GPT-5.6, as an active research, design, and engineering collaborator**. The developer set the product vision, requirements, safety boundaries, and creative direction; Codex helped turn that direction into a tested application.

Codex and GPT-5.6 were used to:

- Research financial-tracking patterns, approachable financial education, ethical habit design, idle-game reward loops, gacha safeguards, and story progression.
- Translate the research into product specifications, implementation plans, feature priorities, and dated handoff documentation.
- Build and refine the interface, import and reconciliation tools, calculators, projections, progression systems, story, collections, reminders, and mobile application shells.
- Review user-facing language so Dragon Mode feels kind and clear, never presents itself as a bank, and does not imply that its educational illustrations are financial advice.
- Find and remove placeholder behaviour, improve the guided tutorial and mobile layout, and evaluate confusing or unnecessary interface elements.
- Create automated validation, regression tests, release checks, simulator workflows, technical documentation, and deployment support.

All product decisions, source changes, and releases remain under human direction and review. Codex is a development tool used to create Dragon Mode; it is not a financial adviser and does not provide advice inside the app.

## Included product

- A local-first, no-sign-in financial tracker with one consistent five-tab mobile navigation system.
- Trusted Ledger capture for natural one-line entries, pasted bank rows, CSV, OFX/QFX, and QIF, with staged preview, field confidence, saved mappings, readable cleanup rules, provenance, and defensive file limits.
- Duplicate, pending-to-posted, refund, reused-ID, and imported paired-movement handling that never removes similar movements without the user’s confirmation.
- Reconciliation status, mapped-through dates, visible differences, receipts, original source rows, and exact batch undo.
- A calm daily/weekly/pay-cycle/monthly Hoard Check with at most one daily review, fixed stewardship rewards, no punitive streak, and no wealth-scaled progression.
- Dated Idle Vault interest illustrations split across confirmed balance, rate, promotion, and bonus-condition periods; posted interest is compared separately and dividend yield never appears as spendable cash.
- Thirteen auto-filled Lore calculators covering near-term cash flow, goals, buffers, debt, term deposits, recurring costs, Wishes, compounding, loan-rate changes, projections, and fee drag. Every tool shows inputs, sources, assumptions, exclusions, an official source, and the non-advice boundary.
- Ten permanent Living Atlas Act I chapters, event-driven Personal Chronicle pages, replay/skip/plain-summary controls, six keepers, and optional non-punitive story rhythms.
- Earned-only Relic Constellations with visible odds, fifth-reveal new-item protection, twelfth-reveal choice, Mythic ceiling, Stardust crafting, full reveal history, and permanent seasonal archives. There is no purchase path and cosmetics affect no financial outcome.
- Declared versus transaction-linked goal progress, idempotent XP events, permanent levels/relics/pet bonds, previewable owned skins, and optional weekly rotation.
- Independently configurable, actionable local reminders with quiet hours and generic notification text that excludes financial details.
- A genuinely empty personal vault on first launch, with a skippable live guided setup that can be replayed from Settings without changing records or rewards.
- IndexedDB persistence, schema-v8 migration, complete JSON backup/restore, fresh-start reset, and branded PWA/iOS/Android shells.

## Visual asset libraries

- The reference-parity scene and interface system is documented in [`docs/VISUAL_ASSET_GENERATION_2026-07-22.md`](docs/VISUAL_ASSET_GENERATION_2026-07-22.md).
- The common finance pack provides 128 brand-neutral subscription, purchase, income, and investment icons across eight coordinated atlases. See [`docs/COMMON_FINANCE_ASSET_PACK_2026-07-22.md`](docs/COMMON_FINANCE_ASSET_PACK_2026-07-22.md) and the machine-readable [`manifest.json`](public/art/icon-packs/common-finance/manifest.json).

## Navigation

The reference images contain a few inconsistent bottom bars. The implementation standardises Lair, Hoard, Quests, Scrying, and Treasury everywhere. See `NAVIGATION_NOTES.md` for the complete mapping.

## Local development

```bash
npm install
npm run dev
```

## Validation builds

```bash
npm run release:verify
```

The release gate runs lint, type, domain/fixture, web, rendered-output,
release-contract, mobile, App Store preflight, and (on macOS) unsigned iOS build
stages. See `docs/RELEASE_AUTOMATION_2026-07-21.md` for focused commands,
simulator certification, screenshot capture, and CI details.

## Capacitor

```bash
npm run cap:sync
npx cap open ios
npx cap open android
```

The mobile app stores MVP data locally on the device and does not require sign-in, a backend, or a bank connection. It records what the user enters or imports; it cannot initiate, schedule, send, or receive money.
