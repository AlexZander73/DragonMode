# Codex handoff — DragonMode 1.0 release completion

**Handoff date:** 21 July 2026
**Repository:** `/Users/azuredreams/Development/DragonMode`
**Release:** iPhone 1.0 (build 1)

## Current state

The product implementation and repeatable local release gate are complete.
First launch is financially empty, the seven-step coach runs over the live app,
the guide can be skipped or replayed without changing records or rewards, demo
restoration is absent, planning and calculator assumptions begin at zero, and
duplicate financial movements always remain reviewable.

Release automation now covers linting, types, production builds, rendered
output, placeholder contracts, import formats, ambiguous mappings, identical
legitimate purchases, exact import undo, schema-v7 migration, JSON backup and
restore, local-notification routing, mobile chunking, App Store metadata, the
iOS icon/privacy manifest, unsigned native builds, and Simulator fresh-install
and relaunch.

## Verified on 21 July 2026

- 48 domain and fixture tests passed;
- 5 release-contract tests passed;
- 2 rendered-output tests passed;
- ESLint and TypeScript passed;
- web and mobile production builds passed;
- the mobile main application chunk fell from roughly 532 KiB to 332 KiB after
  vendor/native chunk separation;
- unsigned Xcode Simulator build passed;
- fresh install and relaunch passed on an iPhone 17 Pro Simulator;
- browser checks passed at 390 × 844 and 320 × 568 with no horizontal overflow,
  unnamed buttons, unlabeled form controls, duplicate IDs, or console warnings;
- replay and skip of guided setup preserved the existing mapped record;
- the previously invalid `$0` comfortable-cost range now genuinely accepts and
  reports zero;
- pet notification taps now route to the pet sanctuary.

## What Codex should do next

No additional feature should be inserted into 1.0 before the owner/device pass.
On the next release session, Codex should:

1. run `npm run release:verify` from a clean checkout;
2. guide or drive the final physical-iPhone matrix without using personal
   financial data in logs or screenshots;
3. capture and inspect the six App Store frames listed in
   `docs/APP_STORE_SUBMISSION_2026-07-21.md`;
4. fill App Store Connect from that submission pack after the owner supplies
   the public URLs and review contact;
5. archive and validate the signed build;
6. stop for explicit owner approval before TestFlight external distribution or
   App Store review submission.

## Human-gated work

Only the owner can truthfully complete Apple agreements, legal/privacy
declarations, contact details, final accessibility judgment, physical-device
permission behaviour, signing/2FA, and final submission approval. A real device
and redacted representative exports are also required to certify OS file
pickers and provider-specific bank files.

## Post-1.0 candidates

Keep these out of the release branch unless separately prioritized:

- authored localization;
- per-Wish photos;
- arbitrary projection date ranges;
- debt drag-reordering after user demand is established;
- deeper route-based application code splitting;
- CDR/Open Banking only after a separate legal, privacy, security, consent, and
  accreditation/intermediary decision.
