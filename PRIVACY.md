# Dragon Mode privacy summary

Dragon Mode 1.0 is a local-first, manual-entry finance app.

## Release data behaviour

- No Dragon Mode account is required.
- No bank, brokerage, or merchant login is requested.
- Financial records are stored in the app's on-device IndexedDB vault.
- Market retrieval is disabled, so the release app makes no market-data calls.
- Notifications are optional, sparse, and requested only after the user enables
  them.
- JSON export happens only after the user taps Export.
- JSON import reads only the file the user explicitly chooses.
- Deleting the app may delete the local vault; users should export before
  changing devices.

The iOS target includes `PrivacyInfo.xcprivacy` declaring no tracking, tracking
domains, collected data transmitted off-device, or app-authored required-reason
API access.

## App Store privacy answers for this release

Based on the current app-authored behaviour, Dragon Mode does not collect data
from the app. Re-check these answers whenever analytics, crash reporting,
accounts, cloud sync, bank connections, or experimental market retrieval are
enabled.

## Financial boundary

Dragon Mode provides organization, reflection, and editable estimates. It does
not place trades, recommend financial products, file taxes, calculate credit
scores, or replace statements and professional advice.
