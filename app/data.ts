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
  chamberId: string;
};

export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  direction: "income" | "expense";
  category: string;
  unusual?: boolean;
  worthRating?: string;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cadence: "monthly" | "annual";
  nextCharge: string;
  usageCount: number;
  lastUsed: string | null;
  priceChange?: number;
  color: string;
  glyph: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: "Guard" | "Grow" | "Learn" | "Tend";
  xp: number;
  progress?: string;
  completed: boolean;
  icon: string;
};

export type Debt = {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimum: number;
  nextDue: string;
  progress: number;
  icon: string;
};

export type Wish = {
  id: string;
  name: string;
  price: number;
  restDays: number;
  endsAt: string;
  reason: string;
  status: "resting" | "claimed" | "saved" | "released";
};

export type DragonState = {
  profile: {
    displayName: string;
    title: string;
    dragonName: string;
    reducedMotion: boolean;
    soundEnabled: boolean;
    plainLanguage: boolean;
    tutorialComplete: boolean;
  };
  chambers: Chamber[];
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  quests: Quest[];
  debts: Debt[];
  wishes: Wish[];
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

export const createSeedState = (): DragonState => ({
  profile: {
    displayName: "Avery",
    title: "Hoardkeeper",
    dragonName: "Moss",
    reducedMotion: false,
    soundEnabled: false,
    plainLanguage: false,
    tutorialComplete: false,
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
    { id: "a1", name: "Daily Gold", type: "transaction", balance: 6210.3, chamberId: "hearth" },
    { id: "a2", name: "Deep Vault Reserve", type: "savings", balance: 7850, chamberId: "vault" },
    { id: "a3", name: "Long Sleep Fund", type: "investment", balance: 8650.22, chamberId: "sleep" },
    { id: "a4", name: "Ember Card", type: "credit", balance: -2310, chamberId: "tribute" },
  ],
  transactions: [
    { id: "t1", date: daysAgo(1), merchant: "Skyforge Payroll", amount: 3240, direction: "income", category: "Income" },
    { id: "t2", date: daysAgo(1), merchant: "Hearth Market", amount: 86.42, direction: "expense", category: "The Hearth" },
    { id: "t3", date: daysAgo(2), merchant: "Copper Kettle", amount: 18.7, direction: "expense", category: "The Roost", worthRating: "Absolutely" },
    { id: "t4", date: daysAgo(3), merchant: "Moonlit Cinema", amount: 14.99, direction: "expense", category: "Tribute Hall" },
    { id: "t5", date: daysAgo(4), merchant: "Unknown Rune Shop", amount: 79.5, direction: "expense", category: "Uncategorised", unusual: true },
    { id: "t6", date: daysAgo(5), merchant: "Lair Energy", amount: 87.12, direction: "expense", category: "The Hearth" },
    { id: "t7", date: daysAgo(6), merchant: "CloudQuill", amount: 12, direction: "expense", category: "Tribute Hall" },
    { id: "t8", date: daysAgo(7), merchant: "EmberGym", amount: 29, direction: "expense", category: "Tribute Hall" },
    { id: "t9", date: daysAgo(8), merchant: "Arcane Books", amount: 45.2, direction: "expense", category: "Workshop", worthRating: "Mostly" },
    { id: "t10", date: daysAgo(9), merchant: "Dragonfruit Grocer", amount: 124.65, direction: "expense", category: "The Hearth" },
    { id: "t11", date: daysAgo(10), merchant: "Songbird Plus", amount: 10.99, direction: "expense", category: "Tribute Hall" },
    { id: "t12", date: daysAgo(11), merchant: "Roost Café", amount: 9.8, direction: "expense", category: "The Roost", worthRating: "Neutral" },
    { id: "t13", date: daysAgo(12), merchant: "Deep Vault Transfer", amount: 100, direction: "expense", category: "Deep Vault" },
    { id: "t14", date: daysAgo(13), merchant: "Streamkeep", amount: 15.49, direction: "expense", category: "Tribute Hall" },
    { id: "t15", date: daysAgo(14), merchant: "Freelance Bounty", amount: 460, direction: "income", category: "Income" },
  ],
  subscriptions: [
    { id: "s1", name: "Streamkeep", amount: 15.49, cadence: "monthly", nextCharge: daysFromNow(2), usageCount: 11, lastUsed: daysAgo(1), color: "#e93354", glyph: "S" },
    { id: "s2", name: "Songbird Plus", amount: 10.99, cadence: "monthly", nextCharge: daysFromNow(5), usageCount: 24, lastUsed: daysAgo(0), color: "#20bc72", glyph: "♫" },
    { id: "s3", name: "CloudQuill", amount: 12, cadence: "monthly", nextCharge: daysFromNow(8), usageCount: 8, lastUsed: daysAgo(3), priceChange: 3, color: "#6957df", glyph: "Q" },
    { id: "s4", name: "Scrollbox", amount: 7.99, cadence: "monthly", nextCharge: daysFromNow(12), usageCount: 0, lastUsed: daysAgo(45), color: "#eb9a21", glyph: "C" },
    { id: "s5", name: "EmberGym", amount: 29, cadence: "monthly", nextCharge: daysFromNow(16), usageCount: 3, lastUsed: daysAgo(8), color: "#49718f", glyph: "E" },
  ],
  quests: [
    { id: "q1", title: "A Suspicious Charge", description: "A charge looks unusual. Review it?", category: "Guard", xp: 10, completed: false, icon: "shield" },
    { id: "q2", title: "Unused Claimant", description: "No use has been logged for Scrollbox in 45 days.", category: "Guard", xp: 15, completed: false, icon: "scroll" },
    { id: "q3", title: "Fill the Deep Vault", description: "Add $100 to your emergency fund.", category: "Grow", xp: 20, completed: false, icon: "vault" },
    { id: "q4", title: "Categorise 5 Purchases", description: "Help your dragon understand where gold goes.", category: "Tend", xp: 10, progress: "2 / 5", completed: false, icon: "list" },
  ],
  debts: [
    { id: "d1", name: "Ember Credit Card", balance: 2310, apr: 22.49, minimum: 75, nextDue: daysFromNow(9), progress: 68, icon: "card" },
    { id: "d2", name: "Scholar's Loan", balance: 3250, apr: 4.25, minimum: 95, nextDue: daysFromNow(14), progress: 64, icon: "cap" },
    { id: "d3", name: "Carriage Loan", balance: 680, apr: 5.8, minimum: 70, nextDue: daysFromNow(20), progress: 42, icon: "car" },
  ],
  wishes: [
    { id: "w1", name: "Mechanical Keyboard", price: 179, restDays: 3, endsAt: daysFromNow(2), reason: "A quieter, more comfortable writing setup.", status: "resting" },
  ],
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

