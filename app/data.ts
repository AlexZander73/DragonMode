export type Chamber = {
  id: string;
  name: string;
  practicalName: string;
  amount: number;
  target: number;
  color: string;
  icon: string;
  type: "essential" | "savings" | "flexible" | "investment" | "recurring" | "goal" | "debt";
  sortOrder: number;
};

export type Account = {
  id: string;
  name: string;
  type: "cash" | "transaction" | "savings" | "credit" | "loan" | "investment" | "asset";
  balance: number;
  availableBalance?: number;
  institutionName?: string;
  creditLimit?: number;
  interestRate?: number;
  apy?: number;
  compounding?: "daily" | "monthly" | "annual";
  promotionalApy?: number;
  promotionStart?: string;
  promotionEnd?: string;
  includedInHoard: boolean;
  chamberId: string;
  icon: string;
  color: string;
  archived: boolean;
};

export type WorthRating = "Absolutely" | "Mostly" | "Neutral" | "Probably not" | "Regret it";

export type Transaction = {
  id: string;
  accountId: string;
  date: string;
  merchant: string;
  amount: number;
  direction: "income" | "expense";
  category: string;
  recurringSeriesId?: string;
  note: string;
  status: "pending" | "cleared";
  unusual?: boolean;
  duplicate?: boolean;
  duplicateOf?: string;
  reviewedAt?: string;
  worthRating?: WorthRating;
  createdManually: boolean;
  transfer?: boolean;
  incomeSourceId?: string;
};

export type UsageEvent = {
  id: string;
  usedAt: string;
  quantity: number;
  source: "manual" | "shortcut" | "reminder";
  note?: string;
};

export type SubscriptionCadence = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual";

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cadence: SubscriptionCadence;
  nextCharge: string;
  categoryId: string;
  accountId: string;
  usageCount: number;
  usageEvents: UsageEvent[];
  lastUsed: string | null;
  priceHistory: Array<{ amount: number; changedAt: string }>;
  priceChange?: number;
  trackingMode: "every-use" | "weekly" | "monthly" | "off";
  valueRating: WorthRating | "Not rated";
  cancellationNotes: string;
  reminderDays: number;
  reminderEnabled: boolean;
  usageQuestDays: number;
  questEnabled: boolean;
  trialEndDate?: string;
  color: string;
  glyph: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  reason: string;
  category: "Guard" | "Grow" | "Learn" | "Tend";
  difficulty: "Small" | "Medium";
  estimatedMinutes: number;
  xp: number;
  progress?: string;
  completed: boolean;
  completedAt?: string;
  dismissedAt?: string;
  snoozedUntil?: string;
  relatedEntityId?: string;
  generatedAt: string;
  icon: string;
};

export type Debt = {
  id: string;
  name: string;
  balance: number;
  principal: number;
  apr: number;
  minimum: number;
  nextDue: string;
  progress: number;
  strategyOrder: number;
  targetExtraPayment: number;
  icon: string;
};

export type Wish = {
  id: string;
  name: string;
  price: number;
  restDays: number;
  endsAt: string;
  category: string;
  desiredDate: string;
  fundingSource: string;
  reason: string;
  status: "resting" | "claimed" | "saved" | "released";
  finalWorthRating?: WorthRating;
};

export type InvestmentPosition = {
  id: string;
  accountId: string;
  name: string;
  type: "fund" | "shares" | "retirement" | "cash" | "other";
  units: number;
  unitPrice: number;
  contributions: number;
  annualReturnAssumption: number;
  ticker?: string;
  marketPrice?: number;
  quoteCurrency?: string;
  quoteSource?: "manual" | "alpha-vantage";
  lastQuoteAt?: string;
  dividendYield?: number;
  dividendFrequency?: "monthly" | "quarterly" | "half-yearly" | "annual" | "irregular";
  nextDividendDate?: string;
  note: string;
  updatedAt: string;
};

export type ProjectionScenario = {
  expectedMonthlyIncome: number;
  essentialSpending: number;
  flexibleSpending: number;
  subscriptionChange: number;
  debtExtraPayment: number;
  savingsContribution: number;
  investmentContribution: number;
  oneOffPurchase: number;
};

export type NotificationPreferences = {
  claimants: boolean;
  wishes: boolean;
  weeklyReview: boolean;
  priceChanges: boolean;
};

export type PetCadence = "daily" | "weekly" | "monthly";

export type Pet = {
  id: string;
  name: string;
  species: string;
  cadence: PetCadence;
  lastInteraction: string;
  bondXp: number;
  mood: "bright" | "waiting" | "resting";
  asset: string;
  color: string;
};

export type JourneyDirection = "rising" | "steady" | "sheltered";
export type IncomeKind = "salary" | "contract" | "commission" | "business" | "interest" | "dividend" | "gift" | "other";
export type IncomeCadence = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual" | "irregular";

export type IncomeSource = {
  id: string;
  name: string;
  kind: IncomeKind;
  cadence: IncomeCadence;
  expectedAmount: number;
  reliability: "steady" | "variable" | "seasonal";
  lastSeenAt?: string;
};

export type FinancialSnapshot = {
  id: string;
  capturedAt: string;
  assets: number;
  debt: number;
  netWorth: number;
  inflow30: number;
  outflow30: number;
  direction: JourneyDirection;
  change: number;
};

export type JourneyChapter = {
  id: string;
  dayKey: string;
  createdAt: string;
  direction: JourneyDirection;
  title: string;
  speaker: string;
  opening: string;
  ending: string;
  choices: string[];
  selectedChoice?: string;
  completedAt?: string;
  actionTitle: string;
  actionDescription: string;
  actionCategory: Quest["category"];
  goalCompletedAt?: string;
};

export type IdleRewardSource = {
  id: string;
  label: string;
  kind: "interest" | "dividend";
  amount: number;
};

export type IdleReward = {
  id: string;
  from: string;
  to: string;
  estimatedInterest: number;
  estimatedDividends: number;
  total: number;
  starShards: number;
  sources: IdleRewardSource[];
  claimedAt?: string;
};

export type JourneyAvatar = {
  id: string;
  name: string;
  role: string;
  pronouns: string;
  trait: string;
  asset: string;
  color: string;
};

export type DragonState = {
  schemaVersion: number;
  profile: {
    displayName: string;
    title: string;
    dragonName: string;
    selectedDragonColor: string;
    selectedLairTheme: string;
    reducedMotion: boolean;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    notificationsEnabled: boolean;
    notificationPreferences: NotificationPreferences;
    plainLanguage: boolean;
    fontScale: number;
    tutorialComplete: boolean;
    tutorialChapter: number;
    preferredCurrency: string;
    locale: string;
    minimumBuffer: number;
    comfortableMonthlyCost: number;
    essentialMonthlyCost: number;
    lifestyleMonthlyCost: number;
    selectedPetId: string;
  };
  chambers: Chamber[];
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  quests: Quest[];
  debts: Debt[];
  wishes: Wish[];
  investments: InvestmentPosition[];
  pets: Pet[];
  journey: {
    enabled: boolean;
    selectedAvatarId: string;
    cadence: "daily" | "weekly" | "pay-cycle";
    comparisonDays: number;
    stabilityPercent: number;
    lastOpenedAt: string;
    lastSnapshotAt: string;
    currentNode: number;
    snapshots: FinancialSnapshot[];
    chapters: JourneyChapter[];
    incomeSources: IncomeSource[];
    idleRewards: IdleReward[];
    starShards: number;
    marketAutoRefresh: boolean;
    marketRefreshHours: number;
    lastMarketRefreshAt?: string;
  };
  projections: {
    rangeMonths: number;
    activeScenario: string;
    scenarios: Record<string, ProjectionScenario>;
  };
  progression: {
    level: number;
    xp: number;
    nextLevelXp: number;
    title: string;
    relics: string[];
    unlockedCosmetics: string[];
    completedQuestCount: number;
    milestones: string[];
    storyChoices: Record<string, string>;
  };
  updatedAt: string;
};

export const SCHEMA_VERSION = 5;

export const JOURNEY_AVATARS: JourneyAvatar[] = [
  { id: "asha", name: "Asha Emberwright", role: "Forge-mage", pronouns: "she/her", trait: "Turns small, steady actions into durable tools.", asset: "/journey/avatar-asha-v1.png", color: "#d87a3d" },
  { id: "kael", name: "Kael Windmere", role: "Wind cartographer", pronouns: "he/him", trait: "Finds a workable route when income changes direction.", asset: "/journey/avatar-kael-v1.png", color: "#397fca" },
  { id: "bramble", name: "Bramble Stoneheart", role: "Vault archivist", pronouns: "she/her", trait: "Remembers every victory, especially the quiet ones.", asset: "/journey/avatar-bramble-v1.png", color: "#8c56b8" },
  { id: "sol", name: "Sol Arden", role: "Celestial navigator", pronouns: "they/them", trait: "Reads long horizons without losing sight of today.", asset: "/journey/avatar-sol-v1.png", color: "#5268bd" },
  { id: "pip", name: "Pip Reedwhistle", role: "Ledger-bard", pronouns: "they/them", trait: "Makes irregular income feel visible and worth celebrating.", asset: "/journey/avatar-pip-v1.png", color: "#4d9b67" },
  { id: "mara", name: "Mara Ironroot", role: "Bridge-keeper", pronouns: "she/her", trait: "Repairs the next safe step without judging the storm.", asset: "/journey/avatar-mara-v1.png", color: "#b98635" },
];

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const usageEvents = (count: number, intervalDays: number): UsageEvent[] => Array.from({ length: count }, (_, index) => ({
  id: `seed-use-${count}-${index}`,
  usedAt: daysAgo(index * intervalDays),
  quantity: 1,
  source: "manual",
}));

const quest = (input: Partial<Quest> & Pick<Quest, "id" | "title" | "description" | "category" | "xp" | "icon">): Quest => ({
  reason: input.description,
  difficulty: "Small",
  estimatedMinutes: 2,
  completed: false,
  generatedAt: new Date().toISOString(),
  ...input,
});

export const createSeedState = (): DragonState => ({
  schemaVersion: SCHEMA_VERSION,
  profile: {
    displayName: "Avery",
    title: "Hoardkeeper",
    dragonName: "Moss",
    selectedDragonColor: "Emerald",
    selectedLairTheme: "Sky Vault",
    reducedMotion: false,
    soundEnabled: false,
    hapticsEnabled: true,
    notificationsEnabled: false,
    notificationPreferences: { claimants: true, wishes: true, weeklyReview: false, priceChanges: true },
    plainLanguage: false,
    fontScale: 1,
    tutorialComplete: false,
    tutorialChapter: 0,
    preferredCurrency: "AUD",
    locale: "en-AU",
    minimumBuffer: 1200,
    comfortableMonthlyCost: 1706.5,
    essentialMonthlyCost: 1296,
    lifestyleMonthlyCost: 3240,
    selectedPetId: "cinder",
  },
  chambers: [
    { id: "hearth", name: "The Hearth", practicalName: "Everyday living", amount: 6240.3, target: 6800, color: "#ef4b24", icon: "flame", type: "essential", sortOrder: 0 },
    { id: "vault", name: "Deep Vault", practicalName: "Emergency fund", amount: 7850, target: 10000, color: "#0e6fce", icon: "vault", type: "savings", sortOrder: 1 },
    { id: "workshop", name: "Workshop", practicalName: "Projects & tools", amount: 2310.45, target: 3000, color: "#7542c8", icon: "hammer", type: "goal", sortOrder: 2 },
    { id: "roost", name: "The Roost", practicalName: "Fun & lifestyle", amount: 1245.78, target: 1500, color: "#dd3281", icon: "heart", type: "flexible", sortOrder: 3 },
    { id: "sleep", name: "Long Sleep", practicalName: "Investments & retirement", amount: 8650.22, target: 12000, color: "#27963c", icon: "sprout", type: "investment", sortOrder: 4 },
    { id: "tribute", name: "Tribute Hall", practicalName: "Bills & subscriptions", amount: 1102.6, target: 1400, color: "#c58a18", icon: "scroll", type: "recurring", sortOrder: 5 },
    { id: "wish", name: "Wish Vault", practicalName: "Future goals", amount: 1051.3, target: 1600, color: "#00a7b9", icon: "star", type: "goal", sortOrder: 6 },
  ],
  accounts: [
    { id: "a1", name: "Daily Gold", type: "transaction", balance: 6210.3, availableBalance: 6210.3, institutionName: "Sky Vault Credit Union", includedInHoard: true, chamberId: "hearth", icon: "wallet", color: "#e99a26", archived: false },
    { id: "a2", name: "Deep Vault Reserve", type: "savings", balance: 7850, institutionName: "Sky Vault Credit Union", apy: 4.75, compounding: "daily", promotionalApy: 5.2, promotionStart: daysAgo(30), promotionEnd: daysFromNow(60), includedInHoard: true, chamberId: "vault", icon: "vault", color: "#2377ca", archived: false },
    { id: "a3", name: "Long Sleep Fund", type: "investment", balance: 8650.22, institutionName: "Northstar", includedInHoard: true, chamberId: "sleep", icon: "sprout", color: "#2a9b54", archived: false },
    { id: "a4", name: "Ember Card", type: "credit", balance: -2310, availableBalance: 1690, creditLimit: 4000, interestRate: 22.49, institutionName: "Ember Bank", includedInHoard: true, chamberId: "tribute", icon: "card", color: "#d85836", archived: false },
  ],
  transactions: [
    { id: "t1", accountId: "a1", date: daysAgo(1), merchant: "Skyforge Payroll", amount: 3240, direction: "income", category: "Income", note: "Fortnightly pay", status: "cleared", createdManually: false },
    { id: "t2", accountId: "a1", date: daysAgo(1), merchant: "Hearth Market", amount: 86.42, direction: "expense", category: "The Hearth", note: "Groceries", status: "cleared", createdManually: false },
    { id: "t3", accountId: "a1", date: daysAgo(2), merchant: "Copper Kettle", amount: 18.7, direction: "expense", category: "The Roost", note: "Coffee with a friend", status: "cleared", worthRating: "Absolutely", createdManually: false },
    { id: "t4", accountId: "a1", date: daysAgo(3), merchant: "Moonlit Cinema", amount: 14.99, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s4", note: "Monthly plan", status: "cleared", createdManually: false },
    { id: "t5", accountId: "a1", date: daysAgo(4), merchant: "Unknown Rune Shop", amount: 79.5, direction: "expense", category: "Uncategorised", note: "", status: "cleared", unusual: true, createdManually: false },
    { id: "t6", accountId: "a1", date: daysAgo(5), merchant: "Lair Energy", amount: 87.12, direction: "expense", category: "The Hearth", note: "Electricity", status: "cleared", createdManually: false },
    { id: "t7", accountId: "a1", date: daysAgo(6), merchant: "CloudQuill", amount: 12, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s3", note: "", status: "cleared", createdManually: false },
    { id: "t8", accountId: "a1", date: daysAgo(7), merchant: "EmberGym", amount: 29, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s5", note: "", status: "cleared", createdManually: false },
    { id: "t9", accountId: "a1", date: daysAgo(8), merchant: "Arcane Books", amount: 45.2, direction: "expense", category: "Workshop", note: "Reference book", status: "cleared", worthRating: "Mostly", createdManually: false },
    { id: "t10", accountId: "a1", date: daysAgo(9), merchant: "Dragonfruit Grocer", amount: 124.65, direction: "expense", category: "The Hearth", note: "Groceries", status: "cleared", createdManually: false },
    { id: "t11", accountId: "a1", date: daysAgo(10), merchant: "Songbird Plus", amount: 10.99, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s2", note: "", status: "cleared", createdManually: false },
    { id: "t12", accountId: "a1", date: daysAgo(11), merchant: "Roost Café", amount: 9.8, direction: "expense", category: "The Roost", note: "Quick lunch", status: "cleared", worthRating: "Neutral", createdManually: false },
    { id: "t13", accountId: "a1", date: daysAgo(12), merchant: "Deep Vault Transfer", amount: 100, direction: "expense", category: "Deep Vault", note: "Monthly buffer", status: "cleared", createdManually: false, transfer: true },
    { id: "t14", accountId: "a1", date: daysAgo(13), merchant: "Streamkeep", amount: 15.49, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s1", note: "", status: "cleared", createdManually: false },
    { id: "t15", accountId: "a1", date: daysAgo(14), merchant: "Freelance Bounty", amount: 460, direction: "income", category: "Income", note: "Design work", status: "cleared", createdManually: true },
  ],
  subscriptions: [
    { id: "s1", name: "Streamkeep", amount: 15.49, cadence: "monthly", nextCharge: daysFromNow(2), categoryId: "tribute", accountId: "a1", usageCount: 11, usageEvents: usageEvents(11, 2), lastUsed: daysAgo(1), priceHistory: [{ amount: 15.49, changedAt: daysAgo(180) }], trackingMode: "every-use", valueRating: "Mostly", cancellationNotes: "Manage from the Streamkeep account page.", reminderDays: 2, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#e93354", glyph: "S" },
    { id: "s2", name: "Songbird Plus", amount: 10.99, cadence: "monthly", nextCharge: daysFromNow(5), categoryId: "tribute", accountId: "a1", usageCount: 24, usageEvents: usageEvents(24, 1), lastUsed: daysAgo(0), priceHistory: [{ amount: 10.99, changedAt: daysAgo(220) }], trackingMode: "every-use", valueRating: "Absolutely", cancellationNotes: "", reminderDays: 2, reminderEnabled: false, usageQuestDays: 30, questEnabled: true, color: "#20bc72", glyph: "♫" },
    { id: "s3", name: "CloudQuill", amount: 12, cadence: "monthly", nextCharge: daysFromNow(8), categoryId: "tribute", accountId: "a1", usageCount: 8, usageEvents: usageEvents(8, 3), lastUsed: daysAgo(3), priceHistory: [{ amount: 9, changedAt: daysAgo(365) }, { amount: 12, changedAt: daysAgo(12) }], priceChange: 3, trackingMode: "weekly", valueRating: "Mostly", cancellationNotes: "Export notebooks before cancelling.", reminderDays: 3, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#6957df", glyph: "Q" },
    { id: "s4", name: "Scrollbox", amount: 7.99, cadence: "monthly", nextCharge: daysFromNow(12), categoryId: "tribute", accountId: "a1", usageCount: 0, usageEvents: [], lastUsed: daysAgo(45), priceHistory: [{ amount: 7.99, changedAt: daysAgo(120) }], trackingMode: "monthly", valueRating: "Not rated", cancellationNotes: "", reminderDays: 3, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#eb9a21", glyph: "C" },
    { id: "s5", name: "EmberGym", amount: 29, cadence: "monthly", nextCharge: daysFromNow(16), categoryId: "tribute", accountId: "a1", usageCount: 3, usageEvents: usageEvents(3, 7), lastUsed: daysAgo(8), priceHistory: [{ amount: 29, changedAt: daysAgo(90) }], trackingMode: "every-use", valueRating: "Mostly", cancellationNotes: "One full billing period notice.", reminderDays: 5, reminderEnabled: true, usageQuestDays: 14, questEnabled: true, color: "#49718f", glyph: "E" },
  ],
  quests: [
    quest({ id: "q-unusual-t5", title: "A Suspicious Charge", description: "A charge looks unusual. Review it?", reason: "Unknown Rune Shop differs from your recent pattern.", category: "Guard", xp: 10, icon: "shield", relatedEntityId: "t5" }),
    quest({ id: "q-unused-s4", title: "Unused Claimant", description: "No use has been logged for Scrollbox in 45 days.", reason: "It renews soon and may deserve a calm review.", category: "Guard", xp: 15, icon: "scroll", relatedEntityId: "s4" }),
    quest({ id: "q-vault", title: "Fill the Deep Vault", description: "Add $100 to your emergency fund.", reason: "A small buffer step strengthens the next seven days.", category: "Grow", xp: 20, icon: "vault" }),
    quest({ id: "q-categorise", title: "Categorise 5 Purchases", description: "Help your dragon understand where gold goes.", reason: "Clear categories make the Scrying Pool more useful.", category: "Tend", xp: 10, progress: "2 / 5", icon: "list" }),
  ],
  debts: [
    { id: "d1", name: "Ember Credit Card", balance: 2310, principal: 3600, apr: 22.49, minimum: 75, nextDue: daysFromNow(9), progress: 68, strategyOrder: 2, targetExtraPayment: 50, icon: "card" },
    { id: "d2", name: "Scholar's Loan", balance: 3250, principal: 5100, apr: 4.25, minimum: 95, nextDue: daysFromNow(14), progress: 64, strategyOrder: 3, targetExtraPayment: 0, icon: "cap" },
    { id: "d3", name: "Carriage Loan", balance: 680, principal: 1180, apr: 5.8, minimum: 70, nextDue: daysFromNow(20), progress: 42, strategyOrder: 1, targetExtraPayment: 0, icon: "car" },
  ],
  wishes: [
    { id: "w1", name: "Mechanical Keyboard", price: 179, restDays: 3, endsAt: daysFromNow(2), category: "Workshop", desiredDate: daysFromNow(14), fundingSource: "Free Gold", reason: "A quieter, more comfortable writing setup.", status: "resting" },
  ],
  investments: [
    { id: "i1", accountId: "a3", name: "Northstar Balanced Fund", type: "fund", units: 104.72, unitPrice: 58.25, contributions: 5400, annualReturnAssumption: 5.5, ticker: "VGS.AX", marketPrice: 58.25, quoteCurrency: "AUD", quoteSource: "manual", lastQuoteAt: daysAgo(1), dividendYield: 2.4, dividendFrequency: "quarterly", nextDividendDate: daysFromNow(31), note: "Long-term diversified holding.", updatedAt: daysAgo(1) },
    { id: "i2", accountId: "a3", name: "Retirement Reserve", type: "retirement", units: 1, unitPrice: 2550, contributions: 2380, annualReturnAssumption: 5, note: "Manually tracked retirement balance.", updatedAt: daysAgo(3) },
  ],
  pets: [
    { id: "cinder", name: "Cinder", species: "Ember sprite", cadence: "daily", lastInteraction: daysAgo(2), bondXp: 42, mood: "waiting", asset: "/characters/pet-cinder-v1.png", color: "#ef6a22" },
    { id: "quill", name: "Quill", species: "Scroll fox", cadence: "weekly", lastInteraction: daysAgo(3), bondXp: 78, mood: "bright", asset: "/characters/pet-quill-v1.png", color: "#d89545" },
    { id: "luna", name: "Luna", species: "Moon tortoise", cadence: "monthly", lastInteraction: daysAgo(36), bondXp: 118, mood: "waiting", asset: "/characters/pet-luna-v1.png", color: "#7774dc" },
  ],
  journey: {
    enabled: true,
    selectedAvatarId: "asha",
    cadence: "daily",
    comparisonDays: 7,
    stabilityPercent: 0.25,
    lastOpenedAt: daysAgo(2),
    lastSnapshotAt: daysAgo(7),
    currentNode: 4,
    snapshots: [
      { id: "snapshot-seed-1", capturedAt: daysAgo(30), assets: 22100, debt: 6610, netWorth: 15490, inflow30: 3240, outflow30: 1890, direction: "steady", change: 0 },
      { id: "snapshot-seed-2", capturedAt: daysAgo(7), assets: 22530, debt: 6460, netWorth: 16070, inflow30: 3700, outflow30: 2030, direction: "rising", change: 580 },
    ],
    chapters: [],
    incomeSources: [
      { id: "income-skyforge", name: "Skyforge Payroll", kind: "salary", cadence: "fortnightly", expectedAmount: 3240, reliability: "steady", lastSeenAt: daysAgo(1) },
      { id: "income-freelance", name: "Freelance Bounty", kind: "contract", cadence: "irregular", expectedAmount: 460, reliability: "variable", lastSeenAt: daysAgo(14) },
      { id: "income-vault", name: "Deep Vault interest", kind: "interest", cadence: "monthly", expectedAmount: 31, reliability: "steady" },
    ],
    idleRewards: [],
    starShards: 84,
    marketAutoRefresh: true,
    marketRefreshHours: 24,
  },
  projections: {
    rangeMonths: 12,
    activeScenario: "Current Flight",
    scenarios: {
      "Current Flight": { expectedMonthlyIncome: 3700, essentialSpending: 1296, flexibleSpending: 745, subscriptionChange: 0, debtExtraPayment: 0, savingsContribution: 100, investmentContribution: 180, oneOffPurchase: 0 },
      Cautious: { expectedMonthlyIncome: 3700, essentialSpending: 1296, flexibleSpending: 570, subscriptionChange: -12, debtExtraPayment: 50, savingsContribution: 160, investmentContribution: 180, oneOffPurchase: 0 },
      "Treasure Hunt": { expectedMonthlyIncome: 3917, essentialSpending: 1296, flexibleSpending: 745, subscriptionChange: 0, debtExtraPayment: 75, savingsContribution: 200, investmentContribution: 220, oneOffPurchase: 0 },
      Resting: { expectedMonthlyIncome: 2450, essentialSpending: 1296, flexibleSpending: 420, subscriptionChange: -20, debtExtraPayment: 0, savingsContribution: 0, investmentContribution: 0, oneOffPurchase: 0 },
    },
  },
  progression: {
    level: 8,
    xp: 1250,
    nextLevelXp: 2000,
    title: "The Hoardkeeper",
    relics: ["Emerald Crown", "First Key", "Patient Hourglass", "Flight Compass", "Deep Vault Gem"],
    unlockedCosmetics: ["Emerald", "Sky"],
    completedQuestCount: 12,
    milestones: ["first-buffer", "first-claimant", "first-rest", "first-flight", "vault-5000"],
    storyChoices: {},
  },
  updatedAt: new Date().toISOString(),
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeState(input: unknown): DragonState {
  if (!isObject(input)) throw new Error("Invalid Dragon Mode export");
  const seed = createSeedState();
  const source = input as Partial<DragonState>;
  if (!source.profile || !Array.isArray(source.chambers)) throw new Error("Invalid Dragon Mode export");

  const chambers = source.chambers.map((chamber, index) => ({ ...chamber, sortOrder: chamber.sortOrder ?? index }));
  const accounts = Array.isArray(source.accounts) ? source.accounts.map((account, index) => ({
    ...account,
    compounding: account.compounding ?? (account.apy ? "daily" as const : undefined),
    includedInHoard: account.includedInHoard ?? true,
    archived: account.archived ?? false,
    icon: account.icon ?? "wallet",
    color: account.color ?? ["#e99a26", "#2377ca", "#2a9b54", "#d85836"][index % 4],
  })) : seed.accounts;
  const fallbackAccountId = accounts[0]?.id ?? "a1";
  const transactions = Array.isArray(source.transactions) ? source.transactions.map((transaction) => ({
    ...transaction,
    accountId: transaction.accountId ?? fallbackAccountId,
    note: transaction.note ?? "",
    status: transaction.status ?? "cleared" as const,
    createdManually: transaction.createdManually ?? false,
  })) : seed.transactions;
  const subscriptions = Array.isArray(source.subscriptions) ? source.subscriptions.map((subscription) => ({
    ...subscription,
    categoryId: subscription.categoryId ?? "tribute",
    accountId: subscription.accountId ?? fallbackAccountId,
    usageEvents: subscription.usageEvents ?? [],
    priceHistory: subscription.priceHistory ?? [{ amount: subscription.amount, changedAt: new Date().toISOString() }],
    trackingMode: subscription.trackingMode ?? "every-use" as const,
    valueRating: subscription.valueRating ?? "Not rated" as const,
    cancellationNotes: subscription.cancellationNotes ?? "",
    reminderDays: subscription.reminderDays ?? 3,
    reminderEnabled: subscription.reminderEnabled ?? false,
    usageQuestDays: subscription.usageQuestDays ?? 30,
    questEnabled: subscription.questEnabled ?? true,
  })) : seed.subscriptions;
  const quests = Array.isArray(source.quests) ? source.quests.map((item) => {
    const migrated = seed.quests.find((candidate) => candidate.title === item.title);
    return quest(migrated ? { ...migrated, ...item, id: migrated.id, relatedEntityId: migrated.relatedEntityId } : item);
  }).filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index) : seed.quests;
  const debts = Array.isArray(source.debts) ? source.debts.map((debt, index) => ({
    ...debt,
    principal: debt.principal ?? Math.max(debt.balance, debt.balance / Math.max(0.01, 1 - debt.progress / 100)),
    strategyOrder: debt.strategyOrder ?? index + 1,
    targetExtraPayment: debt.targetExtraPayment ?? 0,
  })) : seed.debts;
  const wishes = Array.isArray(source.wishes) ? source.wishes.map((wish) => ({
    ...wish,
    category: wish.category ?? "Workshop",
    desiredDate: wish.desiredDate ?? wish.endsAt,
    fundingSource: wish.fundingSource ?? "Free Gold",
  })) : seed.wishes;
  const pets = Array.isArray(source.pets) ? source.pets.map((pet, index) => ({
    ...seed.pets[index % seed.pets.length],
    ...pet,
  })) : seed.pets;
  const journey = {
    ...seed.journey,
    ...(source.journey ?? {}),
    snapshots: Array.isArray(source.journey?.snapshots) ? source.journey.snapshots : seed.journey.snapshots,
    chapters: Array.isArray(source.journey?.chapters) ? source.journey.chapters : seed.journey.chapters,
    incomeSources: Array.isArray(source.journey?.incomeSources) ? source.journey.incomeSources : seed.journey.incomeSources,
    idleRewards: Array.isArray(source.journey?.idleRewards) ? source.journey.idleRewards : seed.journey.idleRewards,
  };

  return {
    ...seed,
    ...source,
    schemaVersion: SCHEMA_VERSION,
    profile: {
      ...seed.profile,
      ...source.profile,
      notificationPreferences: { ...seed.profile.notificationPreferences, ...(source.profile.notificationPreferences ?? {}) },
    },
    chambers,
    accounts,
    transactions,
    subscriptions,
    quests,
    debts,
    wishes,
    pets,
    journey,
    investments: Array.isArray(source.investments) ? source.investments.map((position) => ({
      ...position,
      marketPrice: position.marketPrice ?? position.unitPrice,
      quoteSource: position.quoteSource ?? "manual" as const,
      lastQuoteAt: position.lastQuoteAt ?? position.updatedAt,
      dividendYield: position.dividendYield ?? 0,
      dividendFrequency: position.dividendFrequency ?? "irregular" as const,
    })) : seed.investments,
    projections: {
      ...seed.projections,
      ...source.projections,
      scenarios: { ...seed.projections.scenarios, ...(source.projections?.scenarios ?? {}) },
    },
    progression: {
      ...seed.progression,
      ...(source.progression ?? {}),
      storyChoices: { ...seed.progression.storyChoices, ...(source.progression?.storyChoices ?? {}) },
    },
    updatedAt: new Date().toISOString(),
  };
}
