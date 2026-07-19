export type Chamber = {
  id: string;
  name: string;
  practicalName: string;
  amount: number;
  target: number;
  color: string;
  icon: string;
  type: "essential" | "savings" | "flexible" | "investment" | "recurring" | "goal";
};

export type Account = {
  id: string;
  name: string;
  type: "transaction" | "savings" | "credit" | "loan" | "investment";
  balance: number;
  availableBalance?: number;
  institutionName?: string;
  creditLimit?: number;
  interestRate?: number;
  includedInHoard: boolean;
  chamberId: string;
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
  worthRating?: WorthRating;
  createdManually: boolean;
};

export type UsageEvent = {
  id: string;
  usedAt: string;
  quantity: number;
  source: "manual" | "shortcut" | "reminder";
  note?: string;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cadence: "monthly" | "annual";
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
    plainLanguage: boolean;
    tutorialComplete: boolean;
    preferredCurrency: string;
    locale: string;
    minimumBuffer: number;
    comfortableMonthlyCost: number;
    essentialMonthlyCost: number;
    lifestyleMonthlyCost: number;
  };
  chambers: Chamber[];
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  quests: Quest[];
  debts: Debt[];
  wishes: Wish[];
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
    completedQuestCount: number;
  };
  updatedAt: string;
};

export const SCHEMA_VERSION = 2;

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
    plainLanguage: false,
    tutorialComplete: false,
    preferredCurrency: "AUD",
    locale: "en-AU",
    minimumBuffer: 1200,
    comfortableMonthlyCost: 1706.5,
    essentialMonthlyCost: 1296,
    lifestyleMonthlyCost: 3240,
  },
  chambers: [
    { id: "hearth", name: "The Hearth", practicalName: "Everyday living", amount: 6240.3, target: 6800, color: "#ef4b24", icon: "flame", type: "essential" },
    { id: "vault", name: "Deep Vault", practicalName: "Emergency fund", amount: 7850, target: 10000, color: "#0e6fce", icon: "vault", type: "savings" },
    { id: "workshop", name: "Workshop", practicalName: "Projects & tools", amount: 2310.45, target: 3000, color: "#7542c8", icon: "hammer", type: "goal" },
    { id: "roost", name: "The Roost", practicalName: "Fun & lifestyle", amount: 1245.78, target: 1500, color: "#dd3281", icon: "heart", type: "flexible" },
    { id: "sleep", name: "Long Sleep", practicalName: "Investments & retirement", amount: 8650.22, target: 12000, color: "#27963c", icon: "sprout", type: "investment" },
    { id: "tribute", name: "Tribute Hall", practicalName: "Bills & subscriptions", amount: 1102.6, target: 1400, color: "#c58a18", icon: "scroll", type: "recurring" },
    { id: "wish", name: "Wish Vault", practicalName: "Future goals", amount: 1051.3, target: 1600, color: "#00a7b9", icon: "star", type: "goal" },
  ],
  accounts: [
    { id: "a1", name: "Daily Gold", type: "transaction", balance: 6210.3, availableBalance: 6210.3, institutionName: "Sky Vault Credit Union", includedInHoard: true, chamberId: "hearth", archived: false },
    { id: "a2", name: "Deep Vault Reserve", type: "savings", balance: 7850, institutionName: "Sky Vault Credit Union", includedInHoard: true, chamberId: "vault", archived: false },
    { id: "a3", name: "Long Sleep Fund", type: "investment", balance: 8650.22, institutionName: "Northstar", includedInHoard: true, chamberId: "sleep", archived: false },
    { id: "a4", name: "Ember Card", type: "credit", balance: -2310, availableBalance: 1690, creditLimit: 4000, interestRate: 22.49, institutionName: "Ember Bank", includedInHoard: true, chamberId: "tribute", archived: false },
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
    { id: "t13", accountId: "a1", date: daysAgo(12), merchant: "Deep Vault Transfer", amount: 100, direction: "expense", category: "Deep Vault", note: "Monthly buffer", status: "cleared", createdManually: false },
    { id: "t14", accountId: "a1", date: daysAgo(13), merchant: "Streamkeep", amount: 15.49, direction: "expense", category: "Tribute Hall", recurringSeriesId: "s1", note: "", status: "cleared", createdManually: false },
    { id: "t15", accountId: "a1", date: daysAgo(14), merchant: "Freelance Bounty", amount: 460, direction: "income", category: "Income", note: "Design work", status: "cleared", createdManually: true },
  ],
  subscriptions: [
    { id: "s1", name: "Streamkeep", amount: 15.49, cadence: "monthly", nextCharge: daysFromNow(2), categoryId: "tribute", accountId: "a1", usageCount: 11, usageEvents: [], lastUsed: daysAgo(1), priceHistory: [{ amount: 15.49, changedAt: daysAgo(180) }], trackingMode: "every-use", valueRating: "Mostly", cancellationNotes: "Manage from the Streamkeep account page.", reminderDays: 2, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#e93354", glyph: "S" },
    { id: "s2", name: "Songbird Plus", amount: 10.99, cadence: "monthly", nextCharge: daysFromNow(5), categoryId: "tribute", accountId: "a1", usageCount: 24, usageEvents: [], lastUsed: daysAgo(0), priceHistory: [{ amount: 10.99, changedAt: daysAgo(220) }], trackingMode: "every-use", valueRating: "Absolutely", cancellationNotes: "", reminderDays: 2, reminderEnabled: false, usageQuestDays: 30, questEnabled: true, color: "#20bc72", glyph: "♫" },
    { id: "s3", name: "CloudQuill", amount: 12, cadence: "monthly", nextCharge: daysFromNow(8), categoryId: "tribute", accountId: "a1", usageCount: 8, usageEvents: [], lastUsed: daysAgo(3), priceHistory: [{ amount: 9, changedAt: daysAgo(365) }, { amount: 12, changedAt: daysAgo(12) }], priceChange: 3, trackingMode: "weekly", valueRating: "Mostly", cancellationNotes: "Export notebooks before cancelling.", reminderDays: 3, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#6957df", glyph: "Q" },
    { id: "s4", name: "Scrollbox", amount: 7.99, cadence: "monthly", nextCharge: daysFromNow(12), categoryId: "tribute", accountId: "a1", usageCount: 0, usageEvents: [], lastUsed: daysAgo(45), priceHistory: [{ amount: 7.99, changedAt: daysAgo(120) }], trackingMode: "monthly", valueRating: "Not rated", cancellationNotes: "", reminderDays: 3, reminderEnabled: true, usageQuestDays: 30, questEnabled: true, color: "#eb9a21", glyph: "C" },
    { id: "s5", name: "EmberGym", amount: 29, cadence: "monthly", nextCharge: daysFromNow(16), categoryId: "tribute", accountId: "a1", usageCount: 3, usageEvents: [], lastUsed: daysAgo(8), priceHistory: [{ amount: 29, changedAt: daysAgo(90) }], trackingMode: "every-use", valueRating: "Mostly", cancellationNotes: "One full billing period notice.", reminderDays: 5, reminderEnabled: true, usageQuestDays: 14, questEnabled: true, color: "#49718f", glyph: "E" },
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
    completedQuestCount: 12,
  },
  updatedAt: new Date().toISOString(),
});

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeState(input: unknown): DragonState {
  if (!isObject(input)) throw new Error("Invalid Dragon Mode export");
  const seed = createSeedState();
  const source = input as Partial<DragonState>;
  if (!source.profile || !Array.isArray(source.chambers)) throw new Error("Invalid Dragon Mode export");

  const accounts = Array.isArray(source.accounts) ? source.accounts.map((account) => ({
    ...account,
    includedInHoard: account.includedInHoard ?? true,
    archived: account.archived ?? false,
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

  return {
    ...seed,
    ...source,
    schemaVersion: SCHEMA_VERSION,
    profile: { ...seed.profile, ...source.profile },
    chambers: source.chambers as Chamber[],
    accounts,
    transactions,
    subscriptions,
    quests,
    debts,
    wishes,
    projections: {
      ...seed.projections,
      ...source.projections,
      scenarios: { ...seed.projections.scenarios, ...(source.projections?.scenarios ?? {}) },
    },
    progression: { ...seed.progression, ...(source.progression ?? {}) },
    updatedAt: new Date().toISOString(),
  };
}
