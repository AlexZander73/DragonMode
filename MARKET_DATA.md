# Optional market reference data

Dragon Mode remains fully usable with manually entered investment values. A
deployed web build may optionally configure `ALPHA_VANTAGE_API_KEY` on the
server to enable end-of-day quote and declared-dividend refreshes.

Safety boundaries:

- only the validated saved ticker symbol is sent to the provider;
- the key stays in the server environment and is never shipped to iOS;
- the native iOS shell calls the same deployed, CORS-enabled server adapter;
- automatic requests occur only when the user opens the app and a quote is
  older than the selected 24-hour, 2-day, 7-day, or 14-day interval;
- a provider error, rate limit, missing symbol, or offline state leaves the
  saved manual price unchanged;
- prices and yields are reference data, never trading signals;
- real dividends and interest affect balances only after the user records or
  later confirms an actual transaction.

The provider boundary is intentionally small so a different verified service
can replace Alpha Vantage without changing the financial or Journey models.
Google Finance is not scraped because it does not provide a supported public
API for this use.
