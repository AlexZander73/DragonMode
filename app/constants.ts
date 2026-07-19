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

let activeCurrency = CURRENCY;
let activeLocale = LOCALE;

export const configureFormatting = (currency: string, locale: string) => {
  activeCurrency = currency || CURRENCY;
  activeLocale = locale || LOCALE;
};

export const formatGold = (value: number, decimals = 2) =>
  new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency: activeCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat(activeLocale, { day: "numeric", month: "short" }).format(new Date(value));

export const formatCompactGold = (value: number) =>
  new Intl.NumberFormat(activeLocale, { style: "currency", currency: activeCurrency, notation: "compact", maximumFractionDigits: 0 }).format(value);
