# DragonMode 1.0 App Store submission pack

**Prepared:** 21 July 2026
**Bundle ID:** `app.dragonmode.mobile`
**Version/build:** 1.0 (1)
**Primary category draft:** Finance

## Store copy draft

### Name

DragonMode

### Subtitle

Protect your hoard. Rest easier.

### Promotional text

Turn a calm look at your finances into an encouraging fantasy adventure—with
tracking you control, forgiving check-ins, useful estimates, and no bank login.

### Description

DragonMode is a kind financial tracker built to make checking in feel
approachable.

Map the balances and movements that matter to you, paste or import a statement,
check each row before saving, and see recurring costs, goals, debt, savings
estimates, and patterns without shame or pressure.

Your Lair grows through healthy stewardship—not wealth, spending, debt, or
financial-product choices. Optional stories, companions, permanent seasonal
collections, and earned cosmetic reveals make returning enjoyable. There are
no paid pulls, punitive streaks, or lost progress.

DragonMode includes editable educational calculators and dated interest
illustrations. Inputs, assumptions, exclusions, and sources remain visible.
These tools provide information and estimates, not financial advice.

DragonMode asks for no sign-in or bank login. Save a backup before changing
devices or deleting the app. DragonMode records only what you enter or import;
it cannot initiate, schedule, send, or receive money.

### Keywords draft

budget,finance,tracker,savings,debt,expenses,goals,interest,local,private

## Review notes

DragonMode is a manual/local financial tracker. Every financial value begins at
zero and is entered, pasted, or imported by the reviewer. The app does not
connect to a bank, request financial credentials, place trades, move money,
recommend products, or retrieve market data in release mode.

The optional Relic Constellations reveal system uses only earned in-app keys.
Keys and Stardust cannot be purchased, watched for ads, exchanged for money, or
derived from mapped balances, spending, debt, or estimated interest. Odds and
guarantees are visible, direct crafting is available, and cosmetics affect no
financial outcome.

To replay the live guide: Treasury → Settings → Replay guided setup. To erase
the test data: Treasury → Settings → Start fresh at zero. Backup and restore are
in the Backups and reset section.

## App Privacy draft

Select the equivalent of **Data Not Collected** for the current app-authored
release behaviour. The implementation has no analytics, advertising, sign-in,
cloud-sync, bank-connection, crash-reporting, or enabled market-data service.
Reconcile this answer against the final generated archive before submission.

The authoritative implementation summary is `PRIVACY.md`; the iOS target also
contains `PrivacyInfo.xcprivacy` with tracking disabled and no app-authored
collected-data declarations.

## Screenshot sequence

Use final, legible iPhone frames in this order:

1. first-run Lair with the live “Let’s map one thing together” guide;
2. Trusted Ledger preview showing original rows and calm duplicate review;
3. Lair after a small fictional/redacted vault has been mapped;
4. Idle Vault with a dated promotion boundary and estimate wording;
5. an auto-filled Lore calculator with assumptions and exclusions visible;
6. optional Living Atlas or earned Relic Constellations story frame.

Never use real financial identifiers, real bank branding, identifiable merchants, or
personal financial values in marketing screenshots. Use the committed fixture
merchants or a separately prepared fictional simulator vault.

## Owner-provided portal values

The owner must supply and verify these rather than allowing Codex to invent
them:

- a live HTTPS support URL;
- a live HTTPS privacy-policy URL containing the current `PRIVACY.md` content;
- review contact name, phone number, and email;
- final age-rating questionnaire responses;
- category and regional availability;
- copyright holder;
- App Store agreements, pricing, and tax/banking status where applicable.

## Final submission gate

- Run `npm run release:verify` from the exact source revision being archived.
- Confirm `npm run audit:production` reports zero known vulnerabilities.
- Run `npm run simulator:certify` and inspect both images.
- Complete the physical-iPhone matrix in `RELEASE_CHECKLIST.md`.
- Run `npm run appstore:preflight`; warnings should be limited to owner-gated
  screenshots or portal values.
- Archive in Xcode with the selected Apple Developer team.
- Inspect the archive privacy report and validate the upload.
- Require the owner’s explicit approval before submitting for review.
