# Dragon Mode privacy summary

Dragon Mode 1.0 is a local-first financial tracking app with manual, pasted, and user-chosen file import.

## Release data behaviour

- No Dragon Mode sign-in or user profile is required.
- No bank, brokerage, or merchant login is requested.
- Dragon Mode cannot initiate, schedule, send, receive, or otherwise move money.
- Financial records are stored in the app's on-device IndexedDB vault.
- Pasted text and CSV/OFX/QFX/QIF files are read only after a user action. The original staged source rows, parser settings, import receipts, reconciliation history, and locally saved rules remain in the device vault for provenance and undo.
- Import is defensively limited to 5 MB and 10,000 source lines per batch.
- Market retrieval is disabled, so the release app makes no market-data calls.
- Notifications are optional, sparse, and requested only after the user enables
  them. Their bodies use generic wording and do not include balances, amounts,
  merchants, mapped-balance names, or imported source text.
- JSON export happens only after the user taps Export.
- JSON export covers the complete vault, including imports, reconciliation,
  rules, education, story, and cosmetic history. JSON import reads only the file
  the user explicitly chooses.
- Start fresh and app deletion cover import and collection records along with
  existing finance records. The guided setup never inserts sample finance data.
- Deleting the app may delete the local vault; users should export before
  changing devices.

The iOS target includes `PrivacyInfo.xcprivacy` declaring no tracking, tracking
domains, collected data transmitted off-device, or app-authored required-reason
API access.

## App Store privacy answers for this release

Based on the current app-authored behaviour, Dragon Mode does not collect data
from the app. Re-check these answers whenever analytics, crash reporting,
user profiles, cloud sync, bank connections, or experimental market retrieval are
enabled.

## Financial boundary

Dragon Mode provides organization, reflection, and editable estimates. It does
not place trades, recommend financial products, file taxes, calculate credit
scores, or replace statements and professional advice. Estimated interest and
dividends never alter balances, transactions, cash flow, debt, investment units,
or tax records. Randomized cosmetics are never sold and provide no financial
advantage.
