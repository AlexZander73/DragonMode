# Dragon Mode iPhone release checklist

## Completed in the project

- iPhone portrait target and Capacitor wrapper
- branded app icon and launch screen
- production metadata and version 1.0 build number 1
- Apple privacy manifest and export-compliance declaration
- local-first onboarding with demo or empty-vault choice
- JSON import/export and schema migration
- Trusted Ledger paste/CSV/OFX/QFX/QIF staging, provenance, reconciliation,
  receipt, and exact undo
- fixed/capped Hoard Check rewards and idempotent progression events
- dated Idle Vault estimates with promotion/balance boundaries and no balance or
  collection-currency mutation
- auto-filled Lore calculators with visible assumptions and non-advice wording
- permanent Act I/Chronicle story and earned-only cosmetic collections
- reduced motion, text scaling, plain-language hints, haptics, and optional sound
- sparse optional local notifications with quiet hours and private generic text
- release market-data retrieval disabled
- domain, rendered HTML, type, lint, web build, and simulator build checks

## Before TestFlight or App Store submission

- In Xcode, confirm the selected personal development team and bundle ID.
- Choose a connected iPhone or Any iOS Device, then Product → Archive.
- Distribute the archive to App Store Connect and complete automatic signing.
- Add App Store screenshots from the final real-iPhone review.
- Complete App Privacy using `PRIVACY.md` and re-check all third-party package
  disclosures in the generated archive.
- Add support URL, privacy-policy URL, age rating, category, and review contact.
- In review notes, explain that all financial values are fictional in demo mode,
  manual in personal mode, stored locally, and not connected to a bank.
- Run a fresh-install TestFlight pass covering onboarding, empty-vault setup,
  demo mode, all notification deep links, JSON backup/restore, and relaunch
  persistence.
- On a real device, import representative CSV, OFX/QFX, and QIF files; confirm
  ambiguous date/sign mappings cannot commit, original rows remain inspectable,
  repeated files add nothing, transfers have zero cash-flow effect, and Undo
  restores the prior ledger.
- Migrate an existing schema-v7 vault and confirm finance records, story, pets,
  settings, estimates, relics, and one-for-one legacy Stardust value remain.
- With VoiceOver and largest text enabled, complete duplicate review,
  reconciliation, one Lore calculator, a story skip, and a cosmetic reveal.
- Confirm reduced motion suppresses reveal/story motion and every randomized
  cosmetic path remains earned-only with visible odds and direct crafting.

Android and tablet-specific visual certification are intentionally outside this
iPhone-first release pass.
