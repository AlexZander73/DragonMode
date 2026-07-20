# Dragon Mode iPhone release checklist

## Completed in the project

- iPhone portrait target and Capacitor wrapper
- branded app icon and launch screen
- production metadata and version 1.0 build number 1
- Apple privacy manifest and export-compliance declaration
- local-first onboarding with demo or empty-vault choice
- JSON import/export and schema migration
- reduced motion, text scaling, plain-language hints, haptics, and optional sound
- sparse optional local notifications
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
  demo mode, notifications, export/import, and relaunch persistence.

Android and tablet-specific visual certification are intentionally outside this
iPhone-first release pass.
