# DragonMode release automation

**Prepared:** 21 July 2026
**Release target:** DragonMode 1.0 for iPhone

## One-command release gate

Run:

```bash
npm run release:verify
```

On macOS this executes, in order:

1. ESLint;
2. TypeScript;
3. domain, import-fixture, migration, backup, and notification-routing tests;
4. production web build;
5. rendered-output tests;
6. release-contract and placeholder checks;
7. code-split mobile build;
8. App Store metadata/privacy/icon preflight;
9. unsigned iOS Simulator build.

The ignored machine-readable reports are written to `artifacts/release/` so a
local run does not dirty the repository. Linux CI uses
`npm run release:verify -- --no-ios`; a separate macOS job builds the native
target.

## Automated import matrix

Committed fixtures cover:

- CSV with two intentional same-day, same-merchant, same-price purchases;
- ambiguous numeric dates and unsigned amounts that must not commit;
- OFX with stable FITIDs and a repeated-file pass;
- QFX provenance;
- QIF income and expense directions;
- reconciliation and exact batch undo;
- schema-v7 preservation and complete JSON export/import round trip.

Run this faster subset with:

```bash
npm run test:domain
```

## Simulator certification

Run:

```bash
npm run simulator:certify
```

The script builds without signing, selects an available iPhone Simulator,
uninstalls the previous simulator copy, installs a fresh app, launches it,
terminates it, relaunches it, and records local screenshots under
`artifacts/simulator/`.

To capture a currently arranged App Store review frame:

```bash
npm run screenshots:capture -- 01-guided-zero-state
```

Use a descriptive lowercase filename. The screenshot helper intentionally does
not inject demonstration money into the release app. Populate only a separate
simulator vault with clearly fictional or redacted review data when preparing
marketing frames.

## Continuous integration

`.github/workflows/release-verification.yml` runs the full web/domain gate on
Ubuntu and an unsigned native build on macOS for pushes to `main`, pull
requests, and manual dispatches. Verification reports are uploaded even if a
stage fails.

## Human-only boundary

Automation stops before Apple-account authority or subjective approval. A
person must still approve signing, legal/privacy answers, final screenshots,
real-device accessibility and notification behaviour, archive upload, and App
Store submission.
