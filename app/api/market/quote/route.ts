const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

type QuotePayload = Record<string, unknown>;

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const validSymbol = (value: string) => /^[A-Z0-9.^:-]{1,20}$/i.test(value);

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!validSymbol(symbol)) return Response.json({ error: "Enter a valid market symbol." }, { status: 400, headers: CORS_HEADERS });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "Verified market refresh is not configured yet.",
      code: "provider_not_configured",
      provider: "Alpha Vantage",
    }, { status: 503, headers: CORS_HEADERS });
  }

  const quoteUrl = new URL(ALPHA_VANTAGE_URL);
  quoteUrl.searchParams.set("function", "GLOBAL_QUOTE");
  quoteUrl.searchParams.set("symbol", symbol);
  quoteUrl.searchParams.set("apikey", apiKey);
  const dividendUrl = new URL(ALPHA_VANTAGE_URL);
  dividendUrl.searchParams.set("function", "DIVIDENDS");
  dividendUrl.searchParams.set("symbol", symbol);
  dividendUrl.searchParams.set("apikey", apiKey);

  try {
    const [quoteResponse, dividendResponse] = await Promise.all([
      fetch(quoteUrl, { headers: { Accept: "application/json" } }),
      fetch(dividendUrl, { headers: { Accept: "application/json" } }),
    ]);
    if (!quoteResponse.ok) throw new Error(`Quote provider returned ${quoteResponse.status}`);
    const quotePayload = await quoteResponse.json() as QuotePayload;
    const dividendPayload = dividendResponse.ok ? await dividendResponse.json() as QuotePayload : {};
    const providerMessage = quotePayload.Note ?? quotePayload.Information ?? quotePayload["Error Message"];
    if (providerMessage) return Response.json({ error: String(providerMessage), provider: "Alpha Vantage" }, { status: 429, headers: CORS_HEADERS });
    const quote = quotePayload["Global Quote"] as Record<string, unknown> | undefined;
    const price = numeric(quote?.["05. price"]);
    if (!quote || price <= 0) return Response.json({ error: "No verified quote was returned for that symbol.", provider: "Alpha Vantage" }, { status: 404, headers: CORS_HEADERS });

    const rows = Array.isArray(dividendPayload.data) ? dividendPayload.data as Array<Record<string, unknown>> : [];
    const oneYearAgo = Date.now() - 365 * 86_400_000;
    const trailingDividend = rows.filter((row) => {
      const date = String(row.ex_dividend_date ?? row.ex_dividend ?? "");
      return new Date(date).getTime() >= oneYearAgo;
    }).reduce((sum, row) => sum + numeric(row.amount), 0);
    const nextDividend = rows.filter((row) => {
      const date = String(row.ex_dividend_date ?? row.ex_dividend ?? "");
      return new Date(date).getTime() > Date.now();
    }).sort((a, b) => new Date(String(a.ex_dividend_date ?? a.ex_dividend)).getTime() - new Date(String(b.ex_dividend_date ?? b.ex_dividend)).getTime())[0];

    return Response.json({
      symbol,
      price,
      previousClose: numeric(quote["08. previous close"]),
      changePercent: String(quote["10. change percent"] ?? "").replace("%", ""),
      latestTradingDay: String(quote["07. latest trading day"] ?? ""),
      dividendYield: trailingDividend > 0 ? trailingDividend / price * 100 : 0,
      nextDividendDate: nextDividend ? String(nextDividend.ex_dividend_date ?? nextDividend.ex_dividend ?? "") : null,
      provider: "Alpha Vantage",
      refreshedAt: new Date().toISOString(),
      freshness: "End-of-day by default; not a trading quote.",
    }, { headers: { ...CORS_HEADERS, "Cache-Control": "private, max-age=3600, stale-while-revalidate=82800" } });
  } catch {
    return Response.json({ error: "The verified market source could not be reached. Your saved value was not changed.", provider: "Alpha Vantage" }, { status: 502, headers: CORS_HEADERS });
  }
}
