import manifest from "./common-finance-icons-manifest.json";

export type FinanceIconCategory = "subscription" | "purchase" | "income" | "investment";
export type FinanceIconMode = "automatic" | "manual";

export type FinanceIconDefinition = {
  key: string;
  label: string;
  category: FinanceIconCategory;
  sheetId: string;
  file: string;
  column: number;
  row: number;
};

const categories = new Set<FinanceIconCategory>(["subscription", "purchase", "income", "investment"]);

export const COMMON_FINANCE_ICONS: FinanceIconDefinition[] = manifest.sheets.flatMap((sheet) => {
  const category = categories.has(sheet.category as FinanceIconCategory) ? sheet.category as FinanceIconCategory : "purchase";
  return sheet.items.map((item, index) => ({
    ...item,
    category,
    sheetId: sheet.id,
    file: sheet.file,
    column: index % manifest.grid.columns,
    row: Math.floor(index / manifest.grid.columns),
  }));
});

const iconByKey = new Map(COMMON_FINANCE_ICONS.map((icon) => [icon.key, icon]));

export const financeIconsForCategory = (category: FinanceIconCategory) =>
  COMMON_FINANCE_ICONS.filter((icon) => icon.category === category);

export const getFinanceIcon = (key?: string) => key ? iconByKey.get(key) : undefined;

export const financeIconStyle = (key: string) => {
  const icon = getFinanceIcon(key);
  if (!icon) return undefined;
  const x = icon.column === manifest.grid.columns - 1 ? 100 : icon.column * manifest.grid.positionStepPercent;
  const y = icon.row === manifest.grid.rows - 1 ? 100 : icon.row * manifest.grid.positionStepPercent;
  return {
    backgroundImage: `url("/art/icon-packs/common-finance/${icon.file}")`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: manifest.grid.backgroundSize,
  };
};

type MatchRule = { key: string; terms: string[] };

const rules: Record<FinanceIconCategory, MatchRule[]> = {
  subscription: [
    { key: "subscription.video-streaming", terms: ["netflix", "disney plus", "disney+", "stan", "prime video", "amazon prime", "hulu", "binge", "paramount plus", "paramount+", "apple tv", "streaming", "video subscription"] },
    { key: "subscription.music-streaming", terms: ["spotify", "apple music", "youtube music", "tidal", "deezer", "music subscription"] },
    { key: "subscription.gaming", terms: ["game pass", "xbox", "playstation plus", "ps plus", "nintendo online", "steam subscription", "gaming membership"] },
    { key: "subscription.audiobook", terms: ["audible", "audiobook"] },
    { key: "subscription.news", terms: ["newspaper", "news subscription", "substack", "guardian digital", "times digital"] },
    { key: "subscription.cloud-storage", terms: ["icloud", "google drive", "dropbox", "onedrive", "cloud storage"] },
    { key: "subscription.password-manager", terms: ["1password", "lastpass", "bitwarden", "dashlane", "password manager"] },
    { key: "subscription.security", terms: ["norton", "mcafee", "antivirus", "internet security", "device security", "vpn"] },
    { key: "subscription.mobile-phone", terms: ["telstra", "optus", "vodafone", "amaysim", "boost mobile", "mobile plan", "phone plan"] },
    { key: "subscription.home-internet", terms: ["nbn", "broadband", "home internet", "internet plan", "wifi plan"] },
    { key: "subscription.creative-software", terms: ["adobe", "photoshop", "lightroom", "canva", "creative cloud", "creative software"] },
    { key: "subscription.ai-assistant", terms: ["chatgpt", "openai", "claude", "gemini advanced", "copilot pro", "ai assistant"] },
    { key: "subscription.fitness-app", terms: ["strava", "peloton", "fitness app", "workout app"] },
    { key: "subscription.meditation-app", terms: ["headspace", "calm app", "meditation", "mindfulness app"] },
    { key: "subscription.dating", terms: ["tinder", "bumble", "hinge", "eharmony", "dating membership", "dating app"] },
    { key: "subscription.electricity", terms: ["electricity", "energy bill", "power bill", "origin energy", "agl energy", "energex"] },
    { key: "subscription.gas", terms: ["gas bill", "natural gas", "household gas"] },
    { key: "subscription.water", terms: ["water bill", "water utility", "urban utilities"] },
    { key: "subscription.vehicle-insurance", terms: ["car insurance", "vehicle insurance", "motor insurance", "racq insurance"] },
    { key: "subscription.health-insurance", terms: ["health insurance", "medibank", "bupa", "nib health", "hcf"] },
    { key: "subscription.home-insurance", terms: ["home insurance", "renters insurance", "renter insurance", "contents insurance"] },
    { key: "subscription.gym", terms: ["gym", "fitness membership", "anytime fitness", "goodlife", "snap fitness"] },
    { key: "subscription.transit-pass", terms: ["transit pass", "transport pass", "go card", "myki pass", "opal pass"] },
    { key: "subscription.parking", terms: ["parking subscription", "monthly parking", "parking pass"] },
    { key: "subscription.child-care", terms: ["child care", "childcare", "daycare", "after school care"] },
    { key: "subscription.pet-plan", terms: ["pet plan", "pet insurance", "vet plan"] },
    { key: "subscription.meal-kit", terms: ["hellofresh", "marley spoon", "meal kit", "dinnerly"] },
    { key: "subscription.grocery-delivery", terms: ["grocery delivery", "woolworths delivery", "coles delivery"] },
    { key: "subscription.recurring-charity", terms: ["monthly donation", "recurring charity", "regular giving"] },
    { key: "subscription.education", terms: ["coursera", "skillshare", "masterclass", "course membership", "education subscription"] },
    { key: "subscription.professional-membership", terms: ["professional membership", "association dues", "union dues", "membership dues"] },
    { key: "subscription.productivity-software", terms: ["microsoft 365", "office 365", "notion", "todoist", "productivity", "software subscription", "subscription"] },
  ],
  purchase: [
    { key: "purchase.groceries", terms: ["woolworths", "coles", "aldi", "iga", "costco", "supermarket", "grocery", "groceries"] },
    { key: "purchase.cafe", terms: ["cafe", "coffee", "starbucks", "espresso", "bakery"] },
    { key: "purchase.takeaway", terms: ["uber eats", "ubereats", "doordash", "menulog", "takeaway", "food delivery", "mcdonald", "kfc"] },
    { key: "purchase.restaurant", terms: ["restaurant", "bistro", "diner", "grill", "sushi", "pizzeria"] },
    { key: "purchase.fuel", terms: ["petrol", "fuel", "service station", "shell", "ampol", "bp connect", "caltex", "7-eleven fuel"] },
    { key: "purchase.public-transit", terms: ["translink", "transport nsw", "metro fare", "train fare", "bus fare", "public transit", "go card"] },
    { key: "purchase.taxi-rideshare", terms: ["uber trip", "uber ride", "didi", "taxi", "rideshare", "13cabs"] },
    { key: "purchase.pharmacy", terms: ["chemist warehouse", "priceline pharmacy", "pharmacy", "chemist", "prescription"] },
    { key: "purchase.doctor-dental", terms: ["doctor", "medical centre", "clinic", "dentist", "dental", "physio", "optometrist"] },
    { key: "purchase.shoes", terms: ["shoe", "footwear", "sneaker"] },
    { key: "purchase.clothing", terms: ["clothing", "apparel", "fashion", "uniqlo", "kmart clothing", "target clothing"] },
    { key: "purchase.toiletries", terms: ["toiletries", "personal care", "toothpaste", "shampoo"] },
    { key: "purchase.repairs-maintenance", terms: ["repair", "maintenance", "mechanic", "service centre"] },
    { key: "purchase.furniture-homewares", terms: ["ikea", "furniture", "homewares", "mattress"] },
    { key: "purchase.pet-supplies", terms: ["petbarn", "pet supplies", "pet food", "vet"] },
    { key: "purchase.phone-computer", terms: ["iphone", "android phone", "smartphone", "laptop", "computer", "macbook", "tablet"] },
    { key: "purchase.electronics", terms: ["jb hi-fi", "officeworks", "electronics", "headphones", "television", "camera"] },
    { key: "purchase.games", terms: ["steam games", "playstation store", "xbox store", "nintendo eshop", "video game", "board game"] },
    { key: "purchase.books", terms: ["book", "kindle purchase", "booktopia", "dymocks"] },
    { key: "purchase.cinema-concert", terms: ["cinema", "movie ticket", "event cinemas", "concert", "theatre", "ticketek", "ticketmaster"] },
    { key: "purchase.hobbies-crafts", terms: ["craft", "hobby", "spotlight", "art supplies", "model kit"] },
    { key: "purchase.sports-outdoors", terms: ["sports", "outdoor", "camping", "hiking", "rebel sport", "anaconda"] },
    { key: "purchase.hotel", terms: ["hotel", "motel", "airbnb", "accommodation", "resort"] },
    { key: "purchase.travel", terms: ["flight", "airfare", "qantas", "virgin australia", "jetstar", "travel"] },
    { key: "purchase.gift", terms: ["gift", "present", "flowers"] },
    { key: "purchase.charity", terms: ["charity", "donation", "fundraiser"] },
    { key: "purchase.beauty-hair", terms: ["hairdresser", "haircut", "salon", "beauty", "cosmetics", "sephora"] },
    { key: "purchase.bar-alcohol", terms: ["bar tab", "pub", "bottle shop", "liquor", "dan murphy", "alcohol"] },
    { key: "purchase.theme-park-event", terms: ["theme park", "dreamworld", "movieworld", "sea world", "event pass", "festival"] },
    { key: "purchase.vehicle", terms: ["vehicle purchase", "car purchase", "motorbike purchase"] },
    { key: "purchase.home-improvement", terms: ["bunnings", "hardware", "home improvement", "renovation"] },
    { key: "purchase.household-supplies", terms: ["kmart", "big w", "target", "household", "cleaning supplies", "department store"] },
  ],
  income: [
    { key: "income.tax-refund", terms: ["tax refund", "ato refund", "irs refund"] },
    { key: "income.purchase-refund", terms: ["purchase refund", "merchant refund", "card refund", "returned item", "refund"] },
    { key: "income.cashback-rewards", terms: ["cashback", "cash back", "rewards payment", "reward credit"] },
    { key: "income.overtime", terms: ["overtime"] },
    { key: "income.bonus", terms: ["bonus"] },
    { key: "income.commission", terms: ["commission"] },
    { key: "income.tips", terms: ["tips", "gratuity"] },
    { key: "income.hourly-shift", terms: ["shift pay", "hourly pay", "casual pay"] },
    { key: "income.freelance", terms: ["freelance"] },
    { key: "income.contract-project", terms: ["contract pay", "project payment", "project pay"] },
    { key: "income.business-sales", terms: ["business sales", "shop sales", "sales revenue"] },
    { key: "income.side-gig", terms: ["side gig", "doordash pay", "uber driver", "delivery pay"] },
    { key: "income.consulting", terms: ["consulting", "consultant fee"] },
    { key: "income.royalties", terms: ["royalty", "royalties"] },
    { key: "income.creator-revenue", terms: ["youtube revenue", "twitch payout", "creator revenue", "ad revenue", "adsense"] },
    { key: "income.rental", terms: ["rental income", "rent received", "tenant payment"] },
    { key: "income.reimbursement", terms: ["reimbursement", "expense repayment"] },
    { key: "income.government-benefit", terms: ["centrelink", "government benefit", "social security", "benefit payment"] },
    { key: "income.interest", terms: ["interest payment", "interest earned", "bank interest"] },
    { key: "income.dividends", terms: ["dividend", "distribution payment"] },
    { key: "income.capital-gains", terms: ["capital gain", "asset gain"] },
    { key: "income.pension", terms: ["pension", "super pension", "retirement income"] },
    { key: "income.annuity", terms: ["annuity"] },
    { key: "income.insurance-payout", terms: ["insurance payout", "insurance claim"] },
    { key: "income.scholarship-grant", terms: ["scholarship", "research grant", "education grant"] },
    { key: "income.child-support", terms: ["child support"] },
    { key: "income.partner-support", terms: ["partner support", "spousal support", "alimony"] },
    { key: "income.inheritance", terms: ["inheritance", "estate payment"] },
    { key: "income.sold-belongings", terms: ["sold item", "marketplace sale", "sale of belongings"] },
    { key: "income.family-gift", terms: ["family gift", "gift from family"] },
    { key: "income.cash-gift", terms: ["cash gift", "gift money"] },
    { key: "income.salary-wages", terms: ["salary", "wages", "payroll", "pay deposit", "employer pay", "income"] },
  ],
  investment: [
    { key: "investment.high-interest-savings", terms: ["high interest savings", "hisa", "bonus saver", "high yield savings"] },
    { key: "investment.term-deposit", terms: ["term deposit", "certificate of deposit", "fixed deposit"] },
    { key: "investment.government-bond", terms: ["government bond", "treasury bond", "treasury note"] },
    { key: "investment.corporate-bond", terms: ["corporate bond"] },
    { key: "investment.bond-fund", terms: ["bond fund", "fixed income fund"] },
    { key: "investment.broad-market-etf", terms: ["broad market etf", "total market etf", "vanguard australian shares", "vas", "vgs"] },
    { key: "investment.index-fund", terms: ["index fund", "index portfolio"] },
    { key: "investment.mutual-fund", terms: ["mutual fund"] },
    { key: "investment.dividend-stock", terms: ["dividend stock", "income stock"] },
    { key: "investment.property-fund", terms: ["reit", "property fund", "real estate fund"] },
    { key: "investment.residential-property", terms: ["residential property", "rental property", "investment home"] },
    { key: "investment.commercial-property", terms: ["commercial property", "office property", "retail property"] },
    { key: "investment.retirement", terms: ["superannuation", "super fund", "retirement", "401k", "ira", "pension fund"] },
    { key: "investment.managed-portfolio", terms: ["managed portfolio", "robo portfolio", "managed account"] },
    { key: "investment.international-shares", terms: ["international shares", "global shares", "world shares"] },
    { key: "investment.emerging-markets", terms: ["emerging markets"] },
    { key: "investment.small-cap", terms: ["small cap", "small-cap"] },
    { key: "investment.sector-theme", terms: ["sector fund", "thematic fund", "technology fund", "healthcare fund"] },
    { key: "investment.sustainable", terms: ["sustainable", "ethical fund", "esg fund", "green fund"] },
    { key: "investment.precious-metals", terms: ["gold", "silver", "precious metal"] },
    { key: "investment.commodities", terms: ["commodity", "commodities", "oil fund"] },
    { key: "investment.cryptocurrency", terms: ["bitcoin", "ethereum", "crypto", "cryptocurrency"] },
    { key: "investment.venture-startup", terms: ["venture capital", "startup investment", "angel investment"] },
    { key: "investment.private-equity", terms: ["private equity"] },
    { key: "investment.collectibles", terms: ["collectible", "collectibles", "art investment", "trading cards"] },
    { key: "investment.education-fund", terms: ["education fund", "college fund", "529 plan"] },
    { key: "investment.health-savings", terms: ["health savings", "hsa"] },
    { key: "investment.employee-stock", terms: ["employee stock", "esop", "company shares plan"] },
    { key: "investment.options-derivatives", terms: ["option", "options", "derivative", "futures"] },
    { key: "investment.individual-stock", terms: ["stock", "shares", "equity"] },
    { key: "investment.cash", terms: ["cash", "money market"] },
  ],
};

const fallback: Record<FinanceIconCategory, string> = {
  subscription: "subscription.productivity-software",
  purchase: "purchase.household-supplies",
  income: "income.salary-wages",
  investment: "investment.other",
};

const normalizeTitle = (title: string) => ` ${title.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim()} `;

const containsTerm = (title: string, term: string) => {
  const normalizedTerm = normalizeTitle(term).trim();
  return title.includes(` ${normalizedTerm} `);
};

export function automaticallyChooseFinanceIcon(title: string, category: FinanceIconCategory): string {
  const normalized = normalizeTitle(title);
  const match = rules[category].find((rule) => rule.terms.some((term) => containsTerm(normalized, term)));
  return match?.key ?? fallback[category];
}

export function resolveFinanceIconKey(title: string, category: FinanceIconCategory, iconKey?: string, iconMode: FinanceIconMode = "automatic"): string {
  const chosen = getFinanceIcon(iconKey);
  if (iconMode === "manual" && chosen?.category === category) return chosen.key;
  return automaticallyChooseFinanceIcon(title, category);
}
