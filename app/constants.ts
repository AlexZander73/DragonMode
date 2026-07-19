export const APP_NAME = "Dragon Mode";
export const APP_TAGLINE = "Protect your hoard. Rest easier.";

export const TAB_LABELS = {
  lair: "Lair",
  hoard: "Hoard",
  quests: "Quests",
  scrying: "Scrying",
  treasury: "Treasury",
} as const;

export type MainTab = keyof typeof TAB_LABELS;

export const CURRENCY = "AUD";
export const LOCALE = "en-AU";

export const formatGold = (value: number, decimals = 2) =>
  new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

