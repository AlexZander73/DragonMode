"use client";

import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  Clock,
  CloudSun,
  BookOpen,
  Car,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Crown,
  Download,
  Eye,
  Flame,
  Gem,
  GraduationCap,
  Hammer,
  Heart,
  Home,
  Landmark,
  ListChecks,
  LockKeyhole,
  Map,
  Menu,
  MoreHorizontal,
  Orbit,
  PawPrint,
  Plus,
  RotateCcw,
  Route,
  RefreshCw,
  Save,
  Search,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Sword,
  Target,
  Telescope,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserRound,
  Volume2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addProgressionXp,
  averageApr,
  currentBillingUsage,
  estimateDebtPlan,
  getActiveQuests,
  getCategoryBreakdown,
  getHoardSummary,
  getMonthlyFlow,
  getMonthlyTrend,
  getWorthSummary,
  hibernationModes,
  hibernationMonths,
  monthlyTribute,
  monthlySubscriptionAmount,
  petBondLevel,
  petCareStatus,
  projectScenario,
  searchTransactions,
  subscriptionCostPerUse,
  totalDebt,
} from "./calculations";
import { APP_NAME, APP_TAGLINE, EXPERIMENTAL_MARKET_DATA, NATIVE_MARKET_API_BASE, configureFormatting, formatCompactGold, formatGold, formatShortDate as formatDate, type MainTab } from "./constants";
import { createEmptyState, createSeedState, JOURNEY_AVATARS, normalizeState, type DragonState, type Goal, type ImportBatch, type IncomeCadence, type IncomeKind, type InvestmentPosition, type Pet, type Quest, type Subscription, type Transaction, type WorthRating } from "./data";
import { latestJourneyChapter, processJourneySession, selectedJourneyAvatar, shouldRefreshMarketData } from "./journey";
import { completeHoardCheck, getHoardCheck } from "./check-ins";
import { buildCalculatorResults, completeLoreCard, recalculateResult, type CalculatorResult } from "./education";
import { collectionChoiceDue, RELIC_ITEMS, RELIC_ODDS, RELIC_SETS, revealRelic } from "./collection";
import { cancelClaimantReminder, cancelWishReminder, notificationPermission, playFeedback, reconcileNotificationSchedule, scheduleClaimantReminder, scheduleWishReminder, setupNotificationActions } from "./native";
import { createTransaction, deleteTransaction, replaceTransaction, syncInvestmentAccounts } from "./ledger";
import { commitImportBatch, resolveCommittedCandidate, resolveImportCandidate, stageTextImport, undoImportBatch } from "./imports";
import { clearState, loadState, saveState } from "./storage";

type Screen = "lair" | "pets" | "journey" | "roster" | "idle" | "collection" | "hoard" | "import" | "quests" | "goals" | "analytics" | "lore" | "tribute" | "flight" | "wish" | "dragon" | "debt" | "investments" | "legacy" | "settings";
type Sheet = { type: string; id?: string; title?: string; body?: string; preset?: Partial<Transaction> } | null;
type OnboardingChoices = {
  dataMode: "demo" | "personal";
  displayName: string;
  dragonName: string;
  dragonColor: string;
  lairTheme: string;
  avatarId: string;
  journeyEnabled: boolean;
  cadence: DragonState["journey"]["cadence"];
};

const ICONS: Record<string, LucideIcon> = {
  flame: Flame,
  vault: LockKeyhole,
  hammer: Hammer,
  heart: Heart,
  sprout: Sprout,
  scroll: ScrollText,
  star: Star,
  shield: ShieldCheck,
  list: ListChecks,
  card: CreditCard,
  cap: GraduationCap,
  car: Car,
  wallet: WalletCards,
};

const tabDefaults: Record<MainTab, Screen> = {
  lair: "lair",
  hoard: "hoard",
  quests: "quests",
  scrying: "analytics",
  treasury: "tribute",
};

const screenTab: Record<Screen, MainTab> = {
  lair: "lair",
  pets: "lair",
  dragon: "lair",
  legacy: "lair",
  journey: "lair",
  roster: "lair",
  idle: "lair",
  collection: "lair",
  hoard: "hoard",
  import: "hoard",
  quests: "quests",
  goals: "quests",
  wish: "quests",
  analytics: "scrying",
  lore: "scrying",
  flight: "scrying",
  tribute: "treasury",
  debt: "treasury",
  investments: "treasury",
  settings: "treasury",
};

const navItems: Array<{ id: MainTab; label: string; practical: string; icon: LucideIcon }> = [
  { id: "lair", label: "Lair", practical: "Home", icon: Home },
  { id: "hoard", label: "Hoard", practical: "Money", icon: Landmark },
  { id: "quests", label: "Quests", practical: "Actions", icon: ListChecks },
  { id: "scrying", label: "Scrying", practical: "Insights", icon: Telescope },
  { id: "treasury", label: "Treasury", practical: "Planning", icon: WalletCards },
];

const APP_STARTED_AT = Date.now();
const dateAfterDays = (days: number) => new Date(APP_STARTED_AT + days * 86_400_000).toISOString().slice(0, 10);
const daysUntil = (value: string) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
const dayLabel = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

const cloneSeed = () => createSeedState();

export default function DragonModeApp() {
  const [state, setState] = useState<DragonState>(cloneSeed);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("lair");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [tutorialStep, setTutorialStep] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Partial<Record<Screen, number>>>({});
  const marketRefreshStarted = useRef(false);
  configureFormatting(state.profile.preferredCurrency, state.profile.locale);

  useEffect(() => {
    loadState()
      .then((saved) => {
        const nextState = processJourneySession(saved ?? createSeedState());
        setState(nextState);
        setTutorialStep(nextState.profile.tutorialChapter ?? 0);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const refreshMarketQuote = useCallback(async (positionId: string, silent = false) => {
    if (!EXPERIMENTAL_MARKET_DATA) {
      if (!silent) setToast("Live quote retrieval is reserved for experimental builds");
      return false;
    }
    const position = state.investments.find((item) => item.id === positionId);
    if (!position?.ticker) {
      if (!silent) setToast("Add a market symbol before refreshing");
      return false;
    }
    try {
      const apiBase = window.location.protocol.startsWith("http") ? "" : NATIVE_MARKET_API_BASE;
      const response = await fetch(`${apiBase}/api/market/quote?symbol=${encodeURIComponent(position.ticker)}`);
      const payload = await response.json() as { price?: number; dividendYield?: number; nextDividendDate?: string | null; refreshedAt?: string; provider?: string; error?: string };
      if (!response.ok || !payload.price) throw new Error(payload.error ?? "No verified quote returned");
      setState((previous) => ({
        ...previous,
        investments: previous.investments.map((item) => item.id === positionId ? {
          ...item,
          unitPrice: payload.price ?? item.unitPrice,
          marketPrice: payload.price ?? item.marketPrice,
          dividendYield: payload.dividendYield || item.dividendYield,
          nextDividendDate: payload.nextDividendDate || item.nextDividendDate,
          quoteSource: "alpha-vantage" as const,
          lastQuoteAt: payload.refreshedAt ?? new Date().toISOString(),
          updatedAt: payload.refreshedAt ?? new Date().toISOString(),
        } : item),
        journey: { ...previous.journey, lastMarketRefreshAt: new Date().toISOString() },
      }));
      if (!silent) setToast(`${position.ticker} refreshed from ${payload.provider ?? "verified market data"}`);
      return true;
    } catch (error) {
      if (!silent) setToast(error instanceof Error ? error.message : "Saved value kept; refresh unavailable");
      return false;
    }
  }, [state.investments]);

  useEffect(() => {
    if (!EXPERIMENTAL_MARKET_DATA || !ready || marketRefreshStarted.current || !state.journey.marketAutoRefresh) return;
    marketRefreshStarted.current = true;
    const stale = state.investments.filter((item) => item.ticker && shouldRefreshMarketData(item.lastQuoteAt, state.journey.marketRefreshHours));
    stale.reduce((chain, item) => chain.then(() => refreshMarketQuote(item.id, true).then(() => undefined)), Promise.resolve()).catch(() => undefined);
  }, [ready, refreshMarketQuote, state.investments, state.journey.marketAutoRefresh, state.journey.marketRefreshHours]);

  useEffect(() => {
    document.documentElement.lang = state.profile.locale;
  }, [state.profile.locale]);

  useEffect(() => {
    if (!ready || !state.profile.rotateOwnedSkins) return;
    const week = Math.floor(Date.now() / (7 * 86_400_000));
    const themes = ["Sky Vault", "Moon Garden", "Ember Library"].filter((item) => state.progression.unlockedCosmetics.includes(item) || item === state.profile.selectedLairTheme);
    const colors = ["Emerald", "Sky", "Amethyst", "Ember"].filter((item) => state.progression.unlockedCosmetics.includes(item) || item === state.profile.selectedDragonColor);
    const selectedLairTheme = themes[week % Math.max(1, themes.length)] ?? state.profile.selectedLairTheme;
    const selectedDragonColor = colors[week % Math.max(1, colors.length)] ?? state.profile.selectedDragonColor;
    if (selectedLairTheme === state.profile.selectedLairTheme && selectedDragonColor === state.profile.selectedDragonColor) return;
    const timer = window.setTimeout(() => setState((previous) => ({ ...previous, profile: { ...previous.profile, selectedLairTheme, selectedDragonColor } })), 0);
    return () => window.clearTimeout(timer);
  }, [ready, state.profile.rotateOwnedSkins, state.profile.selectedDragonColor, state.profile.selectedLairTheme, state.progression.unlockedCosmetics]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => saveState(state).catch(() => undefined), 250);
    return () => window.clearTimeout(timer);
  }, [ready, state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    let dispose: () => void = () => undefined;
    setupNotificationActions((action) => {
      if (action.type === "subscription-use") {
        setState((previous) => {
          const subscription = previous.subscriptions.find((item) => item.id === action.subscriptionId);
          if (!subscription) return previous;
          const now = new Date().toISOString();
          return {
            ...previous,
            subscriptions: previous.subscriptions.map((item) => item.id === subscription.id ? { ...item, usageCount: item.usageCount + 1, lastUsed: now, usageEvents: [{ id: crypto.randomUUID(), usedAt: now, quantity: 1, source: "reminder" as const }, ...item.usageEvents] } : item),
            progression: addProgressionXp(previous, 2, "notification-use"),
          };
        });
        setToast("Claimant use logged from reminder · +2 XP");
      } else if (action.type === "subscription-open") {
        setScreen("tribute");
        setSheet({ type: "subscription", id: action.subscriptionId, title: "Claimant details" });
      } else if (action.type === "open-screen") {
        setScreen(action.screen);
      } else {
        setScreen("wish");
      }
    }).then((cleanup) => { dispose = cleanup; }).catch(() => undefined);
    return () => dispose();
  }, [ready]);

  const currentTab = screenTab[screen];
  const summary = useMemo(() => getHoardSummary(state), [state]);
  const notificationSignature = useMemo(() => JSON.stringify({ enabled: state.profile.notificationsEnabled, preferences: state.profile.notificationPreferences, quiet: [state.profile.notificationQuietStart, state.profile.notificationQuietEnd], review: [state.profile.reviewDay, state.profile.reviewHour], subscriptions: state.subscriptions.map((item) => [item.id, item.nextCharge, item.amount, item.reminderDays, item.reminderEnabled, item.priceChange]), wishes: state.wishes.map((item) => [item.id, item.endsAt, item.status]), pets: state.pets.map((item) => [item.id, item.lastInteraction, item.cadence]), imports: state.imports.batches.map((item) => [item.id, item.status, item.counts.held]), accounts: state.accounts.map((item) => [item.id, item.reconciliationStatus]), chapters: state.journey.chapters.map((item) => [item.id, item.completedAt]) }), [state.profile.notificationsEnabled, state.profile.notificationPreferences, state.profile.notificationQuietStart, state.profile.notificationQuietEnd, state.profile.reviewDay, state.profile.reviewHour, state.subscriptions, state.wishes, state.pets, state.imports.batches, state.accounts, state.journey.chapters]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => reconcileNotificationSchedule(state).catch(() => undefined), 500);
    return () => window.clearTimeout(timer);
    // The compact signature intentionally drives native schedule reconciliation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, notificationSignature]);

  const navigate = (nextScreen: Screen) => {
    if (mainRef.current) scrollPositions.current[screen] = mainRef.current.scrollTop;
    setScreen(nextScreen);
    setSheet(null);
    window.requestAnimationFrame(() => {
      const isTabRoot = tabDefaults[screenTab[nextScreen]] === nextScreen;
      if (mainRef.current) mainRef.current.scrollTop = isTabRoot ? (scrollPositions.current[nextScreen] ?? 0) : 0;
    });
  };

  const updateState = (updater: (previous: DragonState) => DragonState) => setState((previous) => updater(previous));

  const completeQuest = (quest: Quest) => {
    if (quest.completed) return;
    updateState((previous) => ({
      ...previous,
      quests: previous.quests.some((item) => item.id === quest.id)
        ? previous.quests.map((item) => (item.id === quest.id ? { ...item, completed: true, completedAt: new Date().toISOString() } : item))
        : [...previous.quests, { ...quest, completed: true, completedAt: new Date().toISOString() }],
      journey: quest.relatedEntityId?.startsWith("journey-") ? { ...previous.journey, chapters: previous.journey.chapters.map((chapter) => chapter.id === quest.relatedEntityId ? { ...chapter, goalCompletedAt: new Date().toISOString() } : chapter) } : previous.journey,
      progression: { ...addProgressionXp(previous, quest.xp, `quest-${quest.id}`), completedQuestCount: previous.progression.completedQuestCount + 1 },
    }));
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
    setToast(`Quest complete · +${quest.xp} XP`);
  };

  const logSubscriptionUse = (subscription: Subscription, quantity = 1) => {
    updateState((previous) => ({
      ...previous,
      subscriptions: previous.subscriptions.map((item) =>
        item.id === subscription.id
          ? {
              ...item,
              usageCount: item.usageCount + quantity,
              lastUsed: new Date().toISOString(),
              usageEvents: [{ id: crypto.randomUUID(), usedAt: new Date().toISOString(), quantity, source: "manual" as const }, ...item.usageEvents],
            }
          : item,
      ),
      quests: previous.quests.map((quest) => quest.relatedEntityId === subscription.id && quest.id.startsWith("q-unused-") ? { ...quest, completed: true, completedAt: new Date().toISOString() } : quest),
      progression: addProgressionXp(previous, 2, "first-usage-log"),
    }));
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled }).catch(() => undefined);
    setToast(`${subscription.name} use logged · +2 XP`);
  };

  const finishTutorial = (choices: OnboardingChoices) => {
    updateState((previous) => {
      const firstRun = !previous.profile.onboardingComplete;
      const base = firstRun ? (choices.dataMode === "personal" ? createEmptyState() : createSeedState()) : previous;
      return processJourneySession({
        ...base,
        profile: {
          ...base.profile,
          displayName: choices.displayName.trim() || "Keeper",
          dragonName: choices.dragonName.trim() || "Moss",
          selectedDragonColor: choices.dragonColor,
          selectedLairTheme: choices.lairTheme,
          tutorialComplete: true,
          tutorialChapter: 0,
          onboardingComplete: true,
          dataMode: firstRun ? choices.dataMode : base.profile.dataMode,
        },
        journey: {
          ...base.journey,
          selectedAvatarId: choices.avatarId,
          enabled: choices.journeyEnabled,
          cadence: choices.cadence,
          marketAutoRefresh: false,
        },
        progression: firstRun ? {
          ...base.progression,
          relics: base.progression.relics.includes("Lantern of Awakening") ? base.progression.relics : ["Lantern of Awakening", ...base.progression.relics],
          milestones: base.progression.milestones.includes("awakening-complete") ? base.progression.milestones : ["awakening-complete", ...base.progression.milestones],
          unlockedCosmetics: base.progression.unlockedCosmetics.includes(choices.lairTheme) ? base.progression.unlockedCosmetics : [...base.progression.unlockedCosmetics, choices.lairTheme],
        } : addProgressionXp(base, 10, "awakening-replayed"),
      });
    });
    setTutorialStep(0);
  };

  if (!ready) {
    return (
      <div className="app-stage">
        <div className="mobile-shell boot-screen">
          <Gem size={48} />
          <h1>{APP_NAME}</h1>
          <p>Waking the vault…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <div className={`mobile-shell theme-${currentTab} lair-${state.profile.selectedLairTheme.toLowerCase().replace(/[^a-z0-9]+/g, "-")} dragon-${state.profile.selectedDragonColor.toLowerCase().replace(/[^a-z0-9]+/g, "-")} ${state.profile.reducedMotion ? "reduce-motion" : ""}`} style={{ "--font-scale": state.profile.fontScale } as React.CSSProperties}>
        <main ref={mainRef} className="screen-scroll" id="main-content">
          {state.profile.plainLanguage && <PlainLanguageBar screen={screen} />}
          {screen === "lair" && <LairScreen state={state} summary={summary} navigate={navigate} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
          {screen === "pets" && <PetsScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "journey" && <JourneyScreen state={state} navigate={navigate} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
          {screen === "roster" && <RosterScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "idle" && <IdleVaultScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "collection" && <CollectionScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "hoard" && <HoardScreen state={state} summary={summary} navigate={navigate} setSheet={setSheet} />}
          {screen === "import" && <ImportScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "quests" && <QuestScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
          {screen === "goals" && <GoalsScreen state={state} navigate={navigate} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
          {screen === "analytics" && <AnalyticsScreen state={state} navigate={navigate} setSheet={setSheet} />}
          {screen === "lore" && <LoreScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "tribute" && <TributeScreen state={state} navigate={navigate} setSheet={setSheet} logUse={logSubscriptionUse} />}
          {screen === "flight" && <FlightScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "wish" && <WishScreen state={state} navigate={navigate} updateState={updateState} summary={summary} setToast={setToast} setSheet={setSheet} />}
          {screen === "dragon" && <DragonScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "debt" && <DebtScreen state={state} navigate={navigate} setSheet={setSheet} />}
          {screen === "investments" && <InvestmentsScreen state={state} navigate={navigate} updateState={updateState} setSheet={setSheet} setToast={setToast} refreshMarketQuote={refreshMarketQuote} />}
          {screen === "legacy" && <LegacyScreen state={state} navigate={navigate} setSheet={setSheet} />}
          {screen === "settings" && <SettingsScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
          <div className="scroll-spacer" />
        </main>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={currentTab === item.id ? "active" : ""}
                aria-current={currentTab === item.id ? "page" : undefined}
                onClick={() => navigate(tabDefaults[item.id])}
              >
                <span className="nav-icon"><Icon size={20} strokeWidth={2.5} /></span>
                <span>{state.profile.plainLanguage ? item.practical : item.label}</span>
              </button>
            );
          })}
        </nav>

        {sheet && (
          <Modal sheet={sheet} state={state} updateState={updateState} setSheet={setSheet} logUse={logSubscriptionUse} completeQuest={completeQuest} setToast={setToast} navigate={navigate} />
        )}

        {!state.profile.tutorialComplete && (
          <Tutorial state={state} firstRun={!state.profile.onboardingComplete} step={tutorialStep} setStep={(step) => { setTutorialStep(step); updateState((previous) => ({ ...previous, profile: { ...previous.profile, tutorialChapter: step } })); }} finish={finishTutorial} />
        )}

        {toast && <div className="toast" role="status"><Sparkles size={18} /> {toast}</div>}
      </div>
    </div>
  );
}

function ScreenHeader({ icon: Icon, title, subtitle, back, action }: { icon: LucideIcon; title: string; subtitle?: string; back?: () => void; action?: React.ReactNode }) {
  return (
    <header className="screen-header">
      {back ? <button className="icon-button" type="button" onClick={back} aria-label="Go back"><ArrowLeft size={22} /></button> : <span className="header-icon"><Icon size={22} /></span>}
      <div className="header-copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <div className="header-action">{action}</div>
    </header>
  );
}

function PlainLanguageBar({ screen }: { screen: Screen }) {
  const labels: Record<Screen, string> = {
    lair: "Home · your current financial snapshot",
    pets: "Pets · gentle daily, weekly, and monthly care",
    journey: "Journey · an optional story shaped by recent financial direction",
    roster: "Character roster · choose who represents you on the Journey",
    idle: "Idle vault · estimated earnings and non-financial rewards since your last visit",
    collection: "Collection · earned-only cosmetic relics with visible odds and a direct crafting path",
    hoard: "Money · accounts, balances and transactions",
    import: "Import · preview, match, reconcile and undo transaction batches",
    quests: "Actions · optional financial tasks",
    goals: "Goals · protected milestones you choose",
    analytics: "Insights · spending, income and trends",
    lore: "Learning · factual explanations and editable illustrations using your mapped numbers",
    tribute: "Subscriptions · recurring costs and usage",
    flight: "Projections · estimated future balances",
    wish: "Purchase pause · a considered buying decision",
    dragon: "Status · why something deserves attention",
    debt: "Debt · balances, payments and payoff estimates",
    investments: "Investments · manually tracked long-term positions",
    legacy: "Progress · permanent milestones and learning",
    settings: "Settings · preferences and local data",
  };
  return <aside className="plain-language-bar" role="note"><BookOpen size={15} /><span>{labels[screen]}</span></aside>;
}

function LairScreen({ state, summary, navigate, updateState, setSheet, setToast }: { state: DragonState; summary: ReturnType<typeof getHoardSummary>; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const unusualCount = state.transactions.filter((item) => item.unusual).length;
  const safetyTitle = unusualCount ? "The dragon is watchful." : "The hoard is safe.";
  const safetyDetail = unusualCount ? `${unusualCount} movement${unusualCount === 1 ? "" : "s"} deserves a calm review.` : `${state.profile.dragonName} rests, but keeps one eye open.`;
  const metrics = [
    { label: "Available", value: summary.available, icon: Coins, key: "available" },
    { label: "Committed", value: summary.committed, icon: ScrollText, key: "committed" },
    { label: "Guarded", value: summary.guarded, icon: ShieldCheck, key: "guarded" },
    { label: "Invested", value: summary.invested, icon: Gem, key: "invested" },
  ];
  const selectedPet = state.pets.find((pet) => pet.id === state.profile.selectedPetId) ?? state.pets[0];
  const selectedPetStatus = selectedPet ? petCareStatus(selectedPet) : null;
  const journeyChapter = latestJourneyChapter(state);
  const journeyAvatar = selectedJourneyAvatar(state);
  const unreviewedEstimates = state.journey.idleRewards.filter((item) => !item.claimedAt).length;
  const nextClaimant = [...state.subscriptions].sort((a, b) => new Date(a.nextCharge).getTime() - new Date(b.nextCharge).getTime())[0];
  const nextDebt = [...state.debts].sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())[0];
  const suggestedQuest = getActiveQuests(state)[0];
  if (!state.accounts.length) {
    return (
      <section className="screen screen-lair lair-empty">
        <ScreenHeader icon={Home} title="The Lair" subtitle={`Welcome, ${state.profile.displayName}`} action={<button type="button" className="level-badge" onClick={() => navigate("journey")}><Map size={16} /> LV {state.progression.level}</button>} />
        <section className="empty-lair-hero">
          <span className="empty-lair-dragon" aria-hidden="true" />
          <div><small>Chapter 2 · Count the Treasure</small><strong>The sky-vault is ready.</strong><p>{state.profile.dragonName} does not need perfect numbers—only the first piece you are comfortable mapping.</p><button type="button" onClick={() => setSheet({ type: "add-account", title: "Add your first account" })}><Plus size={18} /> Add first account</button></div>
        </section>
        <SetupTrail state={state} navigate={navigate} setSheet={setSheet} />
        <section className="local-promise"><ShieldCheck size={25} /><div><strong>Private by default</strong><p>Your financial records stay on this device. No bank login, account, or market connection is required.</p></div></section>
        <div className="empty-world-portals"><button type="button" onClick={() => navigate("roster")}><span style={{ "--portal-avatar": `url("${journeyAvatar.asset}")` } as React.CSSProperties} /><b>Choose your keeper</b><small>{journeyAvatar.name}</small></button><button type="button" onClick={() => navigate("journey")}><Map size={26} /><b>Preview the Atlas</b><small>Optional story mode</small></button></div>
        <p className="supportive-copy">There is no score for starting size. Awareness, care, and each useful return are what strengthen the bond.</p>
      </section>
    );
  }
  return (
    <section className="screen screen-lair">
      <ScreenHeader
        icon={Home}
        title="The Lair"
        subtitle={APP_TAGLINE}
        action={<button type="button" className="level-badge" onClick={() => navigate("journey")} aria-label="Open the Living Atlas"><Map size={16} /> LV {state.progression.level}</button>}
      />
      <button className="safety-banner" type="button" onClick={() => navigate("dragon")}> 
        <ShieldCheck size={24} />
        <span><strong>{safetyTitle}</strong><small>{safetyDetail}</small></span>
        {unusualCount ? <Eye className="banner-check" size={22} /> : <Check className="banner-check" size={22} />}
      </button>
      <HoardCheckPanel state={state} navigate={navigate} updateState={updateState} setSheet={setSheet} setToast={setToast} />
      <button className="dragon-hero lair-art" type="button" onClick={() => navigate("dragon")} aria-label="View Moss the dragon's status">
        <span className="hero-shine" />
        <span className="dragon-name"><Eye size={14} /> {state.profile.dragonName} is content</span>
      </button>
      <section className="total-panel">
        <span>Total hoard value</span>
        <strong>{formatGold(summary.total)}</strong>
        <button type="button" onClick={() => navigate("hoard")}>Explore chambers <ChevronRight size={15} /></button>
      </section>
      <div className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button key={metric.label} type="button" className="metric-card" onClick={() => setSheet({ type: "metric", id: metric.key, title: metric.label })}>
              <Icon size={22} />
              <span>{metric.label}</span>
              <strong>{formatGold(metric.value, 0)}</strong>
            </button>
          );
        })}
      </div>
      <section className="free-gold-card">
        <span><Coins size={20} /> Free Gold</span>
        <strong>{formatGold(summary.freeGold)}</strong>
        <small>After near-term commitments and your protected buffer</small>
      </section>
      <section className="daily-briefing"><div className="briefing-heading"><span><CloudSun size={20} /></span><div><small>Today in your Lair</small><strong>One calm look is enough.</strong></div></div><div className="briefing-grid">{nextClaimant ? <button type="button" onClick={() => setSheet({ type: "subscription", id: nextClaimant.id, title: nextClaimant.name })}><CalendarDays size={17} /><span><small>Next arrival</small><strong>{nextClaimant.name}</strong><em>{dayLabel(daysUntil(nextClaimant.nextCharge))} · {formatGold(nextClaimant.amount)}</em></span></button> : nextDebt ? <button type="button" onClick={() => setSheet({ type: "debt", id: nextDebt.id, title: nextDebt.name })}><LockKeyhole size={17} /><span><small>Next claim</small><strong>{nextDebt.name}</strong><em>{dayLabel(daysUntil(nextDebt.nextDue))}</em></span></button> : <button type="button" onClick={() => navigate("tribute")}><CalendarDays size={17} /><span><small>Next arrival</small><strong>Nothing mapped</strong><em>The hall is quiet.</em></span></button>}{suggestedQuest ? <button type="button" onClick={() => navigate("quests")}><Target size={17} /><span><small>Suggested · optional</small><strong>{suggestedQuest.title}</strong><em>{suggestedQuest.estimatedMinutes} min · {suggestedQuest.xp} XP</em></span></button> : <button type="button" onClick={() => navigate("journey")}><Map size={17} /><span><small>Path is clear</small><strong>Let steady be enough</strong><em>Return when useful.</em></span></button>}</div></section>
      <button className={`journey-portal route-${journeyChapter?.direction ?? "steady"}`} type="button" onClick={() => navigate("journey")}>
        <span className="journey-portal-map" aria-hidden="true" />
        <span className="journey-portal-avatar" style={{ "--journey-avatar": `url("${journeyAvatar.asset}")` } as React.CSSProperties} aria-hidden="true" />
        <span><small>Optional living story · {journeyChapter?.direction ?? "steady"} path</small><strong>{journeyChapter?.title ?? "The atlas is waking"}</strong><em>{unreviewedEstimates ? `${unreviewedEstimates} idle ${unreviewedEstimates === 1 ? "estimate" : "estimates"} ready` : "A useful chapter is ready"}</em></span>
        <ChevronRight size={20} />
      </button>
      {selectedPet && selectedPetStatus && (
        <button className={`pet-portal ${selectedPetStatus.due ? "pet-due" : ""}`} type="button" onClick={() => navigate("pets")}>
          <span className="pet-portal-art" style={{ "--pet-image": `url("${selectedPet.asset}")` } as React.CSSProperties} aria-hidden="true" />
          <span><small>Creature nook · {selectedPet.cadence}</small><strong>{selectedPet.name} {selectedPetStatus.due ? "is waiting for you" : "is happily nearby"}</strong><em>{selectedPetStatus.due ? "A gentle check-in is ready—never a penalty." : selectedPetStatus.label}</em></span>
          <span className="pet-portal-icon"><PawPrint size={20} /><ChevronRight size={16} /></span>
        </button>
      )}
      {(state.profile.dataMode === "personal" && (!state.transactions.length || !state.goals.length || !state.subscriptions.length)) && <SetupTrail state={state} navigate={navigate} setSheet={setSheet} />}
      <SectionTitle title="Upcoming events" action="View all" onAction={() => setSheet({ type: "events", title: "Upcoming events" })} />
      {state.profile.dataMode === "demo" ? <div className="event-list">
        <button type="button" onClick={() => setSheet({ type: "event", title: "Streamkeep returns", body: `A ${formatGold(15.49)} monthly tribute arrives in 2 days. It is covered by Available Gold.` })}>
          <span className="service-mini red">S</span><span><strong>Streamkeep</strong><small>Claimant returns</small></span><em>in 2 days</em><b>{formatGold(15.49)}</b>
        </button>
        <button type="button" onClick={() => setSheet({ type: "event", title: "Lair Energy", body: `The estimated ${formatGold(87.12)} electricity bill arrives in 5 days. No action is required.` })}>
          <span className="service-mini green"><Zap size={15} /></span><span><strong>Lair Energy</strong><small>Essential bill</small></span><em>in 5 days</em><b>{formatGold(87.12)}</b>
        </button>
        <button type="button" onClick={() => setSheet({ type: "event", title: "Skyforge payday", body: `Expected income of approximately ${formatGold(3240, 0)} lands in 8 days.` })}>
          <span className="service-mini blue"><Coins size={15} /></span><span><strong>Skyforge payday</strong><small>Expected income</small></span><em>in 8 days</em><b>+{formatGold(3240, 0)}</b>
        </button>
      </div> : <div className="event-list personal-events">
        {state.subscriptions.slice(0, 2).map((subscription) => <button type="button" key={subscription.id} onClick={() => setSheet({ type: "subscription", id: subscription.id, title: subscription.name })}><span className="service-mini" style={{ background: subscription.color }}>{subscription.glyph}</span><span><strong>{subscription.name}</strong><small>Claimant returns</small></span><em>in {dayLabel(daysUntil(subscription.nextCharge))}</em><b>{formatGold(subscription.amount)}</b></button>)}
        {state.debts.slice(0, 1).map((debt) => <button type="button" key={debt.id} onClick={() => setSheet({ type: "debt", id: debt.id, title: debt.name })}><span className="service-mini orange"><LockKeyhole size={15} /></span><span><strong>{debt.name}</strong><small>Minimum due</small></span><em>in {dayLabel(daysUntil(debt.nextDue))}</em><b>{formatGold(debt.minimum)}</b></button>)}
        {!state.subscriptions.length && !state.debts.length && <div className="event-empty"><CalendarDays size={20} /><span><strong>No arrivals mapped yet</strong><small>Add a claimant or debt only when it helps.</small></span></div>}
      </div>}
      <button className="lore-card" type="button" onClick={() => navigate("lore")}>
        <BookOpen size={25} /><span><strong>Lore Library and calculators</strong><small>Auto-filled illustrations with every assumption shown</small></span><ChevronRight size={18} />
      </button>
    </section>
  );
}

function HoardCheckPanel({ state, navigate, updateState, setSheet, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const check = getHoardCheck(state);
  const reviewKey = (review: typeof check.primaryReview) => review?.kind === "import" ? review.candidate.id : review?.kind === "transaction" ? review.transactionId : review?.kind === "reconciliation" ? review.accountId : review?.kind === "price-change" ? review.subscriptionId : undefined;
  const [sessionReviewKey] = useState(() => reviewKey(check.primaryReview));
  const review = !check.alreadyCompleted && reviewKey(check.primaryReview) === sessionReviewKey ? check.primaryReview : undefined;
  const finish = () => {
    updateState((previous) => completeHoardCheck(previous, getHoardCheck(previous)));
    setToast(check.alreadyCompleted ? "Today’s Hoard Check is already safely recorded" : `${check.kind === "weekly" ? "Weekly map" : "Hoard Check"} complete · fixed stewardship reward earned`);
  };
  const resolveEcho = (resolution: Parameters<typeof resolveCommittedCandidate>[3]) => {
    if (review?.kind !== "import") return;
    try {
      updateState((previous) => resolveCommittedCandidate(previous, review.batchId, review.candidate.id, resolution));
      setToast(resolution === "not-sure" ? "The echo remains visible for later" : "The ledger decision was saved; reconciliation may need a fresh check");
    } catch (problem) {
      setToast(problem instanceof Error ? problem.message : "That echo could not be updated");
    }
  };
  const openReview = () => {
    if (!review) return;
    if (review.kind === "transaction") setSheet({ type: "transaction", id: review.transactionId, title: "Review movement" });
    if (review.kind === "reconciliation") navigate("import");
    if (review.kind === "price-change") setSheet({ type: "subscription", id: review.subscriptionId, title: "Review recurring cost" });
  };
  return <section className={`hoard-check check-${check.ledgerStatus}`}>
    <div className="hoard-check-heading"><span><ShieldCheck size={22} /></span><div><small>{check.kind} Hoard Check</small><strong>{check.message}</strong></div><div className="check-currencies"><em><Flame size={13} /> {state.checkIns.returnEmbers}</em><em><BookOpen size={13} /> {state.checkIns.loreKeys}</em></div></div>
    <div className="check-facts"><span><b>{check.ledgerStatus === "mapped" ? "Mapped" : check.ledgerStatus === "needs-review" ? "Needs one glance" : check.ledgerStatus === "empty" ? "Ready to begin" : "Approximate"}</b><small>{check.mappedThrough ? `Through ${formatDate(check.mappedThrough)}` : "No confirmed date"}</small></span><span><b>{check.upcomingCount}</b><small>{check.upcomingLabel}</small></span></div>
    {review && <article className="check-review"><div><small>One useful thing</small><strong>{review.title}</strong><p>{review.body}</p></div>{review.kind === "import" ? <div className="check-review-actions"><button type="button" onClick={() => resolveEcho("both-happened")}>Both happened</button><button type="button" onClick={() => resolveEcho("one-is-echo")}>One is an echo</button>{review.candidate.lifecycleRelationship === "pending-posted" && <button type="button" onClick={() => resolveEcho("pending-posted")}>Pending became posted</button>}{review.candidate.transferCandidateId && <button type="button" onClick={() => resolveEcho("confirm-transfer")}>Confirm transfer</button>}<button type="button" onClick={() => resolveEcho("not-sure")}>Not sure</button></div> : <button type="button" onClick={openReview}>Open review <ChevronRight size={15} /></button>}</article>}
    <div className="hoard-check-footer"><p>Missed days remove nothing. Rewards recognise care, never balance size or spending.</p><button type="button" disabled={check.alreadyCompleted || Boolean(review)} onClick={finish}>{check.alreadyCompleted ? <><Check size={16} /> Recorded today</> : review ? "Finish the useful review first" : <><Sparkles size={16} /> Complete check</>}</button></div>
  </section>;
}

function PetsScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const selected = state.pets.find((pet) => pet.id === state.profile.selectedPetId) ?? state.pets[0];
  const selectedStatus = selected ? petCareStatus(selected) : null;
  const tend = (pet: Pet) => {
    updateState((previous) => {
      const current = previous.pets.find((item) => item.id === pet.id);
      if (!current) return previous;
      const care = petCareStatus(current);
      const bondGain = care.due ? 10 : 2;
      const milestone = `pet-${current.id}-${new Date().toISOString().slice(0, 10)}`;
      const nextPet = { ...current, lastInteraction: new Date().toISOString(), bondXp: current.bondXp + bondGain, mood: "bright" as const };
      const bondAdvanced = petBondLevel(nextPet) > petBondLevel(current);
      const progression = care.due ? addProgressionXp(previous, 5, milestone) : previous.progression;
      const bondRelic = `${current.name}'s Bond Token`;
      return {
        ...previous,
        pets: previous.pets.map((item) => item.id === current.id ? nextPet : item),
        progression: bondAdvanced ? { ...progression, relics: progression.relics.includes(bondRelic) ? progression.relics : [...progression.relics, bondRelic], unlockedCosmetics: progression.unlockedCosmetics.includes(`${current.name} Nook`) ? progression.unlockedCosmetics : [...progression.unlockedCosmetics, `${current.name} Nook`] } : progression,
      };
    });
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
    setToast(`${pet.name} feels seen${petCareStatus(pet).due ? " · +5 XP" : ""}`);
  };
  if (!selected || !selectedStatus) return <section className="screen screen-pets"><ScreenHeader icon={PawPrint} title="Creature Nook" back={() => navigate("lair")} /><div className="empty-state"><PawPrint size={38} /><strong>The nook is quiet.</strong><p>Your companions will arrive here.</p></div></section>;
  return (
    <section className="screen screen-pets">
      <ScreenHeader icon={PawPrint} title="Creature Nook" subtitle="Care that fits real life" back={() => navigate("lair")} action={<span className="bond-chip"><Heart size={14} /> Bond {petBondLevel(selected)}</span>} />
      <section className={`pet-sanctuary ${selectedStatus.due ? "is-due" : ""}`} style={{ "--pet-accent": selected.color } as React.CSSProperties}>
        <div className="sanctuary-runes"><i /><i /><i /><i /><i /></div>
        <span className="sanctuary-pet" style={{ "--pet-image": `url("${selected.asset}")` } as React.CSSProperties} aria-hidden="true" />
        <div className="sanctuary-copy"><small>{selected.species} · {selected.cadence} rhythm</small><strong>{selected.name}</strong><p>{selectedStatus.due ? `${selected.name} is ready for a gentle visit. Nothing was lost while you were away.` : `${selected.name} is settled and will invite you back when the time is right.`}</p><span>{selectedStatus.label}</span></div>
      </section>
      <div className="care-rhythm" aria-label="Care rhythm"><div><CalendarDays size={18} /><span><small>Daily</small><strong>Small hello</strong></span></div><div><Star size={18} /><span><small>Weekly</small><strong>Tend the nook</strong></span></div><div><Orbit size={18} /><span><small>Monthly</small><strong>Share a story</strong></span></div></div>
      <SectionTitle title="Your companions" />
      <div className="pet-list">
        {state.pets.map((pet) => {
          const care = petCareStatus(pet);
          const level = petBondLevel(pet);
          return (
            <article className={`pet-card ${selected.id === pet.id ? "selected" : ""} ${care.due ? "due" : ""}`} key={pet.id} style={{ "--pet-accent": pet.color } as React.CSSProperties}>
              <button className="pet-select" type="button" onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, selectedPetId: pet.id } }))} aria-label={`Show ${pet.name}`}>
                <span className="pet-thumb" style={{ "--pet-image": `url("${pet.asset}")` } as React.CSSProperties} aria-hidden="true" />
                <span className="pet-card-copy"><small>{pet.cadence} · bond {level}</small><strong>{pet.name}</strong><em>{care.label}</em><i><b style={{ width: `${Math.min(100, (pet.bondXp % 35) / 35 * 100)}%` }} /></i></span>
              </button>
              <button className="pet-tend" type="button" onClick={() => tend(pet)}><Heart size={14} /> {care.due ? "Tend now" : "Visit"}</button>
            </article>
          );
        })}
      </div>
      <section className="care-promise"><ShieldCheck size={25} /><span><strong>The Keeper&apos;s Promise</strong><p>Busy days do not hurt your companions. They wait without judgment, welcome you back, and every bond you earn remains yours.</p></span></section>
    </section>
  );
}

const JOURNEY_NODE_POSITIONS = [
  { left: 47, bottom: 5 }, { left: 34, bottom: 15 }, { left: 57, bottom: 25 }, { left: 72, bottom: 35 },
  { left: 53, bottom: 45 }, { left: 30, bottom: 54 }, { left: 42, bottom: 64 }, { left: 66, bottom: 73 },
  { left: 54, bottom: 78 }, { left: 68, bottom: 86 },
];

function JourneyScreen({ state, navigate, updateState, setSheet, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const chapter = latestJourneyChapter(state);
  const avatar = selectedJourneyAvatar(state);
  const latestSnapshot = state.journey.snapshots.at(-1);
  const chronologicalChapters = [...state.journey.chapters].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const actOneChapters = chronologicalChapters.filter((item) => item.narrativeLayer === "evergreen" && item.chapterNumber && item.chapterNumber <= JOURNEY_NODE_POSITIONS.length);
  const actOneProgress = new Set(actOneChapters.map((item) => item.chapterNumber)).size;
  const activeActOneNode = Math.max(0, Math.min(JOURNEY_NODE_POSITIONS.length - 1, actOneProgress - 1));
  const unclaimed = state.journey.idleRewards.filter((item) => !item.claimedAt).length;
  const directionMeta = chapter?.direction === "rising"
    ? { label: "Rising road", icon: TrendingUp, body: "Overall assets less debt moved meaningfully upward.", color: "#4fc67a" }
    : chapter?.direction === "sheltered"
      ? { label: "Sheltered road", icon: ShieldCheck, body: "The recent direction softened. The atlas offers protection, not punishment.", color: "#7c91e6" }
      : { label: "Steady road", icon: CloudSun, body: "The hoard stayed inside its calm comparison range.", color: "#e7b85d" };
  const DirectionIcon = directionMeta.icon;
  const updateIncome = (id: string, changes: Partial<DragonState["journey"]["incomeSources"][number]>) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, incomeSources: previous.journey.incomeSources.map((item) => item.id === id ? { ...item, ...changes } : item) } }));
  return (
    <section className="screen screen-journey">
      <ScreenHeader icon={Map} title="The Living Atlas" subtitle="An optional story shaped by real life" back={() => navigate("lair")} action={<button type="button" className="shard-chip" onClick={() => navigate("idle")}><Clock size={14} /> {unclaimed} new</button>} />
      <section className="journey-status" style={{ "--route-color": directionMeta.color } as React.CSSProperties}>
        <span className="journey-status-avatar" style={{ "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} aria-hidden="true" />
        <div><small>Today · {directionMeta.label}</small><strong>{chapter?.title ?? "A quiet page"}</strong><p>{directionMeta.body}</p><span><DirectionIcon size={16} /> {latestSnapshot ? `${latestSnapshot.change >= 0 ? "+" : "−"}${formatGold(Math.abs(latestSnapshot.change), 0)} since the previous snapshot` : "First snapshot recorded"}</span></div>
      </section>
      <section className="atlas-map" aria-label="Living Atlas level map">
        <div className="atlas-map-title"><small>Act I · The Ledger Wakes</small><strong>The Keeper and the Quiet Hoard</strong><span>{actOneProgress} / {JOURNEY_NODE_POSITIONS.length}</span></div>
        <div className="atlas-route" aria-hidden="true" />
        {JOURNEY_NODE_POSITIONS.map((position, index) => {
          const nodeChapter = actOneChapters.find((item) => item.chapterNumber === index + 1);
          const completed = index < activeActOneNode || actOneProgress === JOURNEY_NODE_POSITIONS.length;
          const current = index === activeActOneNode && actOneProgress < JOURNEY_NODE_POSITIONS.length;
          return <button
            key={index}
            type="button"
            className={`atlas-node ${completed ? "completed" : ""} ${current ? "current" : ""} ${nodeChapter ? `route-${nodeChapter.direction}` : "future"}`}
            style={{ left: `${position.left}%`, bottom: `${position.bottom}%` }}
            aria-label={nodeChapter ? `Open ${nodeChapter.title}` : current ? "Today's atlas point" : completed ? `Completed atlas point ${index + 1}` : `Future atlas point ${index + 1}`}
            onClick={() => nodeChapter ? setSheet({ type: "journey-story", id: nodeChapter.id, title: nodeChapter.title }) : setSheet({ type: "story", title: current ? "Today’s point" : "A future path", body: current ? "Today’s financial snapshot placed the party here. Open the chapter below to choose how to travel onward." : "This point opens with time and check-ins—not with a required balance." })}
          >{completed ? <Check size={15} /> : current ? <Route size={16} /> : <span>{index + 1}</span>}</button>;
        })}
        <span className="atlas-avatar-marker" style={{ left: `${JOURNEY_NODE_POSITIONS[activeActOneNode]?.left ?? 50}%`, bottom: `${JOURNEY_NODE_POSITIONS[activeActOneNode]?.bottom ?? 5}%`, "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} aria-hidden="true" />
      </section>
      {chapter && <button className={`today-chapter route-${chapter.direction}`} type="button" onClick={() => setSheet({ type: "journey-story", id: chapter.id, title: chapter.title })}><span className="chapter-scene" /><span><small>{chapter.narrativeLayer === "chronicle" ? "Personal Chronicle · replayable" : chapter.narrativeLayer === "evergreen" ? `Act I · chapter ${chapter.chapterNumber}` : "Living road · replayable"}</small><strong>{chapter.title}</strong><p>{chapter.selectedChoice ? chapter.ending : chapter.opening}</p><em>{chapter.selectedChoice ? `Choice carried: ${chapter.selectedChoice}` : "Choose how your keeper responds"}</em></span><ChevronRight size={20} /></button>}
      {chapter && <section className="journey-goal"><Target size={23} /><div><small>Suggested next step · optional</small><strong>{chapter.actionTitle}</strong><p>{chapter.actionDescription}</p></div>{chapter.goalCompletedAt ? <span className="goal-done"><Check size={17} /> Done</span> : <button type="button" onClick={() => navigate("quests")}>Open quest</button>}</section>}
      <div className="journey-tools"><button type="button" onClick={() => navigate("roster")}><span className="tool-avatar" style={{ "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} /><b>Choose keeper</b><small>{avatar.name}</small></button><button type="button" onClick={() => navigate("idle")}><Gem size={26} /><b>Idle vault</b><small>{unclaimed ? `${unclaimed} new ${unclaimed === 1 ? "estimate" : "estimates"}` : "Earnings illustrations"}</small></button><button type="button" onClick={() => navigate("collection")}><Sparkles size={26} /><b>Relic constellations</b><small>{state.checkIns.loreKeys} earned keys · cosmetic only</small></button><button type="button" onClick={() => navigate("legacy")}><Crown size={26} /><b>Permanent legacy</b><small>Levels never decrease</small></button></div>
      <section className="income-ledger"><SectionTitle title="Income routes" /><p>Classify each stream so chapters understand regular pay, variable contracts, commissions, interest, and dividends without treating estimates as guarantees.</p>{state.journey.incomeSources.map((source) => <article key={source.id}><div><Coins size={18} /><span><strong>{source.name}</strong><small>{formatGold(source.expectedAmount)} expected · {source.lastSeenAt ? `seen ${formatDate(source.lastSeenAt)}` : "planned"}</small></span></div><div className="income-controls"><select aria-label={`${source.name} income type`} value={source.kind} onChange={(event) => updateIncome(source.id, { kind: event.target.value as IncomeKind })}>{(["salary", "contract", "commission", "business", "interest", "dividend", "gift", "other"] as IncomeKind[]).map((kind) => <option key={kind}>{kind}</option>)}</select><select aria-label={`${source.name} cadence`} value={source.cadence} onChange={(event) => updateIncome(source.id, { cadence: event.target.value as IncomeCadence })}>{(["weekly", "fortnightly", "monthly", "quarterly", "annual", "irregular"] as IncomeCadence[]).map((cadence) => <option key={cadence}>{cadence}</option>)}</select><select aria-label={`${source.name} reliability`} value={source.reliability} onChange={(event) => updateIncome(source.id, { reliability: event.target.value as typeof source.reliability })}><option>steady</option><option>variable</option><option>seasonal</option></select></div></article>)}</section>
      <section className="journey-settings"><SectionTitle title="Story rhythm" /><label className="check-label"><input type="checkbox" checked={state.journey.enabled} onChange={(event) => { const enabled = event.target.checked; updateState((previous) => ({ ...previous, journey: { ...previous.journey, enabled } })); setToast(enabled ? "Living Atlas chapters enabled" : "Journey paused; all progress kept"); }} /> Enable optional Journey chapters</label><label>Chapter rhythm<select value={state.journey.cadence} onChange={(event) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, cadence: event.target.value as DragonState["journey"]["cadence"] } }))}><option value="daily">Daily check-in</option><option value="weekly">Weekly reflection</option><option value="pay-cycle">Pay-cycle or fortnightly</option></select></label><label>Compare with<select value={state.journey.comparisonDays} onChange={(event) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, comparisonDays: Number(event.target.value) } }))}><option value="1">Previous day</option><option value="7">About one week ago</option><option value="14">About a pay cycle ago</option><option value="30">About one month ago</option></select></label><label>Steady range <b>{state.journey.stabilityPercent.toFixed(2)}%</b><input type="range" min="0.1" max="2" step="0.05" value={state.journey.stabilityPercent} onChange={(event) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, stabilityPercent: Number(event.target.value) } }))} /></label><p>At most one chapter can be created per day. Pay-cycle mode also reacts to newly recorded income and otherwise checks in after fourteen days. A changing route never removes XP, titles, relics, cosmetics, or pet bonds.</p></section>
    </section>
  );
}

function RosterScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const selected = selectedJourneyAvatar(state);
  return <section className="screen screen-roster"><ScreenHeader icon={UserRound} title="Keeper Roster" subtitle="Choose who represents you" back={() => navigate("journey")} /><section className="roster-hero" style={{ "--avatar-color": selected.color } as React.CSSProperties}><span className="roster-hero-character" style={{ "--journey-avatar": `url("${selected.asset}")` } as React.CSSProperties} /><div><small>{selected.pronouns} · {selected.role}</small><strong>{selected.name}</strong><p>{selected.trait}</p><em>Changing keeper never changes financial data or progress.</em></div></section><div className="roster-grid">{JOURNEY_AVATARS.map((avatar) => <button type="button" key={avatar.id} className={selected.id === avatar.id ? "selected" : ""} style={{ "--avatar-color": avatar.color } as React.CSSProperties} onClick={() => { updateState((previous) => ({ ...previous, journey: { ...previous.journey, selectedAvatarId: avatar.id } })); setToast(`${avatar.name} joined the Journey`); }}><span style={{ "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} /><small>{avatar.role}</small><strong>{avatar.name.split(" ")[0]}</strong>{selected.id === avatar.id && <i><Check size={14} /></i>}</button>)}</div><p className="supportive-copy">The roster offers different perspectives, not financial advantages. Every keeper follows the same respectful, non-punitive rules.</p></section>;
}

function IdleVaultScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const rewards = state.journey.idleRewards;
  const unclaimed = rewards.filter((item) => !item.claimedAt);
  const unclaimedValue = unclaimed.reduce((sum, item) => sum + item.total, 0);
  const totalEstimated = rewards.reduce((sum, item) => sum + item.total, 0);
  const postedComparisons = rewards.flatMap((reward) => reward.sources).filter((source) => source.kind === "interest" && source.postedAmount !== undefined);
  const avatar = selectedJourneyAvatar(state);
  const collect = () => {
    if (!unclaimed.length) return;
    updateState((previous) => ({ ...previous, journey: { ...previous.journey, idleRewards: previous.journey.idleRewards.map((item) => item.claimedAt ? item : { ...item, claimedAt: new Date().toISOString() }) } }));
    setToast("Estimate acknowledged · real balances and game currency unchanged");
  };
  return <section className="screen screen-idle">
    <ScreenHeader icon={Gem} title="Idle Vault" subtitle="Estimated growth across dated balance and rate periods" back={() => navigate("journey")} action={<span className="shard-chip"><Clock size={14} /> {unclaimed.length} new</span>} />
    <section className="idle-hero"><span className="idle-character" style={{ "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} /><div><small>Estimated while you were away</small><strong>{formatGold(unclaimedValue)}</strong><p>{unclaimed.length ? `${unclaimed.length} estimate ${unclaimed.length === 1 ? "period is" : "periods are"} ready to inspect.` : "The vault is quietly watching eligible rates."}</p><button type="button" disabled={!unclaimed.length} onClick={collect}><Eye size={17} /> {unclaimed.length ? "Mark estimates reviewed" : "Nothing new to review"}</button></div></section>
    <aside className="estimate-guard"><ShieldCheck size={21} /><p><strong>Editable illustration, not a payment or prediction.</strong> Estimates never alter balances, transactions, cash flow, debt, investment units, tax records, XP, or collection currency.</p></aside>
    <div className="idle-summary"><div><span>All-time illustration</span><strong>{formatGold(totalEstimated)}</strong></div><div><span>Yield sources</span><strong>{rewards.flatMap((item) => item.sources).length}</strong></div><div><span>Maximum interval</span><strong>1 year</strong></div></div>
    <SectionTitle title="Estimated periods" />
    {rewards.length ? <div className="reward-list">{rewards.slice(0, 8).map((reward) => <article key={reward.id} className={reward.claimedAt ? "claimed" : "ready"}><span className="reward-gem"><Gem size={21} /></span><div><small>{formatDate(reward.from)} → {formatDate(reward.to)}</small><strong>{formatGold(reward.total)} estimated</strong>{reward.sources.map((source) => <div className="idle-source" key={source.id}><p><span>{source.kind === "interest" ? "Interest estimate" : "Dividend illustration"} · {source.label}</span><b>{formatGold(source.amount)}</b></p>{source.kind === "interest" && <div><small>Base {formatGold(source.baseAmount ?? source.amount)}</small>{Boolean(source.promotionalAmount) && <small>Promo uplift {formatGold(source.promotionalAmount ?? 0)}</small>}{source.bonusStatus === "unknown" && <small>Bonus not assumed</small>}</div>}<em>{source.assumption}</em></div>)}</div><em>{reward.claimedAt ? "Reviewed" : "New"}</em></article>)}</div> : <div className="empty-state"><Clock size={34} /><strong>The vault has just begun watching.</strong><p>Add an APY to a savings account or a dividend yield to an investment, then return later.</p></div>}
    {postedComparisons.length > 0 && <section className="posted-interest-comparison"><SectionTitle title="Posted interest comparison" />{postedComparisons.slice(0, 4).map((source) => <div key={`${source.id}-${source.from}`}><span><strong>{source.label}</strong><small>Real posted movement remains separate</small></span><p><b>{formatGold(source.postedAmount ?? 0)} posted</b><em>{formatGold(source.amount)} estimated · difference {formatGold(Math.abs(source.differenceFromPosted ?? 0))}</em></p></div>)}</section>}
    <section className="idle-source-notes"><SectionTitle title="How estimates work" /><p>DragonMode splits the interval at confirmed balance changes, transaction dates, rate changes, and promotion start/end dates. Unknown bonus conditions are excluded. Dividend yield remains a separate illustration because holding eligibility and distributions may differ. Posted interest is compared beside the estimate and is never duplicated or folded into it.</p><button type="button" className="secondary-button full" onClick={() => navigate("hoard")}><Landmark size={17} /> Review account rates</button><button type="button" className="secondary-button full" onClick={() => navigate("investments")}><Sprout size={17} /> Review investment yields</button></section>
  </section>;
}

const FESTIVAL_CHAPTERS = [
  "A Second Footstep",
  "The Mirror Ledger",
  "Two Tickets at Moonfair",
  "The Vanishing Hold",
  "The River Between Vaults",
  "Ink That Remembers",
  "The Balanced Bell",
  "The Restored Archive",
];

function CollectionScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const selectedSet = RELIC_SETS.find((set) => set.id === state.collection.targetedSetId) ?? RELIC_SETS[0];
  const setItems = RELIC_ITEMS.filter((item) => item.setId === selectedSet.id);
  const owned = new Set(state.collection.ownedItemIds);
  const unseen = setItems.filter((item) => !owned.has(item.id));
  const choiceDue = collectionChoiceDue(state) && unseen.length > 0;
  const reveal = (mode: "surprise" | "targeted" | "crafted" | "choice", chosenItemId?: string) => {
    try {
      const next = revealRelic(state, mode, { setId: selectedSet.id, chosenItemId, eventId: crypto.randomUUID() });
      const newest = next.collection.reveals[0];
      const item = RELIC_ITEMS.find((candidate) => candidate.id === newest?.itemId);
      updateState(() => next);
      playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
      setToast(newest?.duplicate ? `${item?.name ?? "Relic"} echoed · Stardust returned` : `${item?.name ?? "A new relic"} joined the constellation`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "That constellation could not be revealed");
    }
  };
  return <section className="screen screen-collection">
    <ScreenHeader icon={Sparkles} title="Relic Constellations" subtitle="Earned-only, cosmetic collections" back={() => navigate("journey")} action={<span className="lore-key-chip"><BookOpen size={14} /> {state.checkIns.loreKeys} keys</span>} />
    <section className="collection-promise"><ShieldCheck size={25} /><div><small>The Keeper&apos;s fair-play promise</small><strong>No purchases. No power. No financial advantage.</strong><p>Lore Keys come only from healthy app actions. Odds are always visible, every item stays obtainable, and duplicates become deterministic crafting progress. Legacy Star Shards are preserved one-for-one as Stardust.</p></div></section>
    <section className="season-banner"><span><Sparkles size={25} /></span><div><small>Optional story season · available permanently</small><strong>Festival of Echoes</strong><p>A mystery about duplicate records, pending echoes, transfers, and the human truth behind a balanced ledger.</p></div><label className="check-label"><input type="checkbox" checked={state.collection.seasonsEnabled} onChange={(event) => updateState((previous) => ({ ...previous, collection: { ...previous.collection, seasonsEnabled: event.target.checked } }))} /> Seasonal stories enabled</label></section>
    <div className="festival-chapters" aria-label="Festival of Echoes chapters">{FESTIVAL_CHAPTERS.map((title, index) => <span key={title}><i>{index + 1}</i>{title}</span>)}</div>
    <section className="collection-controls">
      <SectionTitle title="Choose a constellation" />
      <label>Targeted set<select value={selectedSet.id} onChange={(event) => updateState((previous) => ({ ...previous, collection: { ...previous.collection, targetedSetId: event.target.value } }))}>{RELIC_SETS.filter((set) => set.available).map((set) => <option value={set.id} key={set.id}>{set.name}{set.archived ? " · archive" : ""}</option>)}</select></label>
      <div className="relic-odds" aria-label="Visible relic odds"><span><b>{Math.round(RELIC_ODDS.common * 100)}%</b> Common</span><span><b>{Math.round(RELIC_ODDS.rare * 100)}%</b> Rare</span><span><b>{Math.round(RELIC_ODDS.mythic * 100)}%</b> Mythic</span></div>
      <div className="guarantee-track"><p><strong>New-relic protection</strong><span>{Math.min(4, state.collection.pullsSinceNew)} / 4 echoes</span></p><i><b style={{ width: `${Math.min(100, state.collection.pullsSinceNew / 4 * 100)}%` }} /></i><small>Your fifth key reveal is new in the targeted set when it still has an unseen item. A Mythic appears by reveal 30.</small></div>
      {choiceDue ? <section className="relic-choice"><strong>Your twelfth reveal is your choice</strong><p>Choose from three unseen relics in the targeted constellation. It costs one earned Lore Key.</p><div>{unseen.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => reveal("choice", item.id)}><Star size={16} /> {item.name} <small>{item.rarity}</small></button>)}</div></section> : <div className="reveal-actions"><button type="button" disabled={!state.collection.seasonsEnabled || state.checkIns.loreKeys < 1} onClick={() => reveal("surprise")}><Sparkles size={18} /> Surprise reveal</button><button type="button" disabled={!state.collection.seasonsEnabled || state.checkIns.loreKeys < 1} onClick={() => reveal("targeted")}><Target size={18} /> Target {selectedSet.name}</button></div>}
      <p className="collection-balance"><BookOpen size={16} /> {state.checkIns.loreKeys} earned Lore Keys <span>·</span> <Sparkles size={16} /> {state.collection.stardust} Stardust</p>
    </section>
    <SectionTitle title={`${selectedSet.name} relics`} />
    <div className="relic-grid">{setItems.map((item) => {
      const isOwned = owned.has(item.id);
      return <article key={item.id} className={`${isOwned ? "owned" : "unseen"} rarity-${item.rarity}`}><span>{item.type === "dragon" ? <Flame size={24} /> : item.type === "chronicle" ? <BookOpen size={24} /> : item.type === "sound" ? <Volume2 size={24} /> : <Gem size={24} />}</span><div><small>{item.rarity} · {item.type}</small><strong>{isOwned ? item.name : "Unseen relic"}</strong><p>{isOwned ? item.description : "Reveal it with an earned key or craft it directly with Stardust."}</p></div>{isOwned ? <em><Check size={14} /> Collected</em> : <button type="button" disabled={state.collection.stardust < item.craftCost} onClick={() => reveal("crafted", item.id)}><Hammer size={14} /> Craft · {item.craftCost}</button>}</article>;
    })}</div>
    <section className="reveal-history"><SectionTitle title="Reveal history" /><p>Every result is recorded so the system remains inspectable.</p>{state.collection.reveals.length ? state.collection.reveals.slice(0, 12).map((record) => { const item = RELIC_ITEMS.find((candidate) => candidate.id === record.itemId); return <div key={record.id}><span><strong>{item?.name ?? "Relic"}</strong><small>{record.mode} · {record.rarity}{record.duplicate ? " · echo" : ""}</small></span><time>{formatDate(record.revealedAt)}</time></div>; }) : <div className="empty-state compact"><Star size={28} /><strong>No reveals yet.</strong><p>Complete Hoard Checks or Lore cards to earn keys without spending money.</p></div>}</section>
  </section>;
}

function HoardScreen({ state, summary, navigate, setSheet }: { state: DragonState; summary: ReturnType<typeof getHoardSummary>; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const [view, setView] = useState<"Chambers" | "Accounts" | "Transactions">("Chambers");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All chambers");
  const [accountFilter, setAccountFilter] = useState("All accounts");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [filterNow] = useState(() => Date.now());
  const filteredTransactions = searchTransactions(state.transactions, query).filter((transaction) => {
    const categoryMatches = categoryFilter === "All chambers" || transaction.category === categoryFilter;
    const accountMatches = accountFilter === "All accounts" || transaction.accountId === accountFilter;
    const typeMatches = transactionFilter === "All"
      || (transactionFilter === "Recurring" && Boolean(transaction.recurringSeriesId))
      || (transactionFilter === "Unusual" && Boolean(transaction.unusual))
      || (transactionFilter === "Pending" && transaction.status === "pending");
    const ageDays = (filterNow - new Date(transaction.date).getTime()) / 86_400_000;
    const dateMatches = dateFilter === "All dates" || (dateFilter === "This month" && new Date(transaction.date).getMonth() === new Date().getMonth() && new Date(transaction.date).getFullYear() === new Date().getFullYear()) || (dateFilter === "Last 30 days" && ageDays <= 30) || (dateFilter === "Last 90 days" && ageDays <= 90);
    return categoryMatches && accountMatches && typeMatches && dateMatches;
  });
  if (!state.accounts.length) return <section className="screen screen-hoard hoard-empty"><ScreenHeader icon={Landmark} title="Hoard" subtitle="Treasury chambers" action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-account", title: "Add your first account" })}><Plus size={21} /></button>} /><section className="hoard-empty-hero"><span aria-hidden="true" /><div><small>The treasury doors are open</small><strong>Map the first piece of your hoard.</strong><p>Cash, transaction, savings, credit, loan, investment, or another asset—start with only what feels useful.</p><button type="button" onClick={() => setSheet({ type: "add-account", title: "Add your first account" })}><Landmark size={17} /> Add an account</button></div></section><div className="empty-chamber-preview">{state.chambers.slice(0, 4).map((chamber) => { const Icon = ICONS[chamber.icon] ?? Gem; return <div key={chamber.id} style={{ "--chamber": chamber.color } as React.CSSProperties}><span><Icon size={19} /></span><strong>{chamber.name}</strong><small>{chamber.practicalName}</small></div>; })}</div><section className="local-promise"><ShieldCheck size={23} /><div><strong>Approximate is allowed.</strong><p>Every value can be edited, excluded from the total, archived, or exported later.</p></div></section></section>;
  return (
    <section className={`screen screen-hoard hoard-view-${view.toLowerCase()}`}>
      <ScreenHeader icon={Landmark} title="Hoard" subtitle="Treasury chambers" action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })} aria-label="Add transaction"><Plus size={21} /></button>} />
      <section className="hoard-total">
        <div className="crystal-cluster"><Gem size={30} /><Coins size={31} /><Gem size={22} /></div>
        <span>Total hoard value</span><strong>{formatGold(summary.total)}</strong><small>Across {state.accounts.length} accounts</small>
      </section>
      <button type="button" className="trusted-import-entry" onClick={() => navigate("import")}>
        <span><Upload size={22} /></span>
        <span><small>Trusted Ledger</small><strong>Paste or import transactions</strong><em>Preview, match, reconcile, and undo</em></span>
        <ChevronRight size={19} />
      </button>
      <Segmented options={["Chambers", "Accounts", "Transactions"]} value={view} onChange={(value) => setView(value as typeof view)} />
      {view === "Chambers" && (
        <div className="chamber-list">
          {state.chambers.map((chamber) => {
            const Icon = ICONS[chamber.icon] ?? Gem;
            const progress = chamber.target > 0 ? Math.min(100, Math.round((chamber.amount / chamber.target) * 100)) : 0;
            return (
              <button key={chamber.id} type="button" className="chamber-card" style={{ "--chamber": chamber.color } as React.CSSProperties} onClick={() => setSheet({ type: "chamber", id: chamber.id, title: chamber.name })}>
                <span className="chamber-icon"><Icon size={25} /></span>
                <span className="chamber-copy"><strong>{chamber.name}</strong><small>{chamber.practicalName}</small><i><b style={{ width: `${progress}%` }} /></i></span>
                <span className="chamber-value"><strong>{formatGold(chamber.amount)}</strong><small>{progress}% of target</small></span>
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      )}
      {view === "Accounts" && (
        <>
          <div className="cream-list">
            {state.accounts.filter((account) => !account.archived).map((account) => {
              const AccountIcon = ICONS[account.icon] ?? (account.type === "credit" ? CreditCard : account.type === "investment" ? Sprout : account.type === "savings" ? LockKeyhole : WalletCards);
              return <button key={account.id} type="button" onClick={() => setSheet({ type: "account", id: account.id, title: account.name })}>
                <span className={`round-icon ${account.type}`} style={{ "--account": account.color } as React.CSSProperties}><AccountIcon size={20} /></span><span><strong>{account.name}</strong><small>{account.institutionName || account.type} · {account.reconciliationStatus === "reconciled" ? "Reconciled" : account.reconciliationStatus === "needs-review" ? "Needs review" : account.reconciliationStatus === "stale" ? "Stale" : "Approximate"}{account.importedThrough ? ` through ${formatDate(account.importedThrough)}` : ""}</small></span><b>{formatGold(account.balance)}</b><ChevronRight size={17} />
              </button>;
            })}
            <button className="add-row" type="button" onClick={() => setSheet({ type: "add-account", title: "Add an account" })}><Plus size={19} /> Add account</button>
          </div>
          <SceneCompanion asset="/characters/pet-quill-v1.png" eyebrow="The keykeeper" title="Quill knows every vault door" body="Account names, institutions, and chamber links stay editable. The fox only keeps the map tidy." icons={[LockKeyhole, WalletCards, Landmark]} />
        </>
      )}
      {view === "Transactions" && (
        <>
        <div className="transaction-panel">
          <div className="transaction-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movements" aria-label="Search transactions" /></div>
          <div className="transaction-filters">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by chamber"><option>All chambers</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select>
            <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} aria-label="Filter by account"><option>All accounts</option>{state.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date"><option>All dates</option><option>This month</option><option>Last 30 days</option><option>Last 90 days</option></select>
          </div>
          <Segmented options={["All", "Recurring", "Unusual", "Pending"]} value={transactionFilter} onChange={setTransactionFilter} compact />
          <button className="primary-button full" type="button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })}><Plus size={18} /> Add transaction</button>
          {filteredTransactions.map((transaction) => (
            <button key={transaction.id} type="button" className="transaction-row" onClick={() => setSheet({ type: "transaction", id: transaction.id, title: transaction.merchant })}>
              <span className={`transaction-glyph ${transaction.unusual ? "unusual" : ""}`}>{transaction.unusual ? "!" : transaction.merchant.slice(0, 1)}</span>
              <span><strong>{transaction.merchant}</strong><small>{formatDate(transaction.date)} · {transaction.category}{transaction.status === "pending" ? " · Pending" : ""}</small></span>
              <b className={transaction.transfer ? "transfer" : transaction.direction}>{transaction.transfer ? "↔" : transaction.direction === "income" ? "+" : "−"}{formatGold(transaction.amount)}</b>
            </button>
          ))}
          {!filteredTransactions.length && <div className="empty-state"><Search size={28} /><strong>No treasure movements found.</strong><p>Try clearing one of the filters.</p></div>}
        </div>
        <div className="ledger-seals"><span><ShieldCheck size={16} /><b>{state.transactions.filter((item) => item.reviewedAt).length}</b><small>reviewed</small></span><span><ScrollText size={16} /><b>{state.transactions.filter((item) => item.recurringSeriesId).length}</b><small>recurring</small></span><span><Star size={16} /><b>{state.transactions.filter((item) => item.worthRating).length}</b><small>worth rated</small></span></div>
        </>
      )}
      <button className="secondary-button full" type="button" onClick={() => setSheet({ type: "reorganise", title: "Reorganise treasure" })}><Menu size={18} /> Reorganise treasure</button>
    </section>
  );
}

function ImportScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [source, setSource] = useState("");
  const [sourceName, setSourceName] = useState("Pasted transactions");
  const [sourceKind, setSourceKind] = useState<ImportBatch["sourceKind"]>("paste");
  const [accountId, setAccountId] = useState(state.accounts.find((account) => !account.archived)?.id ?? "");
  const [dateOrder, setDateOrder] = useState<ImportBatch["dateOrder"]>(state.profile.locale.startsWith("en-US") ? "MDY" : "DMY");
  const [signConvention, setSignConvention] = useState<ImportBatch["signConvention"]>("negative-expense");
  const [templateId, setTemplateId] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [staged, setStaged] = useState<ImportBatch | null>(null);
  const [error, setError] = useState("");

  const preview = () => {
    try {
      const mappingTemplate = state.imports.mappingTemplates.find((template) => template.id === templateId);
      const next = stageTextImport(state, source, { accountId, sourceKind, sourceDisplayName: sourceName, dateOrder, signConvention, locale: state.profile.locale, currency: state.profile.preferredCurrency, mappingTemplate });
      setStaged(next);
      setError("");
    } catch (problem) {
      setStaged(null);
      setError(problem instanceof Error ? problem.message : "DragonMode could not stage this source");
    }
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const kind = extension === "ofx" || extension === "qfx" || extension === "qif" ? extension : extension === "csv" ? "csv" : "statement-text";
    try {
      const text = await file.text();
      setSource(text);
      setSourceName(file.name);
      setSourceKind(kind);
      setStaged(null);
      setError("");
      setToast(`${file.name} is ready for a safe preview`);
    } catch {
      setError("That file could not be read on this device");
    }
  };

  const resolve = (candidateId: string, resolution: Parameters<typeof resolveImportCandidate>[2]) => {
    setStaged((current) => current ? resolveImportCandidate(current, candidateId, resolution) : current);
  };

  const updateCandidate = (candidateId: string, changes: Partial<ImportBatch["candidates"][number]>) => {
    setStaged((current) => current ? { ...current, candidates: current.candidates.map((candidate) => candidate.id === candidateId ? { ...candidate, ...changes } : candidate) } : current);
  };

  const rememberRule = (candidate: ImportBatch["candidates"][number]) => {
    const pattern = candidate.originalDescription.trim();
    if (!pattern) return;
    updateState((previous) => ({
      ...previous,
      imports: {
        ...previous.imports,
        rules: [{ id: crypto.randomUUID(), name: `${candidate.normalizedMerchant} cleanup`, merchantPattern: pattern, accountId: candidate.accountId, renameMerchant: candidate.normalizedMerchant, category: candidate.categorySuggestion, priority: 10, lastUsedAt: new Date().toISOString() }, ...previous.imports.rules.filter((rule) => !(rule.accountId === candidate.accountId && rule.merchantPattern.toLowerCase() === pattern.toLowerCase()))],
      },
    }));
    setToast("A readable cleanup rule was saved for future imports");
  };

  const saveMappingTemplate = () => {
    const delimiter = source.includes("\t") ? "\t" : source.split("\n")[0]?.includes(";") ? ";" : ",";
    const id = crypto.randomUUID();
    updateState((previous) => ({ ...previous, imports: { ...previous.imports, mappingTemplates: [{ id, name: sourceName === "Pasted transactions" ? `Saved mapping ${previous.imports.mappingTemplates.length + 1}` : sourceName, delimiter, dateOrder, signConvention, columns: { date: "Date", description: "Description", amount: "Amount", debit: "Debit", credit: "Credit", status: "Status", sourceId: "Transaction ID" } }, ...previous.imports.mappingTemplates] } }));
    setTemplateId(id);
    setToast("This column mapping will be available next time");
  };

  const commit = () => {
    if (!staged) return;
    const unresolved = staged.candidates.filter((candidate) => candidate.proposedAction === "hold" && !candidate.resolution);
    if (unresolved.length) {
      setError(`Choose what happened for ${unresolved.length} possible ${unresolved.length === 1 ? "echo" : "echoes"}, or mark them Not sure.`);
      return;
    }
    try {
      const numericClosing = closingBalance.trim() === "" ? undefined : Number(closingBalance);
      if (numericClosing !== undefined && !Number.isFinite(numericClosing)) throw new Error("Enter a valid closing balance or leave it blank");
      updateState((previous) => commitImportBatch(previous, staged, {
        closingBalance: numericClosing,
        periodEnd: `${periodEnd}T12:00:00.000Z`,
      }));
      const held = staged.candidates.filter((candidate) => candidate.resolution === "not-sure").length;
      setStaged(null);
      setSource("");
      setClosingBalance("");
      setError("");
      setToast(held ? `Import committed; ${held} uncertain ${held === 1 ? "row is" : "rows are"} safely held` : "Import committed with a reversible receipt");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Import could not be committed");
    }
  };

  const undo = (batchId: string) => {
    try {
      updateState((previous) => undoImportBatch(previous, batchId));
      setToast("Import undone; the earlier financial state was restored");
    } catch (problem) {
      setToast(problem instanceof Error ? problem.message : "This import could not be undone");
    }
  };

  const unresolvedCount = staged?.candidates.filter((candidate) => candidate.proposedAction === "hold" && !candidate.resolution).length ?? 0;
  const safeCount = staged?.candidates.filter((candidate) => candidate.proposedAction === "add" || candidate.resolution === "both-happened" || candidate.resolution === "keep" || candidate.resolution === "pending-posted" || candidate.resolution === "confirm-transfer").length ?? 0;
  const skippedCount = staged?.candidates.filter((candidate) => candidate.proposedAction === "skip-exact" || candidate.resolution === "one-is-echo" || candidate.resolution === "ignore").length ?? 0;

  return <section className="screen screen-import">
    <ScreenHeader icon={Upload} title="Trusted Ledger" subtitle="Paste, preview, reconcile, and undo" back={() => navigate("hoard")} />
    <aside className="estimate-guard"><ShieldCheck size={21} /><p><strong>Nothing changes during preview.</strong> DragonMode keeps the original row beside its interpretation and never deletes a similar charge merely because the date, merchant, and amount match.</p></aside>
    {!state.accounts.length ? <div className="empty-state"><Landmark size={34} /><strong>Add an account before importing</strong><p>DragonMode needs to know which register these rows belong to.</p><button type="button" onClick={() => navigate("hoard")}>Return to the Hoard</button></div> : <>
      <section className="import-source-card">
        <label>Account<select value={accountId} onChange={(event) => { setAccountId(event.target.value); setStaged(null); }}>{state.accounts.filter((account) => !account.archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        {state.imports.mappingTemplates.length > 0 && <label>Saved mapping<select value={templateId} onChange={(event) => { const id = event.target.value; setTemplateId(id); const template = state.imports.mappingTemplates.find((item) => item.id === id); if (template) { setDateOrder(template.dateOrder); setSignConvention(template.signConvention); } setStaged(null); }}><option value="">Detect this source automatically</option>{state.imports.mappingTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>}
        <div className="import-mapping-row"><label>Date order<select value={dateOrder} onChange={(event) => { setDateOrder(event.target.value as ImportBatch["dateOrder"]); setStaged(null); }}><option value="DMY">Day / month / year</option><option value="MDY">Month / day / year</option><option value="YMD">Year / month / day</option></select></label><label>Amount signs<select value={signConvention} onChange={(event) => { setSignConvention(event.target.value as ImportBatch["signConvention"]); setStaged(null); }}><option value="negative-expense">Negative means money out</option><option value="positive-expense">Positive means money out</option><option value="debit-credit-columns">Separate debit and credit columns</option></select></label></div>
        <label>Paste bank rows or CSV<textarea value={source} onChange={(event) => { setSource(event.target.value); setSourceName("Pasted transactions"); setSourceKind("paste"); setStaged(null); }} placeholder={"Date,Description,Amount,Transaction ID\n21/07/2026,Hearth Market,-45.20,abc-123"} /></label>
        <div className="import-actions"><label className="secondary-button"><Upload size={17} /> Choose a bank export<input type="file" accept=".csv,.txt,.ofx,.qfx,.qif,text/plain,text/csv" onChange={(event) => loadFile(event.target.files?.[0])} /></label><button type="button" className="primary-button" disabled={!source.trim() || !accountId} onClick={preview}><Eye size={17} /> Preview interpretation</button></div>
        <p className="fine-print">Your source remains in this device copy for provenance and undo. No bank credentials are requested.</p>
      </section>
      {error && <p className="import-error" role="alert">{error}</p>}
      {staged && <section className="import-preview">
        <div className="import-preview-heading"><div><small>{staged.sourceDisplayName}</small><strong>{staged.candidates.length} interpreted {staged.candidates.length === 1 ? "row" : "rows"}</strong><p>{safeCount} ready · {skippedCount} already safe · {unresolvedCount} need your truth</p><button type="button" className="inline-link" onClick={saveMappingTemplate}>Save this source mapping</button></div><span>{Math.round(staged.candidates.reduce((sum, candidate) => sum + candidate.confidence, 0) / staged.candidates.length * 100)}% parser confidence</span></div>
        {staged.ambiguityWarnings.length > 0 && <div className="import-error" role="alert"><strong>Confirm the batch interpretation before committing.</strong> {staged.ambiguityWarnings.join(" ")}</div>}
        <div className="candidate-list">{staged.candidates.map((candidate) => {
          const account = state.accounts.find((item) => item.id === candidate.accountId);
          const held = candidate.proposedAction === "hold";
          const resolved = Boolean(candidate.resolution);
          return <article key={candidate.id} className={`${held ? "candidate-held" : "candidate-safe"} ${resolved ? "candidate-resolved" : ""}`}>
            <header><span><small>{formatDate(candidate.date)} · {account?.name}</small><strong>{candidate.normalizedMerchant}</strong><em>Original: {candidate.originalDescription}</em></span><b>{candidate.direction === "expense" ? "−" : "+"}{formatGold(candidate.amount)}</b></header>
            <div className="candidate-meta"><span>{candidate.status}</span><span>{candidate.categorySuggestion}</span>{candidate.lifecycleRelationship && <span>{candidate.lifecycleRelationship.replace("-", " → ")}</span>}<span>row {candidate.rawRowNumber}</span><span>{Math.round(candidate.confidence * 100)}% clear</span></div>
            <div className="candidate-edit"><label>Clean merchant<input value={candidate.normalizedMerchant} onChange={(event) => updateCandidate(candidate.id, { normalizedMerchant: event.target.value })} /></label><label>Category<select value={candidate.categorySuggestion} onChange={(event) => updateCandidate(candidate.id, { categorySuggestion: event.target.value })}><option>Uncategorised</option><option>Income</option>{state.chambers.map((chamber) => <option key={chamber.id}>{chamber.name}</option>)}</select></label><button type="button" onClick={() => rememberRule(candidate)}>Remember cleanup</button></div>
            {candidate.proposedAction === "skip-exact" && <p className="candidate-status safe"><Check size={15} /> Already imported from the same source identity; it will be skipped.</p>}
            {held && <div className="candidate-decision"><p><strong>DragonMode noticed a possible relationship.</strong> {candidate.duplicateReasons.join(" ")}</p><div>
              <button type="button" className={candidate.resolution === "both-happened" ? "selected" : ""} onClick={() => resolve(candidate.id, "both-happened")}>Both happened</button>
              <button type="button" className={candidate.resolution === "one-is-echo" ? "selected" : ""} onClick={() => resolve(candidate.id, "one-is-echo")}>One is an echo</button>
              {candidate.lifecycleRelationship === "pending-posted" && <button type="button" className={candidate.resolution === "pending-posted" ? "selected" : ""} onClick={() => resolve(candidate.id, "pending-posted")}>Pending became posted</button>}
              {candidate.transferCandidateId && <button type="button" className={candidate.resolution === "confirm-transfer" ? "selected" : ""} onClick={() => resolve(candidate.id, "confirm-transfer")}>Confirm transfer</button>}
              <button type="button" className={candidate.resolution === "not-sure" ? "selected" : ""} onClick={() => resolve(candidate.id, "not-sure")}>Not sure</button>
            </div></div>}
            <details><summary>Show original source row</summary><code>{candidate.rawSourceRow}</code><p>Fingerprint {candidate.fingerprint} · parser {staged.parserVersion}</p></details>
          </article>;
        })}</div>
        {Boolean(staged.skippedSourceRows?.length) && <details className="skipped-source-rows"><summary>{staged.skippedSourceRows!.length} source {staged.skippedSourceRows!.length === 1 ? "row was" : "rows were"} not treated as transactions</summary>{staged.skippedSourceRows!.map((row) => <p key={`${row.rowNumber}-${row.raw}`}><b>Row {row.rowNumber} · {row.reason}</b><code>{row.raw}</code></p>)}</details>}
        <section className="reconciliation-entry"><div><strong>Optional balance confirmation</strong><p>Enter the statement closing balance to check whether accepted rows explain the account.</p></div><label>Closing balance<input inputMode="decimal" value={closingBalance} onChange={(event) => setClosingBalance(event.target.value)} placeholder="Leave blank if unknown" /></label><label>Statement through<input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label></section>
        <button type="button" className="primary-button full" onClick={commit}><ShieldCheck size={18} /> Commit safe decisions and create receipt</button>
      </section>}
      <SectionTitle title="Import receipts" />
      {state.imports.batches.length ? <div className="receipt-list">{state.imports.batches.slice(0, 10).map((batch) => {
        const reconciliation = state.imports.reconciliations.find((item) => item.id === batch.reconciliationId);
        return <article key={batch.id} className={`receipt-${batch.status}`}><span><Upload size={19} /></span><div><small>{formatDate(batch.importedAt ?? batch.createdAt)} · {batch.sourceDisplayName}</small><strong>{batch.receiptNote ?? `${batch.candidates.length} staged rows`}</strong><p>{reconciliation ? `${reconciliation.status === "reconciled" ? "Reconciled" : "Needs review"} · difference ${formatGold(Math.abs(reconciliation.difference))}` : "No closing balance supplied"}</p></div>{batch.status === "committed" && batch.undoSnapshot ? <button type="button" onClick={() => undo(batch.id)}>Undo</button> : <em>{batch.status}</em>}</article>;
      })}</div> : <div className="empty-state compact"><Clock size={28} /><strong>No import receipts yet</strong><p>Your first committed batch will remain traceable here.</p></div>}
    </>}
  </section>;
}

function QuestScreen({ state, navigate, updateState, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const [filter, setFilter] = useState("All");
  const active = getActiveQuests(state);
  const visible = active.filter((quest) => filter === "All" || quest.category === filter);
  const updateQuest = (quest: Quest, changes: Partial<Quest>) => updateState((previous) => ({
    ...previous,
    quests: previous.quests.some((item) => item.id === quest.id)
      ? previous.quests.map((item) => item.id === quest.id ? { ...item, ...changes } : item)
      : [...previous.quests, { ...quest, ...changes }],
  }));
  return (
    <section className="screen screen-quests">
      <ScreenHeader icon={Sparkles} title="Quest Board" subtitle="Small steps. Permanent progress." action={<span className="xp-chip"><Star size={14} /> {state.progression.xp} XP</span>} />
      <Segmented options={["All", "Guard", "Grow", "Learn", "Tend"]} value={filter} onChange={setFilter} compact />
      <button className="wish-portal" type="button" onClick={() => navigate("wish")}>
        <span><Star size={24} /><i /></span><div><strong>Dragon&apos;s Rest</strong><small>{state.wishes.some((wish) => wish.status === "resting") ? `${state.wishes.filter((wish) => wish.status === "resting").length} considered wish${state.wishes.filter((wish) => wish.status === "resting").length === 1 ? "" : "es"} resting` : "Give a future purchase room to breathe"}</small></div><ChevronRight size={20} />
      </button>
      <button className="goals-portal" type="button" onClick={() => navigate("goals")}><span><Target size={23} /></span><div><strong>Protected Goals</strong><small>{state.goals.filter((goal) => goal.status === "active").length ? `${state.goals.filter((goal) => goal.status === "active").length} active milestone${state.goals.filter((goal) => goal.status === "active").length === 1 ? "" : "s"}` : "Choose a milestone that matters to you"}</small></div><ChevronRight size={19} /></button>
      <div className="quest-list">
        {visible.map((quest) => {
          const Icon = ICONS[quest.icon] ?? Sword;
          return (
            <article className="quest-card" key={quest.id}>
              <span className={`quest-illustration category-${quest.category.toLowerCase()} artifact-${quest.icon}`} aria-hidden="true"><Icon size={31} /></span>
              <div className="quest-copy"><strong>{quest.title}</strong><p>{quest.description}</p><small><Star size={13} /> {quest.estimatedMinutes} min · {quest.xp} XP {quest.progress && <b>{quest.progress}</b>}</small></div>
              <div className="quest-actions"><button type="button" className="quest-go" onClick={() => { const relatedTransaction = state.transactions.find((item) => item.id === quest.relatedEntityId); const relatedSubscription = state.subscriptions.find((item) => item.id === quest.relatedEntityId); const source = state.accounts.find((item) => item.type === "transaction" || item.type === "cash"); const destination = state.accounts.find((item) => item.type === "savings"); if (relatedTransaction) setSheet({ type: "transaction", id: relatedTransaction.id, title: relatedTransaction.merchant }); else if (relatedSubscription) setSheet({ type: "subscription", id: relatedSubscription.id, title: relatedSubscription.name }); else if (quest.id === "q-vault" && source && destination) setSheet({ type: "add-transaction", title: "Move treasure to the Deep Vault", preset: { merchant: "Deep Vault transfer", amount: 100, transfer: true, accountId: source.id, transferToAccountId: destination.id, direction: "expense", category: "Deep Vault" } }); else setSheet({ type: "quest", id: quest.id, title: quest.title, body: quest.reason }); }}>GO!</button><button type="button" aria-label={`More options for ${quest.title}`} onClick={() => setSheet({ type: "quest", id: quest.id, title: quest.title, body: quest.reason })}><MoreHorizontal size={17} /></button></div>
              <div className="quest-quiet-actions"><button type="button" onClick={() => { updateQuest(quest, { snoozedUntil: new Date(Date.now() + 3 * 86_400_000).toISOString() }); setToast("Quest will return in 3 days"); }}>Remind later</button><button type="button" onClick={() => { updateQuest(quest, { dismissedAt: new Date().toISOString() }); setToast("Quest dismissed without penalty"); }}>Dismiss</button></div>
            </article>
          );
        })}
        {!visible.length && <div className="empty-state"><Trophy size={36} /><strong>This path is clear.</strong><p>No active quests in this category.</p></div>}
      </div>
      <section className="completed-panel"><span>Completed quests</span><strong>+ {state.progression.completedQuestCount}</strong></section>
    </section>
  );
}

function GoalsScreen({ state, navigate, updateState, setSheet, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const active = state.goals.filter((goal) => goal.status === "active");
  const completed = state.goals.filter((goal) => goal.status === "completed");
  const totalTarget = active.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = active.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const addStep = (goal: Goal) => {
    const step = Math.min(Math.max(10, Math.round(goal.targetAmount * .01)), Math.max(0, goal.targetAmount - goal.currentAmount));
    if (!step) return;
    const recordedAt = new Date().toISOString();
    updateState((previous) => ({
      ...previous,
      goals: previous.goals.map((item) => item.id === goal.id ? { ...item, declaredAmount: (item.declaredAmount ?? Math.max(0, item.currentAmount - (item.verifiedAmount ?? 0))) + step, currentAmount: Math.min(item.targetAmount, item.currentAmount + step), status: item.currentAmount + step >= item.targetAmount ? "completed" as const : item.status, progressEvents: [...(item.progressEvents ?? []), { id: crypto.randomUUID(), amount: step, source: "declared" as const, recordedAt }] } : item),
      progression: addProgressionXp(previous, 3, `goal-step-${goal.id}-${recordedAt.slice(0, 10)}`),
    }));
    const alreadyMappedToday = state.progression.rewardEventIds.includes(`goal-step-${goal.id}-${recordedAt.slice(0, 10)}`);
    setToast(`${formatGold(step, 0)} declared toward ${goal.name}${alreadyMappedToday ? "" : " · +3 XP"}`);
  };
  return (
    <section className="screen screen-goals">
      <ScreenHeader icon={Target} title="Protected Goals" subtitle="Milestones chosen by you" back={() => navigate("quests")} action={<button className="icon-button" type="button" onClick={() => setSheet({ type: "add-goal", title: "Create a protected goal" })} aria-label="Add goal"><Plus size={21} /></button>} />
      <section className="goals-hero"><span className="goals-guardian" aria-hidden="true" /><div><small>Wish Vault · milestone path</small><strong>{active.length ? `${active.length} lights on the path` : "The path is yours to mark"}</strong><p>{active.length ? `${formatGold(totalCurrent, 0)} protected across ${formatGold(totalTarget, 0)} of chosen milestones.` : "A goal can be tiny, flexible, paused, or changed. It is a guide—not a test."}</p><button type="button" onClick={() => setSheet({ type: "add-goal", title: "Create a protected goal" })}><Plus size={17} /> Add a goal</button></div></section>
      {active.length ? <div className="goal-list">{active.map((goal) => {
        const progress = Math.min(100, Math.max(0, goal.currentAmount / Math.max(1, goal.targetAmount) * 100));
        const Icon = goal.visualRelicId === "shield" ? ShieldCheck : goal.visualRelicId === "key" ? LockKeyhole : goal.visualRelicId === "gem" ? Gem : goal.visualRelicId === "crown" ? Crown : Star;
        return <article key={goal.id} className={`goal-card priority-${goal.priority}`}><button type="button" className="goal-main" onClick={() => setSheet({ type: "goal", id: goal.id, title: goal.name })}><span className="goal-relic"><Icon size={24} /></span><span><small>{goal.priority} path · {daysUntil(goal.targetDate)} days</small><strong>{goal.name}</strong><p>{goal.note}</p><i><b style={{ width: `${progress}%` }} /></i><em>{formatGold(goal.currentAmount, 0)} of {formatGold(goal.targetAmount, 0)} · {Math.round(progress)}% · {formatGold(goal.verifiedAmount ?? 0, 0)} linked</em></span><ChevronRight size={18} /></button><button type="button" className="goal-step" onClick={() => addStep(goal)}><Plus size={15} /> Declare a small step</button></article>;
      })}</div> : <div className="goal-empty"><span className="goal-empty-art" aria-hidden="true" /><div><Target size={30} /><strong>No milestone is required.</strong><p>When something matters—a buffer, a trip, a tool, a debt victory—you can place a light here.</p><button type="button" onClick={() => setSheet({ type: "add-goal", title: "Create a protected goal" })}>Create my first goal</button></div></div>}
      {completed.length > 0 && <section className="completed-goals"><SectionTitle title="Permanent victories" />{completed.map((goal) => <button type="button" key={goal.id} onClick={() => setSheet({ type: "goal", id: goal.id, title: goal.name })}><Trophy size={20} /><span><strong>{goal.name}</strong><small>{formatGold(goal.targetAmount, 0)} milestone protected</small></span><Check size={18} /></button>)}</section>}
      <section className="goal-promise"><Heart size={21} /><p><strong>Goals bend with real life.</strong> Pausing, reducing, or changing one never removes XP, relics, pet bonds, or the progress you have already made.</p></section>
    </section>
  );
}

function AnalyticsScreen({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const [view, setView] = useState("Overview");
  const months = hibernationMonths(state);
  const flow = getMonthlyFlow(state);
  const categories = getCategoryBreakdown(state);
  const worth = getWorthSummary(state);
  const palette = ["#ed6c19", "#9d39c9", "#3977ed", "#18a99b", "#2e9d53", "#69809c"];
  const segments = categories.slice(0, 6).map((item, index) => {
    const start = categories.slice(0, index).reduce((total, previous) => total + previous.percent * 3.6, 0);
    const end = start + item.percent * 3.6;
    return `${palette[index]} ${start}deg ${end}deg`;
  }).join(", ");
  const spendingRows = categories.slice(0, 6).map((item) => ({ ...item, percent: categories[0]?.value ? Math.round((item.value / categories[0].value) * 100) : 0 }));
  const incomeMap = flow.transactions.filter((item) => item.direction === "income").reduce<Record<string, number>>((result, item) => ({ ...result, [item.merchant]: (result[item.merchant] ?? 0) + item.amount }), {});
  const incomeRows = Object.entries(incomeMap).sort((a, b) => b[1] - a[1]).map(([label, value], index, rows) => ({ label, value, percent: rows[0]?.[1] ? Math.round((value / rows[0][1]) * 100) : (index ? 0 : 100) }));
  if (!state.transactions.length) return <section className="screen screen-scrying scrying-empty"><ScreenHeader icon={Telescope} title="Scrying Pool" subtitle="Patterns in the gold" action={<button type="button" className="icon-button" onClick={() => navigate("flight")}><TrendingUp size={21} /></button>} /><section className="scrying-empty-hero"><span className="scrying-empty-guardian" aria-hidden="true" /><div><small>The water is still</small><strong>The pool needs one movement.</strong><p>Record income or spending to begin revealing patterns. One entry is enough to start; perfect history is not required.</p>{state.accounts.length ? <button type="button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })}><Plus size={17} /> Add a movement</button> : <button type="button" onClick={() => navigate("hoard")}><Landmark size={17} /> Map an account first</button>}</div></section><div className="empty-insight-runes"><div><BarChart3 size={21} /><strong>Spending</strong><small>Chamber patterns</small></div><div><Coins size={21} /><strong>Income</strong><small>Steady & irregular streams</small></div><div><Orbit size={21} /><strong>Hibernation</strong><small>Editable safety estimate</small></div></div><p className="supportive-copy">Charts explain what you enter. They never predict your worth, and every estimate stays editable.</p></section>;
  return (
    <section className={`screen screen-scrying scrying-view-${view.toLowerCase()}`}>
      <ScreenHeader icon={Telescope} title="Scrying Pool" subtitle="Patterns in the gold" action={<button type="button" className="icon-button" onClick={() => navigate("flight")} aria-label="Open Flight Path"><TrendingUp size={21} /></button>} />
      <Segmented options={["Overview", "Spending", "Income", "Trends"]} value={view} onChange={setView} compact />
      {view === "Overview" && (
        <>
          <section className="analytics-summary">
            <div><span>Inflow</span><strong>+{formatGold(flow.inflow, 0)}</strong></div><div><span>Outflow</span><strong>−{formatGold(flow.outflow, 0)}</strong></div><div><span>Net change</span><strong>{flow.net >= 0 ? "+" : "−"}{formatGold(Math.abs(flow.net), 0)}</strong></div>
          </section>
          <section className="chart-panel">
            <SectionTitle title="This month" />
            <div className="donut-wrap">
              <button className="donut" style={{ background: `conic-gradient(${segments || "#283b54 0 360deg"})` }} type="button" onClick={() => setSheet({ type: "chart", title: "Spending by chamber", body: categories.map((item) => `${item.label} ${item.percent}%`).join(", ") || "No spending is recorded this month." })} aria-label={`Spending donut chart. Total spent ${formatGold(flow.outflow)}`}><span><b>{formatGold(flow.outflow, 0)}</b><small>Total spent</small></span></button>
              <ul className="chart-legend">{categories.slice(0, 5).map((item, index) => <li key={item.label}><i style={{ background: palette[index] }} />{item.label.replace("The ", "")} <b>{item.percent}%</b></li>)}</ul>
            </div>
          </section>
          <section className="insight-card"><h2>Insights</h2><button type="button" onClick={() => setSheet({ type: "insight", title: "Largest chamber this month", body: categories[0] ? `${categories[0].label} is your largest recorded spending chamber at ${formatGold(categories[0].value)}.` : "No expense movement is recorded this month." })}><Sparkles size={16} /><span>{categories[0] ? `${categories[0].label} carries ${categories[0].percent}% of this month’s spending.` : "The pool is waiting for this month’s movements."}</span><ChevronRight size={18} /></button><button type="button" onClick={() => setSheet({ type: "worth", title: "Worth the Gold" })}><Star size={16} /><span>{worth.rated ? `${worth.positivePercent}% of rated purchases felt worth the gold.` : "Rate a few purchases to reveal value patterns."}</span><ChevronRight size={18} /></button></section>
          <button className="hibernation-card" type="button" onClick={() => setSheet({ type: "hibernation", title: "Hibernation estimate" })}>
            <div><span>Hibernation estimate</span><p>Your hoard could sustain your lair for <strong>{months.toFixed(1)} months</strong> comfortably.</p><small>Tap to inspect the estimate</small></div><div className="sleeping-orb"><Orbit size={38} /></div>
          </button>
          <button className="primary-button full" type="button" onClick={() => navigate("flight")}><Map size={18} /> Open Flight Path</button>
        </>
      )}
      {view === "Spending" && <SimpleBarChart title="Spending by chamber" rows={spendingRows} />}
      {view === "Income" && <SimpleBarChart title="Income streams" rows={incomeRows} />}
      {view === "Trends" && <TrendPanel state={state} />}
      {view !== "Overview" && <ScryingCompanion view={view} state={state} flow={flow} categories={categories} worth={worth} setSheet={setSheet} />}
    </section>
  );
}

function LoreScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const cards = useMemo(() => buildCalculatorResults(state), [state]);
  const [activeId, setActiveId] = useState(cards[0]?.id ?? "");
  const active = cards.find((card) => card.id === activeId) ?? cards[0];
  return <section className="screen screen-lore">
    <ScreenHeader icon={BookOpen} title="Lore Library" subtitle="Your numbers, visible assumptions, no prescriptions" back={() => navigate("analytics")} action={<span className="shard-chip"><BookOpen size={14} /> {state.education.completedLoreIds.length}/{cards.length}</span>} />
    <aside className="estimate-guard"><ShieldCheck size={21} /><p><strong>Factual information and editable illustrations only.</strong> These tools explain possibilities from the records and assumptions shown. They are not predictions, financial advice, or product recommendations.</p></aside>
    <div className="lore-index">{cards.map((card) => <button type="button" key={card.id} className={card.id === active?.id ? "active" : ""} onClick={() => setActiveId(card.id)}><span><BookOpen size={17} /></span><span><small>{card.fantasyTitle}</small><strong>{card.plainTitle}</strong></span>{state.education.completedLoreIds.includes(card.id) ? <Check size={16} /> : <ChevronRight size={16} />}</button>)}</div>
    {active && <CalculatorLoreCard key={active.id} card={active} state={state} updateState={updateState} setToast={setToast} />}
  </section>;
}

function CalculatorLoreCard({ card, state, updateState, setToast }: { card: CalculatorResult; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [overrides, setOverrides] = useState<Record<string, number | string>>({});
  const completed = state.education.completedLoreIds.includes(card.id);
  const result = recalculateResult(state, card, overrides);
  return <article className="calculator-lore-card">
    <header><small>{card.fantasyTitle}</small><h2>{card.plainTitle}</h2><p>{card.question}</p></header>
    <section className="calculator-result"><small>Editable illustration</small><strong>{result}</strong><p>{card.explanation}</p></section>
    <div className="calculator-fields">{card.fields.map((field) => {
      const current = overrides[field.label] ?? field.value;
      const isDate = typeof current === "string" && /^\d{4}-\d{2}-\d{2}/.test(current);
      return <label key={field.label}><span>{field.label}<small>{field.source}</small></span>{field.editable ? <input type={isDate ? "date" : typeof field.value === "number" ? "number" : "text"} step={typeof field.value === "number" ? "any" : undefined} value={current} onChange={(event) => setOverrides((previous) => ({ ...previous, [field.label]: typeof field.value === "number" ? Number(event.target.value) : event.target.value }))} /> : <b>{typeof field.value === "number" ? field.value.toLocaleString(state.profile.locale) : field.value}</b>}</label>;
    })}</div>
    <div className="assumption-grid"><section><strong>Assumptions</strong>{card.assumptions.map((item) => <p key={item}><Check size={13} /> {item}</p>)}</section><section><strong>Not included</strong>{card.exclusions.map((item) => <p key={item}><X size={13} /> {item}</p>)}</section></div>
    <p className="calculator-boundary">This is an editable illustration based on the records and assumptions shown. It is not a prediction or recommendation.</p>
    <div className="calculator-actions"><a href={card.sourceUrl} target="_blank" rel="noreferrer"><BookOpen size={16} /> {card.sourceTitle} · reviewed {card.reviewedAt}</a><button type="button" disabled={completed} onClick={() => { updateState((previous) => completeLoreCard(previous, card.id)); setToast(completed ? "This Lore Card is already in your Chronicle" : "Lore understood · one fixed Lore Key earned"); }}>{completed ? <><Check size={16} /> In your Chronicle</> : <><Sparkles size={16} /> Mark as understood</>}</button></div>
  </article>;
}

function TributeScreen({ state, navigate, setSheet, logUse }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void; logUse: (subscription: Subscription, quantity?: number) => void }) {
  const tribute = monthlyTribute(state);
  const renewalsSoon = state.subscriptions.filter((item) => daysUntil(item.nextCharge) <= 7).length;
  const changed = state.subscriptions.find((item) => item.priceChange);
  if (!state.subscriptions.length) return <section className="screen screen-treasury screen-tribute tribute-empty"><ScreenHeader icon={ScrollText} title="Tribute Hall" subtitle="Subscriptions & recurring costs" action={<button className="icon-button" type="button" onClick={() => state.accounts.length ? setSheet({ type: "add-subscription", title: "Add a claimant" }) : navigate("hoard")}><Plus size={21} /></button>} /><TreasurySwitcher current="tribute" navigate={navigate} /><section className="tribute-empty-hero"><span aria-hidden="true" /><div><small>The hall is quiet</small><strong>No claimants are mapped.</strong><p>Add a subscription or recurring cost only when tracking its arrival, annual cost, or usage would be useful.</p><button type="button" onClick={() => state.accounts.length ? setSheet({ type: "add-subscription", title: "Add a claimant" }) : navigate("hoard")}><Plus size={17} /> {state.accounts.length ? "Add a claimant" : "Add an account first"}</button></div></section><div className="claimant-benefits"><div><CalendarDays size={21} /><strong>See renewals</strong><small>Optional reminders</small></div><div><Eye size={21} /><strong>Track use</strong><small>Only if it helps</small></div><div><Coins size={21} /><strong>Annual cost</strong><small>Clear context</small></div></div><p className="supportive-copy">Visibility is useful. Cancelling, keeping, pausing, or not tracking a claimant is always your choice.</p></section>;
  return (
    <section className="screen screen-treasury screen-tribute">
      <ScreenHeader icon={ScrollText} title="Tribute Hall" subtitle="Subscriptions & recurring costs" action={<button className="icon-button" type="button" onClick={() => setSheet({ type: "add-subscription", title: "Add a claimant" })} aria-label="Add subscription"><Plus size={21} /></button>} />
      <TreasurySwitcher current="tribute" navigate={navigate} />
      <section className="tribute-total"><Gem size={24} /><span>Total monthly tribute<strong>{formatGold(tribute)}</strong><small>{formatGold(tribute * 12, 0)} yearly · {state.subscriptions.length} active · {renewalsSoon} soon</small></span><Coins size={32} /></section>
      <div className="claimant-list">
        {state.subscriptions.map((subscription) => (
          <button key={subscription.id} type="button" className="claimant-card" onClick={() => setSheet({ type: "subscription", id: subscription.id, title: subscription.name })}>
            <span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span>
            <span><strong>{subscription.name}</strong><small>{formatGold(subscription.amount)} / {subscription.cadence.replace("ly", "")}</small>{subscription.lastUsed && <em>Last logged {daysSince(subscription.lastUsed) === 0 ? "today" : `${dayLabel(daysSince(subscription.lastUsed))} ago`}</em>}</span>
            <span className="claimant-arrival">in {dayLabel(daysUntil(subscription.nextCharge))}{subscription.priceChange && <b>↑ +{formatGold(subscription.priceChange)}</b>}</span><ChevronRight size={17} />
          </button>
        ))}
      </div>
      {changed && <section className="tribute-alert"><div><Bell size={20} /><span><strong>One claimant increased tribute.</strong><small>{changed.name} rose by {formatGold(changed.priceChange ?? 0)} this month.</small></span></div><button type="button" onClick={() => setSheet({ type: "subscription", id: changed.id, title: changed.name })}>Review now</button></section>}
      <section className="quick-log"><SectionTitle title="Quick usage log" /><div>{state.subscriptions.slice(0, 3).map((subscription) => <button key={subscription.id} type="button" onClick={() => logUse(subscription)}><span style={{ background: subscription.color }}>{subscription.glyph}</span><b>{subscription.name}</b><small>Used today</small></button>)}</div></section>
    </section>
  );
}

function InvestmentsScreen({ state, navigate, updateState, setSheet, setToast, refreshMarketQuote }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void; refreshMarketQuote: (positionId: string, silent?: boolean) => Promise<boolean> }) {
  const totalValue = state.investments.reduce((sum, position) => sum + position.units * (position.marketPrice ?? position.unitPrice), 0);
  const contributions = state.investments.reduce((sum, position) => sum + position.contributions, 0);
  const growth = totalValue - contributions;
  const weightedReturn = state.investments.length ? state.investments.reduce((sum, position) => sum + position.annualReturnAssumption * position.units * (position.marketPrice ?? position.unitPrice), 0) / Math.max(1, totalValue) : 0;
  return (
    <section className="screen screen-treasury screen-investments">
      <ScreenHeader icon={Sprout} title="Long Sleep" subtitle="Manually tracked long-term treasure" action={<button className="icon-button" type="button" onClick={() => setSheet({ type: "add-investment", title: "Add a sleeping treasure" })} aria-label="Add investment"><Plus size={21} /></button>} />
      <TreasurySwitcher current="investments" navigate={navigate} />
      <section className="investment-hero"><Sprout size={28} /><span>Long-term treasure<strong>{formatGold(totalValue)}</strong><small>{growth >= 0 ? "+" : "−"}{formatGold(Math.abs(growth))} versus mapped contributions</small></span><Gem size={30} /></section>
      <div className="investment-summary"><div><span>Contributed</span><strong>{formatGold(contributions)}</strong></div><div><span>Mapped growth</span><strong className={growth >= 0 ? "positive" : "negative"}>{growth >= 0 ? "+" : "−"}{formatGold(Math.abs(growth))}</strong></div><div><span>Projection assumption</span><strong>{weightedReturn.toFixed(1)}%</strong></div></div>
      {EXPERIMENTAL_MARKET_DATA && <section className="market-refresh-panel"><div><RefreshCw size={21} /><span><strong>Experimental quote refresh</strong><p>Optional end-of-day data refreshes when a saved symbol is stale. Manual values stay in place if the provider is unavailable.</p></span></div><label className="check-label"><input type="checkbox" checked={state.journey.marketAutoRefresh} onChange={(event) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, marketAutoRefresh: event.target.checked } }))} /> Refresh at most every</label><select aria-label="Market refresh interval" value={state.journey.marketRefreshHours} onChange={(event) => updateState((previous) => ({ ...previous, journey: { ...previous.journey, marketRefreshHours: Number(event.target.value) } }))}><option value="24">24 hours</option><option value="48">2 days</option><option value="168">7 days</option><option value="336">14 days</option></select></section>}
      <div className="investment-list">{state.investments.map((position) => {
        const value = position.units * (position.marketPrice ?? position.unitPrice);
        return <article key={position.id} className="investment-row"><button type="button" onClick={() => setSheet({ type: "investment", id: position.id, title: position.name })}><span className="investment-gem"><Gem size={22} /></span><span><strong>{position.name}{EXPERIMENTAL_MARKET_DATA && position.ticker ? ` · ${position.ticker}` : ""}</strong><small>Manual value · updated {formatDate(position.updatedAt)}</small>{position.dividendYield ? <em>{position.dividendYield.toFixed(2)}% entered dividend yield</em> : null}</span><b>{formatGold(value)}</b><ChevronRight size={17} /></button>{EXPERIMENTAL_MARKET_DATA && position.ticker && <button className="position-refresh" type="button" onClick={() => refreshMarketQuote(position.id)} aria-label={`Refresh ${position.ticker}`}><RefreshCw size={17} /></button>}</article>;
      })}</div>
      {!state.investments.length && <div className="empty-state"><Sprout size={38} /><strong>No sleeping treasure is mapped.</strong><p>Manual tracking is optional. Dragon Mode never places a trade.</p></div>}
      <button className="primary-button full" type="button" onClick={() => setSheet({ type: "add-investment", title: "Add a sleeping treasure" })}><Plus size={18} /> Add investment position</button>
      <button className="lore-card" type="button" onClick={() => setSheet({ type: "lore", title: "Manual investment boundaries", body: "Values, yields, and assumptions are entered by you for planning and reflection. Confirm real balances and distributions with your provider. Dragon Mode never places trades or recommends products." })}><BookOpen size={24} /><span><strong>Manual values are planning aids</strong><small>No trading or product recommendations</small></span><ChevronRight size={18} /></button>
      <button className="secondary-button full" type="button" onClick={() => { updateState((previous) => ({ ...previous, investments: previous.investments.map((item) => ({ ...item, updatedAt: new Date().toISOString() })) })); setToast("Investment check-in recorded · no balances changed"); }}><Check size={17} /> Confirm values are current</button>
    </section>
  );
}

function FlightScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const scenario = state.projections.activeScenario;
  const rangeMonths = state.projections.rangeMonths;
  const savedSettings = state.projections.scenarios[scenario] ?? state.projections.scenarios["Current Flight"];
  const [drafts, setDrafts] = useState<Record<string, typeof savedSettings>>({});
  const settings = drafts[scenario] ?? savedSettings;
  const projection = projectScenario(state, settings, rangeMonths);
  const comparisonNames = ["Current Flight", "Cautious", "Resting"];
  const comparisons = comparisonNames.map((name) => ({ name, projection: projectScenario(state, name === scenario ? settings : state.projections.scenarios[name], rangeMonths) }));
  const chartMin = Math.min(...comparisons.flatMap((item) => item.projection.points)) - 1000;
  const chartMax = Math.max(...comparisons.flatMap((item) => item.projection.points)) + 1000;
  const chartLabels = Array.from({ length: 5 }, (_, index) => chartMax - ((chartMax - chartMin) * index / 4));
  const chartPath = (points: number[]) => points.map((point, index) => {
    const x = (index / Math.max(1, projection.points.length - 1)) * 300;
    const y = 156 - ((point - chartMin) / Math.max(1, chartMax - chartMin)) * 132;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const updateScenario = (changes: Partial<typeof settings>) => setDrafts((current) => ({ ...current, [scenario]: { ...settings, ...changes } }));
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  return (
    <section className="screen screen-flight">
      <ScreenHeader icon={Map} title="Flight Path" subtitle="Chart your dragon's journey" back={() => navigate("analytics")} />
      <Segmented options={["Current Flight", "Cautious", "Treasure Hunt", "Resting"]} value={scenario} onChange={(value) => updateState((previous) => ({ ...previous, projections: { ...previous.projections, activeScenario: value } }))} compact />
      <div className="range-tabs" aria-label="Projection range">{[{ label: "Payday", value: 1 }, { label: "3M", value: 3 }, { label: "6M", value: 6 }, { label: "1Y", value: 12 }].map((item) => <button type="button" key={item.label} className={rangeMonths === item.value ? "active" : ""} onClick={() => updateState((previous) => ({ ...previous, projections: { ...previous.projections, rangeMonths: item.value } }))}>{item.label}</button>)}</div>
      <section className="flight-chart" aria-label={`${scenario} projection from ${formatGold(projection.start, 0)} to a range of ${formatGold(projection.low, 0)} through ${formatGold(projection.high, 0)} over ${rangeMonths} months`}>
        <div className="chart-y">{chartLabels.map((label) => <span key={label}>{formatCompactGold(label)}</span>)}</div>
        <div className="chart-grid"><span /><span /><span /><span /><span /><svg viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden="true">{comparisons.map((item, index) => <path key={item.name} className={`line comparison-${index} ${item.name === scenario ? "active-comparison" : ""}`} d={chartPath(item.projection.points)} />)}{comparisons.map((item, index) => <circle key={item.name} className={`point-${index}`} cx="300" cy={156 - ((item.projection.end - chartMin) / Math.max(1, chartMax - chartMin)) * 132} r={item.name === scenario ? 5 : 3.5} />)}</svg>{comparisons.map((item, index) => <b key={item.name} className={`comparison-label label-${index}`} style={{ top: `${Math.max(3, Math.min(83, (156 - ((item.projection.end - chartMin) / Math.max(1, chartMax - chartMin)) * 132) / 1.7))}%` }}>{formatGold(item.projection.end, 0)}</b>)}</div>
        <div className="chart-x"><span>Now</span><span>{Math.max(1, Math.round(rangeMonths / 3))}M</span><span>{Math.max(1, Math.round(rangeMonths * 2 / 3))}M</span><span>{rangeMonths}M</span></div>
      </section>
      <section className="range-note wizard-guide"><div className="flight-wizard" aria-hidden="true" /><p>At your current pace, the mapped range is <strong>{formatGold(projection.low, 0)} – {formatGold(projection.high, 0)}</strong> in {rangeMonths === 1 ? "one month" : `${rangeMonths} months`}. This is a range, not a promise.</p></section>
      <section className="scenario-editor"><SectionTitle title="Scenario editor" />
        <label>Expected monthly income <b>{formatGold(settings.expectedMonthlyIncome, 0)}</b><input type="range" min="0" max="7000" step="50" value={settings.expectedMonthlyIncome} onChange={(event) => updateScenario({ expectedMonthlyIncome: Number(event.target.value) })} /></label>
        <label>Essential spending <b>{formatGold(settings.essentialSpending, 0)}</b><input type="range" min="400" max="3500" step="25" value={settings.essentialSpending} onChange={(event) => updateScenario({ essentialSpending: Number(event.target.value) })} /></label>
        <label>Flexible spending <b>{formatGold(settings.flexibleSpending, 0)}</b><input type="range" min="0" max="2500" step="25" value={settings.flexibleSpending} onChange={(event) => updateScenario({ flexibleSpending: Number(event.target.value) })} /></label>
        <label>Subscription change <b>{settings.subscriptionChange >= 0 ? "+" : ""}{formatGold(settings.subscriptionChange, 0)}</b><input type="range" min="-150" max="150" step="5" value={settings.subscriptionChange} onChange={(event) => updateScenario({ subscriptionChange: Number(event.target.value) })} /></label>
        <label>Extra debt payment <b>{formatGold(settings.debtExtraPayment, 0)}</b><input type="range" min="0" max="600" step="25" value={settings.debtExtraPayment} onChange={(event) => updateScenario({ debtExtraPayment: Number(event.target.value) })} /></label>
        <label>One-off purchase <b>{formatGold(settings.oneOffPurchase, 0)}</b><input type="range" min="0" max="3000" step="50" value={settings.oneOffPurchase} onChange={(event) => updateScenario({ oneOffPurchase: Number(event.target.value) })} /></label>
        <div className="cause-card"><Target size={21} /><p>This path changes the hoard by about <strong>{formatGold(projection.monthlyNet, 0)} per month</strong> before one-off purchases.</p></div>
      </section>
      <div className="flight-save-actions"><button className="secondary-button" type="button" disabled={!dirty} onClick={() => setDrafts((current) => { const next = { ...current }; delete next[scenario]; return next; })}><RotateCcw size={17} /> Reset draft</button><button className="primary-button" type="button" disabled={!dirty} onClick={() => { updateState((previous) => ({ ...previous, projections: { ...previous.projections, scenarios: { ...previous.projections.scenarios, [scenario]: settings } }, progression: addProgressionXp(previous, 6, `flight-save-${scenario}`) })); setToast(`${scenario} saved · +6 XP`); playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined); }}><Check size={18} /> Save this flight</button></div>
    </section>
  );
}

function WishScreen({ state, navigate, updateState, summary, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; summary: ReturnType<typeof getHoardSummary>; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const restingWishes = state.wishes.filter((item) => item.status === "resting");
  const [selectedWishId, setSelectedWishId] = useState(restingWishes[0]?.id ?? state.wishes[0]?.id ?? "");
  const wish = state.wishes.find((item) => item.id === selectedWishId) ?? restingWishes[0] ?? state.wishes[0];
  const [restDays, setRestDays] = useState(wish?.restDays ?? 3);
  if (!wish) return <section className="screen screen-wish"><ScreenHeader icon={Star} title="Dragon's Rest" back={() => navigate("quests")} /><div className="empty-state"><Star size={40} /><strong>No wishes are resting.</strong><button className="primary-button" type="button" onClick={() => setSheet({ type: "add-wish", title: "Add a wish" })}>Add a wish</button></div></section>;
  const decide = (status: "saved" | "released") => {
    updateState((previous) => {
      if (status === "saved") {
        const existingGoal = previous.goals.find((goal) => goal.id === wish.goalId);
        const goalId = existingGoal?.id ?? crypto.randomUUID();
        const goals = existingGoal ? previous.goals : [...previous.goals, { id: goalId, name: wish.name, targetAmount: wish.price, currentAmount: 0, declaredAmount: 0, verifiedAmount: 0, progressEvents: [], targetDate: wish.desiredDate, chamberId: previous.chambers.find((chamber) => chamber.id === "wish")?.id ?? previous.chambers[0]?.id ?? "wish", priority: "gentle" as const, status: "active" as const, visualRelicId: "star" as const, note: wish.reason }];
        return { ...previous, goals, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, status, goalId } : item), progression: addProgressionXp(previous, 15, `wish-${wish.id}`) };
      }
      return { ...previous, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, status } : item), progression: addProgressionXp(previous, 15, `wish-${wish.id}`) };
    });
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
    cancelWishReminder(wish.id).catch(() => undefined);
    setToast(status === "saved" ? "Savings goal created · +15 patience XP" : "Wish released with care · +15 patience XP");
    navigate(status === "saved" ? "goals" : "quests");
  };
  const fitsFreeGold = wish.price <= summary.freeGold;
  const hibernationShift = Math.max(1, Math.ceil((wish.price / state.profile.comfortableMonthlyCost) * 30));
  const monthlySurplus = Math.max(1, getMonthlyFlow(state).net || 460);
  const savePaydays = Math.max(1, Math.ceil(wish.price / (monthlySurplus / 2)));
  const relatedRatings = state.transactions.filter((item) => item.category === wish.category && item.worthRating).map((item) => item.worthRating);
  const similarRating = relatedRatings[0] ?? "Not rated";
  const setRest = (days: number) => {
    setRestDays(days);
    const endsAt = new Date(Date.now() + days * 86_400_000);
    updateState((previous) => ({ ...previous, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, restDays: days, endsAt: endsAt.toISOString() } : item) }));
    if (state.profile.notificationsEnabled && state.profile.notificationPreferences.wishes) scheduleWishReminder({ id: wish.id, name: wish.name, at: endsAt }).then((result) => setToast(result.reason)).catch(() => setToast("The rest was saved without a notification"));
  };
  return (
    <section className="screen screen-wish">
      <ScreenHeader icon={Star} title="Dragon's Rest" subtitle="Let time tell if it's worthy" back={() => navigate("quests")} action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-wish", title: "Add another wish" })} aria-label="Add wish"><Plus size={20} /></button>} />
      {restingWishes.length > 1 && <label className="wish-selector">Resting wish<select value={wish.id} onChange={(event) => { const next = state.wishes.find((item) => item.id === event.target.value); if (next) { setSelectedWishId(next.id); setRestDays(next.restDays); } }}>{restingWishes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
      <section className="wish-frame"><div className="wish-product-art" /><div><strong>{wish.name}</strong><b>{formatGold(wish.price)}</b></div></section>
      <section className="rest-panel"><span>Resting for</span><Segmented options={["1 Night", "3 Days", "1 Week", "Custom"]} value={restDays === 1 ? "1 Night" : restDays === 3 ? "3 Days" : restDays === 7 ? "1 Week" : "Custom"} onChange={(value) => setRest(value === "1 Night" ? 1 : value === "3 Days" ? 3 : value === "1 Week" ? 7 : 14)} compact /><strong><Orbit size={18} /> Ends in {dayLabel(daysUntil(wish.endsAt))}</strong></section>
      <section className="wish-impact"><div className="wish-dragon" /><p>{fitsFreeGold ? "It fits within your Free Gold" : "It is larger than your current Free Gold"} and would shift comfortable hibernation by <strong>{hibernationShift} days</strong>.</p></section>
      <div className="impact-grid"><div><span>Free Gold after</span><strong>{formatGold(summary.freeGold - wish.price)}</strong></div><div><span>Hibernation shift</span><strong>− {hibernationShift} days</strong></div><div><span>Save time</span><strong>{savePaydays} payday{savePaydays === 1 ? "" : "s"}</strong></div><div><span>Similar worth rating</span><strong>{similarRating}</strong></div></div>
      <p className="supportive-copy">Buying it is a valid outcome. The reward is for making the choice with the full map in view.</p>
      <div className="wish-actions"><button type="button" className="claim" onClick={() => setSheet({ type: "wish-claim", id: wish.id, title: `Claim treasure · ${wish.name}` })}>Claim treasure</button><button type="button" className="rest" onClick={() => { setRest(restDays + 3); setToast("Rest extended by 3 days"); }}>Rest longer</button><button type="button" className="save" onClick={() => decide("saved")}>Save toward it</button><button type="button" className="release" onClick={() => decide("released")}>Release</button></div>
    </section>
  );
}

function WishClaim({ wish, state, updateState, setSheet, setToast, navigate }: { wish: DragonState["wishes"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void; navigate: (screen: Screen) => void }) {
  const eligibleAccounts = state.accounts.filter((account) => !account.archived && account.type !== "loan");
  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id ?? "");
  const [amount, setAmount] = useState(wish.price.toString());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const claim = () => {
    const numericAmount = Math.max(0, Number(amount) || 0);
    if (!numericAmount || !accountId) return;
    const transaction: Transaction = { id: crypto.randomUUID(), accountId, date: new Date(`${date}T12:00:00`).toISOString(), merchant: wish.name, amount: numericAmount, direction: "expense", category: wish.category, note: `Considered in Dragon's Rest: ${wish.reason}`, status: "cleared", worthRating: "Absolutely", createdManually: true };
    updateState((previous) => {
      const reconciled = createTransaction(previous, transaction);
      return { ...reconciled, wishes: reconciled.wishes.map((item) => item.id === wish.id ? { ...item, status: "claimed", transactionId: transaction.id } : item), progression: addProgressionXp(reconciled, 15, `wish-${wish.id}`) };
    });
    cancelWishReminder(wish.id).catch(() => undefined);
    setSheet(null);
    setToast("Purchase recorded and account reconciled · +15 XP");
    navigate("quests");
  };
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); claim(); }}><div className="formula-card"><Star size={30} /><strong>{wish.name}</strong><p>Buying it is a valid outcome. Confirm where the treasure came from so the financial map stays true.</p></div><div className="edit-grid"><label>Final price<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Purchase date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Paid from<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{eligibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div>{!eligibleAccounts.length && <p className="warning-copy">Add an account before recording the purchase.</p>}<button disabled={!eligibleAccounts.length} className="primary-button full" type="submit"><Coins size={18} /> Record considered purchase</button></form>;
}

function DragonScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const colors = ["Emerald", "Sky", "Amethyst", "Ember"];
  const themes = ["Sky Vault", "Moon Garden", "Ember Library"];
  const [previewColor, setPreviewColor] = useState(state.profile.selectedDragonColor);
  const [previewTheme, setPreviewTheme] = useState(state.profile.selectedLairTheme);
  const unusualCount = state.transactions.filter((item) => item.unusual).length;
  const priceChanges = state.subscriptions.filter((item) => item.priceChange).length;
  const status = unusualCount > 1 ? "GUARDING" : unusualCount || priceChanges ? "WATCHFUL" : "CONTENT";
  const reasons = [unusualCount ? `${unusualCount} unusual charge${unusualCount === 1 ? "" : "s"} deserves a look` : "No unusual charges are waiting", priceChanges ? `${priceChanges} claimant changed its tribute` : "Recurring tribute is steady", `Free Gold is ${formatGold(getHoardSummary(state).freeGold, 0)}`];
  return (
    <section className="screen screen-dragon">
      <ScreenHeader icon={Eye} title="The Dragon" subtitle="Your dragon reflects your stewardship" back={() => navigate("lair")} />
      <section className={`dragon-status-art skin-preview lair-${previewTheme.toLowerCase().replace(/[^a-z0-9]+/g, "-")} dragon-${previewColor.toLowerCase()}`}><span>{state.profile.dragonName} · previewing {previewColor} in {previewTheme}</span></section>
      <section className="state-panel"><Eye size={30} /><span>Current state<strong>{status}</strong><small>{status === "CONTENT" ? "The mapped path is calm." : "The dragon senses something that deserves attention."}</small></span></section>
      <section className="reason-panel"><h2>Why?</h2><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><button type="button" onClick={() => navigate("quests")}>Open stabilising quest <ChevronRight size={18} /></button></section>
      <blockquote>“The path narrowed, but it did not close. We protect the next seven days first.”</blockquote>
      <section className="cosmetics"><SectionTitle title="Scale colours" /><div>{colors.map((item) => { const unlocked = state.progression.unlockedCosmetics.includes(item) || state.profile.selectedDragonColor === item; return <button key={item} disabled={!unlocked} aria-label={`${item} scales${unlocked ? "" : " locked"}`} className={`${previewColor === item ? "selected" : ""} ${unlocked ? "" : "locked"}`} type="button" onClick={() => { if (unlocked) setPreviewColor(item); }}><span className={item.toLowerCase()} />{!unlocked && <LockKeyhole size={13} />}<small>{item}</small></button>; })}</div></section>
      <section className="lair-theme-picker"><SectionTitle title="Lair atmosphere" /><div>{themes.map((item) => { const unlocked = state.progression.unlockedCosmetics.includes(item) || state.profile.selectedLairTheme === item; return <button type="button" key={item} disabled={!unlocked} className={`${previewTheme === item ? "selected" : ""} ${unlocked ? "" : "locked"}`} onClick={() => { if (unlocked) setPreviewTheme(item); }}><CloudSun size={18} /><strong>{item}</strong>{!unlocked && <LockKeyhole size={13} />}</button>; })}</div><button type="button" className="primary-button full" disabled={previewColor === state.profile.selectedDragonColor && previewTheme === state.profile.selectedLairTheme} onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, selectedDragonColor: previewColor, selectedLairTheme: previewTheme } })); setToast("Cosmetic preview applied across the Lair and Journey"); }}><Sparkles size={17} /> Apply this preview</button><label className="check-label"><input type="checkbox" checked={state.profile.rotateOwnedSkins} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, rotateOwnedSkins: event.target.checked } }))} /> Rotate only owned colours and themes each week</label><p>Cosmetics never affect calculations, balances, rewards, or access—and remain owned through difficult months.</p></section>
      <button className="secondary-button full" type="button" onClick={() => navigate("legacy")}><Crown size={18} /> View permanent legacy</button>
    </section>
  );
}

function DebtScreen({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const [strategy, setStrategy] = useState("Smallest first");
  const [extra, setExtra] = useState(50);
  const plan = estimateDebtPlan(state.debts, strategy, extra);
  const victoryDebt = [...state.debts].sort((a, b) => a.balance - b.balance)[0];
  const victoryTarget = victoryDebt ? Math.floor(victoryDebt.balance / 500) * 500 : 0;
  const victoryRemaining = victoryDebt ? Math.max(0, victoryDebt.balance - victoryTarget) : 0;
  return (
    <section className="screen screen-debt">
      <ScreenHeader icon={LockKeyhole} title="Debt Chamber" subtitle="Understand and break the chains" back={() => navigate("tribute")} action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-debt", title: "Add a claim" })} aria-label="Add debt"><Plus size={20} /></button>} />
      <TreasurySwitcher current="debt" navigate={navigate} />
      <section className="debt-total"><div className="chain-line"><span /><LockKeyhole size={30} /><span /></div><span>Total debt</span><strong>{formatGold(totalDebt(state))}</strong><small>{formatGold(state.debts.reduce((sum, debt) => sum + debt.minimum, 0))} monthly minimum · {averageApr(state).toFixed(1)}% weighted APR</small></section>
      <div className="debt-list">{state.debts.map((debt) => { const Icon = ICONS[debt.icon] ?? CreditCard; return <button key={debt.id} type="button" onClick={() => setSheet({ type: "debt", id: debt.id, title: debt.name })}><span className="debt-icon"><Icon size={21} /></span><span><strong>{debt.name}</strong><small>{debt.apr.toFixed(2)}% APR · min {formatGold(debt.minimum)}</small><i><b style={{ width: `${debt.progress}%` }} /></i></span><b>{formatGold(debt.balance)}</b></button>; })}</div>
      {victoryDebt && <section className="victory-panel"><span>Next victory · {victoryDebt.name}</span><strong>{victoryRemaining ? `Pay ${formatGold(victoryRemaining, 0)} to cross below ${formatGold(victoryTarget, 0)}.` : "The next chain marker is ready."}</strong><div><i><b style={{ width: `${Math.min(100, 100 - (victoryRemaining / 500) * 100)}%` }} /></i><small>{formatGold(victoryDebt.balance, 0)} remaining</small></div><button className="secondary-button full" type="button" onClick={() => setSheet({ type: "debt-payment", id: victoryDebt.id, title: `Record payment · ${victoryDebt.name}` })}><Coins size={17} /> Record a payment</button></section>}
      <section className="strategy-panel"><SectionTitle title="Compare strategies" /><label>Payoff order<select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option>Smallest first</option><option>Highest interest first</option><option>Minimum payments</option><option>Custom order</option></select></label><label>Extra each month <b>{formatGold(extra, 0)}</b><input type="range" min="0" max="400" step="25" value={extra} onChange={(event) => setExtra(Number(event.target.value))} /></label><p>{strategy} with {formatGold(extra, 0)} extra estimates <strong>{plan.months} months</strong> to clear all mapped claims, with about {formatGold(plan.interestPaid, 0)} interest.</p></section>
    </section>
  );
}

function LegacyScreen({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const levelProgress = Math.min(100, Math.max(0, (state.progression.xp / state.progression.nextLevelXp) * 100));
  const relicLore = (relic: string) => relic.includes("Bond") ? "A permanent token of patient companionship. Missed days never weaken it." : relic.includes("Lantern") ? "A light earned for returning to the map and carrying hope forward." : relic.includes("Chain") ? "A seal marking a debt victory or a gentler route through a difficult pass." : relic.includes("Compass") || relic.includes("Orrery") ? "A navigation relic earned through reflection, projections, and clear assumptions." : relic.includes("Crown") || relic.includes("Ward") ? "A guardian relic recognising steady stewardship rather than hoard size." : relic.includes("Key") ? "A key earned by opening a new chamber and making one useful truth visible." : "A permanent marker of care, learning, and progress on your path.";
  return (
    <section className="screen screen-legacy">
      <ScreenHeader icon={Crown} title="Dragon's Legacy" subtitle="Wisdom, relics, and milestones" back={() => navigate("lair")} />
      <section className="legacy-hero"><div className="level-crest"><Crown size={23} /><strong>{state.progression.level}</strong><small>LEVEL</small></div><div><span>Level {state.progression.level}</span><strong>{state.progression.title}</strong><i><b style={{ width: `${levelProgress}%` }} /></i><small>{state.progression.xp.toLocaleString()} / {state.progression.nextLevelXp.toLocaleString()} XP</small></div><div className="legacy-chest"><Gem size={41} /></div></section>
      <section className="relic-panel"><SectionTitle title="Recent relics" /><div>{state.progression.relics.slice(-6).map((relic, index) => <button key={relic} type="button" onClick={() => setSheet({ type: "relic", title: relic, body: relicLore(relic) })}><span className={`relic relic-art relic-art-${index % 8}`} aria-hidden="true" /><small>{relic}</small></button>)}</div></section>
      <SectionTitle title="Living chapters" />
      <button className="story-card story-celebration" type="button" onClick={() => setSheet({ type: "story-scene", id: "vault-answers", title: "The Vault Answers" })}><div className="story-art"><span className="story-character moss" /></div><span><small>Milestone story · ready</small><strong>The Vault Answers</strong><p>Celebrate the path already travelled.</p><i><b style={{ width: `${Math.max(38, levelProgress)}%` }} /></i></span><ChevronRight size={19} /></button>
      <button className="story-card story-resilience" type="button" onClick={() => setSheet({ type: "story-scene", id: "narrow-pass", title: "The Narrow Pass" })}><div className="story-art"><span className="story-character wizard" /></div><span><small>Resilience story · always available</small><strong>The Narrow Pass</strong><p>A hard month is not the end of the road.</p><i><b style={{ width: "100%" }} /></i></span><ChevronRight size={19} /></button>
      <div className="level-roadmap"><button type="button" onClick={() => setSheet({ type: "story-scene", id: "vault-answers", title: "The Hoardkeeper" })}><span><ShieldCheck size={18} /></span><small>Level 8</small><strong>Hoardkeeper</strong></button><button type="button" onClick={() => setSheet({ type: "story", title: "Level 9 · Vaultwarden", body: "The next title recognises steady reviews, protected buffers, pet bonds, and considered choices—not the size of a balance." })}><span><LockKeyhole size={18} /></span><small>Level 9</small><strong>Vaultwarden</strong></button><button type="button" onClick={() => setSheet({ type: "story-scene", id: "ancient-guardian", title: "The Ancient Guardian" })}><span><Crown size={18} /></span><small>Level 10</small><strong>Ancient Guardian</strong></button></div>
      <section className="milestones"><SectionTitle title="Milestone path" /><div><span className="done"><Check /></span><i /><span className="done"><Check /></span><i /><span className="current">8</span><i /><span>9</span><i /><span>10</span></div></section>
      <p className="supportive-copy">Relics, bonds, and titles are permanent. A difficult month can change the path, but never erases what you learned—and the story will never give up on you.</p>
    </section>
  );
}

function SettingsScreen({ state, navigate, updateState, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const [permissionState, setPermissionState] = useState("checking");
  useEffect(() => { notificationPermission().then(setPermissionState).catch(() => setPermissionState("unavailable")); }, []);
  const exportData = async () => {
    const filename = `dragon-mode-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(state, null, 2)], filename, { type: "application/json" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "DragonMode vault backup", files: [file] });
        setToast("Hoard backup shared safely");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Hoard exported safely");
  };
  const importData = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => {
      const parsed = normalizeState(JSON.parse(text));
      setStateSafely(parsed);
      setToast("Hoard import complete");
    }).catch(() => setToast("That file could not be read"));
  };
  const setStateSafely = (next: DragonState) => updateState(() => next);
  const notificationOptions: Array<{ key: keyof DragonState["profile"]["notificationPreferences"]; label: string }> = [
    { key: "claimants", label: "Upcoming recurring costs" },
    { key: "wishes", label: "Dragon's Rest decisions" },
    { key: "pets", label: "Creature visits without penalties" },
    { key: "weeklyReview", label: "Weekly Lair review" },
    { key: "monthlyReview", label: "Monthly Chronicle close" },
    { key: "priceChanges", label: "Recurring-cost price changes" },
    { key: "importReview", label: "Import or reconciliation review" },
    { key: "importantUncertainty", label: "One important uncertainty" },
    { key: "expectedIncome", label: "Expected-income checkpoint" },
    { key: "rateOrMaturity", label: "Promotion, interest, or maturity date" },
    { key: "storyChapter", label: "Optional permanent story chapter" },
  ];
  return (
    <section className="screen screen-settings">
      <ScreenHeader icon={Settings} title="Treasury Settings" subtitle="Your vault, your rules" back={() => navigate("tribute")} />
      <TreasurySwitcher current="settings" navigate={navigate} />
      <section className="keeper-desk" aria-label="Keeper's desk">
        <span>Keeper&apos;s desk</span>
        <strong>Your vault, your rules.</strong>
        <small>Release mode keeps financial records on this device and makes no market-data calls.</small>
      </section>
      <section className="settings-card"><div><span><Volume2 size={20} /><b>Sound effects</b></span><button type="button" role="switch" aria-label="Sound effects" aria-checked={state.profile.soundEnabled} className={state.profile.soundEnabled ? "toggle on" : "toggle"} onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, soundEnabled: !previous.profile.soundEnabled } })); playFeedback({ sound: !state.profile.soundEnabled, haptics: false }).catch(() => undefined); }}><i /></button></div><div><span><Zap size={20} /><b>Haptic feedback</b></span><button type="button" role="switch" aria-label="Haptic feedback" aria-checked={state.profile.hapticsEnabled} className={state.profile.hapticsEnabled ? "toggle on" : "toggle"} onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, hapticsEnabled: !previous.profile.hapticsEnabled } })); playFeedback({ sound: false, haptics: !state.profile.hapticsEnabled }).catch(() => undefined); }}><i /></button></div><div><span><Bell size={20} /><b>Claimant reminders</b></span><button type="button" role="switch" aria-label="Claimant reminders" aria-checked={state.profile.notificationsEnabled} className={state.profile.notificationsEnabled ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, notificationsEnabled: !previous.profile.notificationsEnabled } }))}><i /></button></div><div><span><Sparkles size={20} /><b>Reduced motion</b></span><button type="button" role="switch" aria-label="Reduced motion" aria-checked={state.profile.reducedMotion} className={state.profile.reducedMotion ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, reducedMotion: !previous.profile.reducedMotion } }))}><i /></button></div><div><span><BookOpen size={20} /><b>Plain-language hints</b></span><button type="button" role="switch" aria-label="Plain-language hints" aria-checked={state.profile.plainLanguage} className={state.profile.plainLanguage ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, plainLanguage: !previous.profile.plainLanguage } }))}><i /></button></div></section>
      <section className="preference-grid"><SectionTitle title="Display & region" /><label>Currency<select value={state.profile.preferredCurrency} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, preferredCurrency: event.target.value } }))}><option value="AUD">AUD · Australian dollar</option><option value="USD">USD · US dollar</option><option value="NZD">NZD · New Zealand dollar</option><option value="GBP">GBP · British pound</option><option value="EUR">EUR · Euro</option><option value="CAD">CAD · Canadian dollar</option></select></label><label>Locale<select value={state.profile.locale} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, locale: event.target.value } }))}><option value="en-AU">English (Australia)</option><option value="en-NZ">English (New Zealand)</option><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option></select></label><label>Text size <b>{Math.round(state.profile.fontScale * 100)}%</b><input type="range" min="0.9" max="1.35" step="0.05" value={state.profile.fontScale} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, fontScale: Number(event.target.value) } }))} /></label></section>
      <section className="notification-settings"><SectionTitle title="Friendly notifications" /><p>System permission: <strong>{permissionState}</strong>. There is no generic daily-engagement reminder, and notification text never includes balances, amounts, merchants, or account names.</p>{notificationOptions.map(({ key, label }) => <label className="check-label" key={key}><input type="checkbox" checked={state.profile.notificationPreferences[key]} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, notificationPreferences: { ...previous.profile.notificationPreferences, [key]: event.target.checked } } }))} /> {label}</label>)}<div className="notification-rhythm"><label>Quiet hours start<input type="time" value={state.profile.notificationQuietStart} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, notificationQuietStart: event.target.value } }))} /></label><label>Quiet hours end<input type="time" value={state.profile.notificationQuietEnd} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, notificationQuietEnd: event.target.value } }))} /></label><label>Weekly review day<select value={state.profile.reviewDay} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, reviewDay: Number(event.target.value) } }))}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="7">Sunday</option></select></label><label>Review time<select value={state.profile.reviewHour} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, reviewHour: Number(event.target.value) } }))}>{[8, 10, 12, 14, 16, 18, 20].map((hour) => <option key={hour} value={hour}>{new Date(2000, 0, 1, hour).toLocaleTimeString(state.profile.locale, { hour: "numeric", minute: "2-digit" })}</option>)}</select></label></div></section>
      <section className="budget-settings"><SectionTitle title="Planning assumptions" /><label>Protected minimum buffer <b>{formatGold(state.profile.minimumBuffer, 0)}</b><input type="range" min="0" max="5000" step="100" value={state.profile.minimumBuffer} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, minimumBuffer: Number(event.target.value) } }))} /></label><label>Comfortable monthly cost <b>{formatGold(state.profile.comfortableMonthlyCost, 0)}</b><input type="range" min="500" max="6000" step="50" value={state.profile.comfortableMonthlyCost} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, comfortableMonthlyCost: Number(event.target.value) } }))} /></label></section>
      <section className="privacy-panel"><ShieldCheck size={25} /><div><small>Privacy at a glance</small><strong>No account. No bank login. No market calls.</strong><p>Financial records, original imported source rows, reconciliation receipts, rules, story choices, and reveal history stay in this app&apos;s private on-device vault. A chosen file is read only after your action. Export happens only when you tap Export JSON.</p></div></section>
      <section className="data-panel"><h2>Local-first records</h2><p>Export includes the complete device copy, including import provenance and collection history. Restore demo and Start empty replace all of it; deleting the app can also remove it. Export a backup before changing devices. Notifications are optional and use generic, private wording.</p><button type="button" onClick={exportData}><Download size={18} /> Export complete JSON backup</button><label><Upload size={18} /> Import JSON backup<input type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} /></label><button type="button" onClick={() => setSheet({ type: "reset", title: "Restore the demo hoard" })}><RotateCcw size={18} /> Restore demo</button><button type="button" onClick={() => setSheet({ type: "empty-vault", title: "Start a private empty vault" })}><Sparkles size={18} /> Start empty</button></section>
      <button className="lore-card" type="button" onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, tutorialComplete: false, tutorialChapter: 0 } })); navigate("lair"); }}><BookOpen size={24} /><span><strong>Replay the Awakening</strong><small>Start the story tutorial again</small></span><ChevronRight size={18} /></button>
      <p className="version-note">{APP_NAME} 1.0 release candidate · Local-first · Market retrieval disabled</p>
    </section>
  );
}

function TreasurySwitcher({ current, navigate }: { current: "tribute" | "debt" | "investments" | "settings"; navigate: (screen: Screen) => void }) {
  return <div className="treasury-switcher"><button type="button" className={current === "tribute" ? "active" : ""} onClick={() => navigate("tribute")}><ScrollText size={15} /> Claimants</button><button type="button" className={current === "debt" ? "active" : ""} onClick={() => navigate("debt")}><LockKeyhole size={15} /> Debt</button><button type="button" className={current === "investments" ? "active" : ""} onClick={() => navigate("investments")}><Sprout size={15} /> Invest</button><button type="button" className={current === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings size={15} /> Settings</button></div>;
}

function Segmented({ options, value, onChange, compact = false }: { options: string[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return <div className={`segmented ${compact ? "compact" : ""}`} role="tablist">{options.map((option) => <button type="button" role="tab" aria-selected={value === option} key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><span><i><Gem size={11} /></i><h2>{title}</h2></span>{action && <button type="button" onClick={onAction}>{action} <ChevronRight size={15} /></button>}</div>;
}

function SceneCompanion({ asset, eyebrow, title, body, icons }: { asset: string; eyebrow: string; title: string; body: string; icons: LucideIcon[] }) {
  return <section className="scene-companion"><span className="scene-character" style={{ "--scene-character": `url("${asset}")` } as React.CSSProperties} aria-hidden="true" /><div><small>{eyebrow}</small><strong>{title}</strong><p>{body}</p><span className="companion-icons">{icons.map((Icon, index) => <i key={index}><Icon size={15} /></i>)}</span></div></section>;
}

function ScryingCompanion({ view, state, flow, categories, worth, setSheet }: { view: string; state: DragonState; flow: ReturnType<typeof getMonthlyFlow>; categories: ReturnType<typeof getCategoryBreakdown>; worth: ReturnType<typeof getWorthSummary>; setSheet: (sheet: Sheet) => void }) {
  const copy = view === "Spending"
    ? { eyebrow: "Pool reading", title: "Patterns need context", body: categories[0] ? `${categories[0].label} is largest, but only you know whether this month was ordinary.` : "More cleared movements will give the pool a clearer reflection." }
    : view === "Income"
      ? { eyebrow: "Income constellation", title: "Every stream strengthens the map", body: `${flow.transactions.filter((item) => item.direction === "income").length} income movements are visible this month. Irregular income still belongs in the story.` }
      : { eyebrow: "Six-month watch", title: "A line can bend without breaking", body: "A difficult month is information, not a verdict. The next useful step can be very small." };
  return <section className="scrying-companion"><span className="scrying-guardian" aria-hidden="true" /><div><small>{copy.eyebrow}</small><strong>{copy.title}</strong><p>{copy.body}</p><button type="button" onClick={() => setSheet({ type: "worth", title: "Worth the Gold" })}><Star size={15} /> {worth.rated ? `${worth.rated} purchases reflected on` : "Add a value reflection"} <ChevronRight size={15} /></button></div><div className="scrying-runes"><span><Coins size={15} /><b>{formatGold(flow.inflow, 0)}</b></span><span><ShieldCheck size={15} /><b>{state.transactions.filter((item) => item.reviewedAt).length} safe</b></span><span><Sparkles size={15} /><b>{categories.length} paths</b></span></div></section>;
}

function SimpleBarChart({ title, rows }: { title: string; rows: Array<{ label: string; value: number; percent: number }> }) {
  return <section className="simple-bars" aria-label={`${title}. ${rows.map((row) => `${row.label} ${formatGold(row.value, 0)}`).join(", ")}`}><SectionTitle title={title} />{rows.map((row) => <div key={row.label}><span>{row.label}<b>{formatGold(row.value, 0)}</b></span><i><b style={{ width: `${row.percent}%` }} /></i></div>)}<p>Calculated from your cleared movements for the selected period.</p></section>;
}

function TrendPanel({ state }: { state: DragonState }) {
  const trend = getMonthlyTrend(state);
  const maximum = Math.max(1, ...trend.map((item) => Math.abs(item.net)));
  const positive = trend.filter((item) => item.net > 0).length;
  const latest = trend.at(-1)?.net ?? 0;
  return <section className="trend-panel" aria-label={`Six-month net cash flow. Latest month ${formatGold(latest, 0)}.`}><SectionTitle title="Six-month path" /><div className="spark-bars">{trend.map((item) => <i key={item.label} className={item.net < 0 ? "negative" : ""} style={{ height: `${Math.max(8, Math.abs(item.net) / maximum * 100)}%` }} title={`${item.label}: ${formatGold(item.net, 0)}`} />)}</div><div className="trend-months">{trend.map((item) => <small key={item.label}>{item.label}</small>)}</div><div className="trend-stat"><TrendingUp size={22} /><span><strong>{latest >= 0 ? "This month is above water" : "This month needs a closer look"}</strong><small>{positive} of the last {trend.length} months had positive net movement.</small></span></div></section>;
}

function Modal({ sheet, state, updateState, setSheet, logUse, completeQuest, setToast, navigate }: { sheet: NonNullable<Sheet>; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; logUse: (subscription: Subscription, quantity?: number) => void; completeQuest: (quest: Quest) => void; setToast: (toast: string) => void; navigate: (screen: Screen) => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const subscription = sheet.id ? state.subscriptions.find((item) => item.id === sheet.id) : undefined;
  const chamber = sheet.id ? state.chambers.find((item) => item.id === sheet.id) : undefined;
  const debt = sheet.id ? state.debts.find((item) => item.id === sheet.id) : undefined;
  const transaction = sheet.id ? state.transactions.find((item) => item.id === sheet.id) : undefined;
  const account = sheet.id ? state.accounts.find((item) => item.id === sheet.id) : undefined;
  const investment = sheet.id ? state.investments.find((item) => item.id === sheet.id) : undefined;
  const goal = sheet.id ? state.goals.find((item) => item.id === sheet.id) : undefined;
  const journeyChapter = sheet.id ? state.journey.chapters.find((item) => item.id === sheet.id) : undefined;
  const wish = sheet.id ? state.wishes.find((item) => item.id === sheet.id) : undefined;
  const questRecord = sheet.id ? getActiveQuests(state).find((item) => item.id === sheet.id) : undefined;
  const hibernation = hibernationModes(state);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSheet(null); };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previouslyFocused?.focus(); };
  }, [setSheet]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
      <section ref={dialogRef} className={`modal-sheet ${sheet.type === "story-scene" || sheet.type === "journey-story" ? "story-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-grip" />
        <header><h2 id="modal-title">{sheet.title}</h2><button type="button" aria-label="Close" onClick={() => setSheet(null)}><X size={20} /></button></header>
        {sheet.body && <p className="modal-body-copy">{sheet.body}</p>}
        {sheet.type === "story-scene" && <StoryScene storyId={sheet.id ?? "vault-answers"} state={state} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
        {sheet.type === "journey-story" && <JourneyStoryScene chapterId={sheet.id ?? ""} state={state} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
        {sheet.type === "journey-story" && journeyChapter && <section className="story-accessibility"><details><summary><BookOpen size={15} /> Plain summary and scene facts</summary><p>{journeyChapter.accessibilitySummary ?? `${journeyChapter.title}. An optional story scene.`}</p><small>{journeyChapter.factsUsed?.length ? `Uses ${journeyChapter.factsUsed.length} locally stored fact references. ` : "Uses no specific financial facts. "}{journeyChapter.fallbackCopy}</small></details><button type="button" onClick={() => { updateState((previous) => ({ ...previous, journey: { ...previous.journey, chapters: previous.journey.chapters.map((chapter) => chapter.id === journeyChapter.id ? { ...chapter, completedAt: chapter.completedAt ?? new Date().toISOString() } : chapter) } })); setSheet(null); setToast("Story skipped; every finance tool remains available"); }}>Skip story without penalty</button></section>}
        {sheet.type === "metric" && <MetricDetail id={sheet.id ?? ""} state={state} />}
        {sheet.type === "events" && <div className="modal-list">{state.subscriptions.map((item) => <button type="button" key={item.id} onClick={() => setSheet({ type: "subscription", id: item.id, title: item.name })}>{item.name} · in {dayLabel(daysUntil(item.nextCharge))}<b>{formatGold(item.amount)}</b></button>)}{state.debts.map((item) => <button type="button" key={item.id} onClick={() => setSheet({ type: "debt", id: item.id, title: item.name })}>{item.name} minimum · in {dayLabel(daysUntil(item.nextDue))}<b>{formatGold(item.minimum)}</b></button>)}{!state.subscriptions.length && !state.debts.length && <p className="modal-body-copy">No future claimants or debt payments are mapped yet.</p>}</div>}
        {sheet.type === "hibernation" && <div className="formula-card"><strong>{hibernation.Comfortable.toFixed(1)} months · Comfortable</strong><div className="detail-grid"><div><span>Essential</span><strong>{hibernation.Essential.toFixed(1)} mo</strong></div><div><span>Comfortable</span><strong>{hibernation.Comfortable.toFixed(1)} mo</strong></div><div><span>Current lifestyle</span><strong>{hibernation["Current lifestyle"].toFixed(1)} mo</strong></div></div><p>Deep Vault reserves ({formatGold(getHoardSummary(state).guarded)}) ÷ the monthly cost for each mode.</p><small>This is an estimate, not financial advice.</small></div>}
        {sheet.type === "chart" && <div className="formula-card"><BarChart3 size={32} /><p>{sheet.body}</p></div>}
        {sheet.type === "worth" && <WorthTheGold state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "quest" && questRecord && <div className="detail-stack"><p>{questRecord.description}</p><small>{questRecord.reason}</small><button className="primary-button full" type="button" onClick={() => { completeQuest(questRecord); setSheet(null); }}><Check size={17} /> I completed this action</button><button className="secondary-button full" type="button" onClick={() => { updateState((previous) => ({ ...previous, quests: previous.quests.some((item) => item.id === questRecord.id) ? previous.quests.map((item) => item.id === questRecord.id ? { ...item, snoozedUntil: new Date(Date.now() + 3 * 86_400_000).toISOString() } : item) : [...previous.quests, { ...questRecord, snoozedUntil: new Date(Date.now() + 3 * 86_400_000).toISOString() }] })); setSheet(null); setToast("Quest will return in 3 days"); }}><CalendarDays size={17} /> Remind me later</button></div>}
        {sheet.type === "subscription" && subscription && <SubscriptionDetail subscription={subscription} state={state} updateState={updateState} logUse={logUse} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "chamber" && chamber && <ChamberDetail chamber={chamber} state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "debt" && debt && <DebtDetail debt={debt} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "debt-payment" && debt && <DebtPayment debt={debt} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "transaction" && transaction?.origin === "import" && <details className="transaction-provenance"><summary><ShieldCheck size={15} /> Imported source and provenance</summary><p><b>Original description</b>{transaction.originalDescription ?? transaction.merchant}</p><p><b>Original source row</b><code>{transaction.rawSourceRow ?? "Source row unavailable"}</code></p><small>Batch {transaction.importBatchId} · fingerprint {transaction.sourceFingerprint ?? "not supplied"}{transaction.sourceTransactionId ? ` · source ID ${transaction.sourceTransactionId}` : ""}</small></details>}
        {sheet.type === "transaction" && transaction && <TransactionDetail transaction={transaction} state={state} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
        {sheet.type === "account" && account && <AccountDetail account={account} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "investment" && investment && <InvestmentDetail investment={investment} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "goal" && goal && <GoalDetail goal={goal} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "wish-claim" && wish && <WishClaim wish={wish} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} navigate={navigate} />}
        {sheet.type === "add-transaction" && <AddTransaction state={state} preset={sheet.preset} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-subscription" && <AddSubscription state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-wish" && <AddWish state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-account" && <AddAccount updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-investment" && <AddInvestment state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-goal" && <AddGoal state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-debt" && <AddDebt state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "reorganise" && <Reorganise state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "reset" && <div className="confirm-panel"><p>This restores the vivid seeded demo. Your current local data will be replaced. The tutorial will not replay unless you choose Replay the Awakening.</p><button type="button" className="danger-button" onClick={() => { clearState().then(() => { const demo = createSeedState(); updateState(() => ({ ...demo, profile: { ...demo.profile, tutorialComplete: true, tutorialChapter: 0, onboardingComplete: true } })); setSheet(null); navigate("lair"); setToast("Demo hoard restored"); }); }}>Reset demo data</button><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Keep current hoard</button></div>}
        {sheet.type === "empty-vault" && <div className="confirm-panel"><p>This replaces the current device copy with a fresh private vault. Export first if you may want to restore these records.</p><button type="button" className="danger-button" onClick={() => { clearState().then(() => { const empty = createEmptyState(); updateState(() => ({ ...empty, profile: { ...empty.profile, tutorialComplete: true, onboardingComplete: true } })); setSheet(null); navigate("lair"); setToast("A fresh private vault is ready"); }); }}>Start empty vault</button><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Keep current hoard</button></div>}
        {!sheet.body && ["event", "lore", "insight", "relic", "story"].includes(sheet.type) && <p className="modal-body-copy">Nothing here is irreversible. Review the detail, then choose the next useful step.</p>}
      </section>
    </div>
  );
}

function JourneyStoryScene({ chapterId, state, updateState, setToast, setSheet }: { chapterId: string; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const chapter = state.journey.chapters.find((item) => item.id === chapterId);
  const avatar = selectedJourneyAvatar(state);
  const [choice, setChoice] = useState(chapter?.selectedChoice ?? "");
  if (!chapter) return <div className="empty-state"><Map size={32} /><strong>This atlas page is still forming.</strong><p>Return after the next Journey check-in.</p></div>;
  const choose = (nextChoice: string) => {
    const firstReading = !chapter.selectedChoice;
    setChoice(nextChoice);
    updateState((previous) => {
      const progression = firstReading ? addProgressionXp(previous, 8, `journey-story-${chapter.id}`) : previous.progression;
      return {
        ...previous,
        journey: { ...previous.journey, chapters: previous.journey.chapters.map((item) => item.id === chapter.id ? { ...item, selectedChoice: nextChoice, completedAt: item.completedAt ?? new Date().toISOString() } : item) },
        progression: { ...progression, storyChoices: { ...progression.storyChoices, [chapter.id]: nextChoice } },
      };
    });
    setToast(firstReading ? "Chapter carried forward · +8 XP" : "Journey choice updated");
  };
  return <div className={`visual-novel journey-novel route-${chapter.direction}`}><div className="journey-novel-stage"><span className="journey-scene-label">{formatDate(chapter.createdAt)} · {chapter.direction} road</span><span className="journey-novel-character" style={{ "--journey-avatar": `url("${avatar.asset}")` } as React.CSSProperties} aria-hidden="true" /></div><div className="dialogue-box"><small>{chapter.speaker === avatar.name ? `${avatar.name} · your keeper` : `${chapter.speaker} · speaking with ${avatar.name.split(" ")[0]}`}</small><p>{choice ? chapter.ending : chapter.opening}</p></div>{!choice ? <div className="story-choices">{chapter.choices.map((item) => <button type="button" key={item} onClick={() => choose(item)}><Sparkles size={15} /><span>{item}</span><ChevronRight size={16} /></button>)}</div> : <div className="story-resolution"><span><Check size={18} /></span><div><small>You chose</small><strong>{choice}</strong><p>The road can change. This chapter, its XP, and what you learned remain yours.</p></div><button type="button" onClick={() => setChoice("")}>Choose again</button></div>}<section className="story-action-preview"><Target size={18} /><span><small>Optional real-world action</small><strong>{chapter.actionTitle}</strong><p>{chapter.actionDescription}</p></span></section><button className="primary-button full" type="button" onClick={() => setSheet(null)}>{choice ? "Carry this chapter onward" : "Return to the atlas"}</button></div>;
}

function StoryScene({ storyId, state, updateState, setToast, setSheet }: { storyId: string; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const scenes = {
    "vault-answers": {
      speaker: "Moss",
      asset: "/characters/moss-standing-v1.png",
      eyebrow: "Milestone chapter",
      opening: `The vault did not open because the hoard was perfect. It opened because you returned, paid attention, and protected what mattered. Level ${state.progression.level} carries every one of those choices.`,
      ending: "The emerald doors answer with a warm light. Nothing you earned here can be taken by a difficult month.",
      choices: ["Name the win I am proudest of", "Carry a relic into the next chapter", "Celebrate quietly with Moss"],
    },
    "narrow-pass": {
      speaker: "Orin, Flight Keeper",
      asset: "/characters/flight-wizard-v2.png",
      eyebrow: "Resilience chapter",
      opening: "The path has narrowed. That can feel frightening—but narrow is not closed. We do not need to solve the whole mountain tonight. We only need one kind next step, and rest is allowed.",
      ending: "Orin redraws the map around your real life. The route is gentler now, and hope remains part of the plan.",
      choices: ["Protect the next seven days", "Ask Moss to stand watch", "Rest, then return when I can"],
    },
    "ancient-guardian": {
      speaker: "Orin, Flight Keeper",
      asset: "/characters/flight-wizard-v2.png",
      eyebrow: state.progression.level >= 10 ? "Title chapter · unlocked" : "A future chapter",
      opening: state.progression.level >= 10 ? "The old door recognises you—not by wealth, but by the patience, honesty, and care you carried here. The title of Ancient Guardian is yours." : "Beyond the ridge, an old door waits for Level 10. It is not withholding approval. It is simply saving a celebration for the keeper you are already becoming.",
      ending: "The future vault leaves a small light burning at the horizon. You are welcome on the path at every pace.",
      choices: ["Keep the light in sight", "Read the lessons already earned", "Walk at my own pace"],
    },
  } as const;
  const scene = scenes[storyId as keyof typeof scenes] ?? scenes["vault-answers"];
  const savedChoice = state.progression.storyChoices[storyId];
  const [choice, setChoice] = useState(savedChoice ?? "");
  const choose = (nextChoice: string) => {
    setChoice(nextChoice);
    updateState((previous) => {
      const firstReading = !previous.progression.storyChoices[storyId];
      const progression = firstReading ? addProgressionXp(previous, 8, `story-${storyId}`) : previous.progression;
      return { ...previous, progression: { ...progression, storyChoices: { ...progression.storyChoices, [storyId]: nextChoice } } };
    });
    setToast(savedChoice ? "Chapter choice updated" : "Chapter carried forward · +8 XP");
  };
  return <div className={`visual-novel scene-${storyId}`}><div className="novel-stage"><span className="novel-moon" /><span className="novel-character" style={{ "--novel-character": `url("${scene.asset}")` } as React.CSSProperties} aria-hidden="true" /><span className="novel-place">{scene.eyebrow}</span></div><div className="dialogue-box"><small>{scene.speaker}</small><p>{choice ? scene.ending : scene.opening}</p></div>{!choice ? <div className="story-choices">{scene.choices.map((item) => <button type="button" key={item} onClick={() => choose(item)}><Sparkles size={15} /><span>{item}</span><ChevronRight size={16} /></button>)}</div> : <div className="story-resolution"><span><Check size={18} /></span><div><small>You chose</small><strong>{choice}</strong><p>You may revisit and choose again. The XP and lesson remain permanent.</p></div><button type="button" onClick={() => setChoice("")}>Choose again</button></div>}<button className="primary-button full" type="button" onClick={() => setSheet(null)}>{choice ? "Carry this chapter with me" : "Return to the legacy"}</button></div>;
}

function MetricDetail({ id, state }: { id: string; state: DragonState }) {
  const summary = getHoardSummary(state);
  const content: Record<string, { value: number; text: string }> = {
    available: { value: summary.available, text: "Liquid money visible now in your transaction accounts." },
    committed: { value: summary.committed, text: "Money needed for known bills and planned obligations before payday." },
    guarded: { value: summary.guarded, text: "Savings and emergency funds you intentionally protect." },
    invested: { value: summary.invested, text: "Long-term value held for your future self." },
  };
  const item = content[id] ?? content.available;
  return <div className="detail-stack"><strong>{formatGold(item.value)}</strong><p>{item.text}</p><small>Tap labels across Dragon Mode for the plain-language meaning.</small></div>;
}

function WorthTheGold({ state, updateState, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const ratings: WorthRating[] = ["Absolutely", "Mostly", "Neutral", "Probably not", "Regret it"];
  const candidates = state.transactions.filter((item) => item.direction === "expense" && !item.worthRating).slice(0, 3);
  return <div className="worth-list">{candidates.map((transaction) => <section key={transaction.id}><div><strong>{transaction.merchant}</strong><small>{formatGold(transaction.amount)} · {transaction.category}</small></div><div>{ratings.map((rating) => <button type="button" key={rating} onClick={() => { updateState((previous) => ({ ...previous, transactions: previous.transactions.map((item) => item.id === transaction.id ? { ...item, worthRating: rating } : item) })); setToast("Worth rating saved"); }}>{rating}</button>)}</div></section>)}{!candidates.length && <div className="empty-state"><Star size={30} /><strong>Every selected purchase is rated.</strong><p>The Scrying Pool can now show clearer value patterns.</p></div>}</div>;
}

function SubscriptionDetail({ subscription, state, updateState, logUse, setSheet, setToast }: { subscription: Subscription; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; logUse: (subscription: Subscription, quantity?: number) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(subscription.amount.toString());
  const [cadence, setCadence] = useState(subscription.cadence);
  const [nextCharge, setNextCharge] = useState(subscription.nextCharge.slice(0, 10));
  const [trackingMode, setTrackingMode] = useState(subscription.trackingMode);
  const [valueRating, setValueRating] = useState(subscription.valueRating);
  const [cancellationNotes, setCancellationNotes] = useState(subscription.cancellationNotes);
  const [reminderDays, setReminderDays] = useState(subscription.reminderDays);
  const [usageQuestDays, setUsageQuestDays] = useState(subscription.usageQuestDays);
  const [questEnabled, setQuestEnabled] = useState(subscription.questEnabled);
  const [accountId, setAccountId] = useState(subscription.accountId);
  const monthly = monthlySubscriptionAmount({ ...subscription, amount: Number(amount) || 0, cadence });
  const billingUses = currentBillingUsage(subscription);
  const save = () => {
    const numericAmount = Number(amount) || subscription.amount;
    updateState((previous) => ({ ...previous, subscriptions: previous.subscriptions.map((item) => item.id === subscription.id ? {
      ...item,
      amount: numericAmount,
      cadence,
      nextCharge: new Date(`${nextCharge}T12:00:00`).toISOString(),
      trackingMode,
      valueRating,
      cancellationNotes,
      reminderDays,
      usageQuestDays,
      questEnabled,
      accountId,
      priceChange: numericAmount !== item.amount ? numericAmount - item.amount : undefined,
      priceHistory: numericAmount !== item.amount ? [...item.priceHistory, { amount: numericAmount, changedAt: new Date().toISOString() }] : item.priceHistory,
    } : item) }));
    setToast("Claimant details saved");
  };
  const schedule = async () => {
    const at = new Date(new Date(`${nextCharge}T09:00:00`).getTime() - reminderDays * 86_400_000);
    if (at.getTime() <= Date.now()) at.setTime(Date.now() + 60_000);
    try {
      const result = await scheduleClaimantReminder({ id: subscription.id, name: subscription.name, amount: Number(amount) || subscription.amount, at });
      updateState((previous) => ({ ...previous, subscriptions: previous.subscriptions.map((item) => item.id === subscription.id ? { ...item, reminderEnabled: result.scheduled } : item), profile: { ...previous.profile, notificationsEnabled: result.scheduled || previous.profile.notificationsEnabled } }));
      setToast(result.reason);
    } catch {
      setToast("This reminder could not be scheduled");
    }
  };
  return <div className="subscription-detail"><div className="detail-hero"><span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span><div><strong>{formatGold(Number(amount) || 0)}</strong><small>Renews {formatDate(`${nextCharge}T12:00:00`)}</small></div></div>{subscription.priceChange && <p className="warning-copy">Price change ready for review: {subscription.priceChange > 0 ? "+" : "−"}{formatGold(Math.abs(subscription.priceChange))}. Saving acknowledges this review.</p>}<div className="detail-grid"><div><span>Annual cost</span><strong>{formatGold(monthly * 12)}</strong></div><div><span>This billing period</span><strong>{billingUses} use{billingUses === 1 ? "" : "s"}</strong></div><div><span>Cost per period use</span><strong>{formatGold(subscriptionCostPerUse(state, subscription.id))}</strong></div><div><span>Last logged</span><strong>{subscription.lastUsed ? `${daysSince(subscription.lastUsed)}d ago` : "Never"}</strong></div></div><label className="quantity-field">Quantity<input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><button type="button" className="primary-button full" onClick={() => logUse(subscription, quantity)}><Check size={18} /> Used today</button><div className="edit-grid"><label>Price<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Cadence<select value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label><label>Next charge<input type="date" value={nextCharge} onChange={(event) => setNextCharge(event.target.value)} /></label><label>Payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label>Usage tracking<select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as typeof trackingMode)}><option value="every-use">Every use</option><option value="weekly">Weekly check</option><option value="monthly">Monthly review</option><option value="off">Do not track</option></select></label><label>Value rating<select value={valueRating} onChange={(event) => setValueRating(event.target.value as typeof valueRating)}><option>Not rated</option><option>Absolutely</option><option>Mostly</option><option>Neutral</option><option>Probably not</option><option>Regret it</option></select></label><label>Usage quest after <select value={usageQuestDays} onChange={(event) => setUsageQuestDays(Number(event.target.value))}><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><label>Reminder before <select value={reminderDays} onChange={(event) => setReminderDays(Number(event.target.value))}><option value="1">1 day</option><option value="2">2 days</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label><label className="check-label"><input type="checkbox" checked={questEnabled} onChange={(event) => setQuestEnabled(event.target.checked)} /> Offer non-use quests</label></div><label>Cancellation notes<textarea value={cancellationNotes} onChange={(event) => setCancellationNotes(event.target.value)} placeholder="Where to cancel, notice period, or export steps" /></label><div className="price-history"><h3>Price history</h3>{subscription.priceHistory.map((entry) => <p key={`${entry.changedAt}-${entry.amount}`}><span>{formatDate(entry.changedAt)}</span><b>{formatGold(entry.amount)}</b></p>)}</div><button type="button" className="primary-button full" onClick={save}><Save size={17} /> Save claimant</button><button type="button" className="secondary-button full" onClick={schedule}><Bell size={17} /> Schedule friendly reminder</button><button type="button" className="danger-button full" onClick={() => { cancelClaimantReminder(subscription.id).catch(() => undefined); updateState((previous) => ({ ...previous, subscriptions: previous.subscriptions.filter((item) => item.id !== subscription.id) })); setSheet(null); setToast("Claimant and reminder removed"); }}><Trash2 size={17} /> Remove claimant</button><p className="fine-print">Cost per use covers the current billing period and only usage you logged.</p></div>;
}

function ChamberDetail({ chamber, state, updateState, setToast }: { chamber: DragonState["chambers"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(chamber.name);
  const [practicalName, setPracticalName] = useState(chamber.practicalName);
  const [amount, setAmount] = useState(chamber.amount.toString());
  const [target, setTarget] = useState(chamber.target.toString());
  const [type, setType] = useState(chamber.type);
  const [color, setColor] = useState(chamber.color);
  const transactions = state.transactions.filter((item) => item.category === chamber.name || item.category === chamber.practicalName).slice(0, 3);
  return <div className="detail-stack"><div className="edit-grid"><label>Lore name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Plain name<input value={practicalName} onChange={(event) => setPracticalName(event.target.value)} /></label><label>Current amount<input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} /></label><label>Target<input value={target} inputMode="decimal" onChange={(event) => setTarget(event.target.value)} /></label><label>Purpose<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="essential">Essential</option><option value="savings">Savings</option><option value="flexible">Flexible</option><option value="investment">Investment</option><option value="recurring">Recurring</option><option value="goal">Goal</option><option value="debt">Debt</option></select></label><label>Colour<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label></div><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, chambers: previous.chambers.map((item) => item.id === chamber.id ? { ...item, name, practicalName, amount: Number(amount) || 0, target: Number(target) || 0, type, color } : item), transactions: previous.transactions.map((item) => item.category === chamber.name ? { ...item, category: name } : item) })); setToast(`${name} updated`); }}><Save size={17} /> Save chamber</button>{transactions.length > 0 && <div className="mini-history"><h3>Recent movement</h3>{transactions.map((item) => <p key={item.id}>{item.merchant}<b>{formatGold(item.amount)}</b></p>)}</div>}</div>;
}

function DebtDetail({ debt, state, updateState, setSheet, setToast }: { debt: DragonState["debts"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(debt.name);
  const [balance, setBalance] = useState(debt.balance.toString());
  const [apr, setApr] = useState(debt.apr.toString());
  const [minimum, setMinimum] = useState(debt.minimum.toString());
  const [nextDue, setNextDue] = useState(debt.nextDue.slice(0, 10));
  const [accountId, setAccountId] = useState(debt.accountId ?? state.accounts.find((account) => account.type === "transaction" || account.type === "cash")?.id ?? "");
  return <div className="detail-stack"><strong>{formatGold(Number(balance) || 0)}</strong><div className="edit-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>APR %<input inputMode="decimal" value={apr} onChange={(event) => setApr(event.target.value)} /></label><label>Minimum payment<input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label>Next due<input type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} /></label><label>Payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Choose each time</option>{state.accounts.filter((account) => !account.archived).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div><button type="button" className="secondary-button full" onClick={() => setSheet({ type: "debt-payment", id: debt.id, title: `Record payment · ${debt.name}` })}><Coins size={17} /> Record a payment</button><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, debts: previous.debts.map((item) => item.id === debt.id ? { ...item, name, balance: Number(balance) || 0, apr: Number(apr) || 0, minimum: Number(minimum) || 0, accountId: accountId || undefined, nextDue: new Date(`${nextDue}T12:00:00`).toISOString(), progress: Math.min(100, Math.max(0, Math.round(((item.principal - (Number(balance) || 0)) / item.principal) * 100))) } : item) })); setToast("Debt plan updated"); }}><Save size={17} /> Save claim</button><button type="button" className="danger-button full" onClick={() => { updateState((previous) => ({ ...previous, debts: previous.debts.filter((item) => item.id !== debt.id) })); setSheet(null); setToast("Claim removed from the map"); }}><Trash2 size={17} /> Remove claim</button><p>Direct balance edits are treated as reconciliation. Recorded payments create an account movement as well.</p></div>;
}

function DebtPayment({ debt, state, updateState, setSheet, setToast }: { debt: DragonState["debts"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const eligibleAccounts = state.accounts.filter((account) => !account.archived && account.type !== "credit" && account.type !== "loan");
  const [amount, setAmount] = useState(Math.min(debt.minimum || 50, debt.balance).toString());
  const [accountId, setAccountId] = useState(debt.accountId ?? eligibleAccounts[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const record = () => {
    const numericAmount = Math.min(debt.balance, Math.max(0, Number(amount) || 0));
    if (!numericAmount || !accountId) return;
    const transaction: Transaction = { id: crypto.randomUUID(), accountId, date: new Date(`${date}T12:00:00`).toISOString(), merchant: `${debt.name} payment`, amount: numericAmount, direction: "expense", category: "Debt payment", note: `Payment recorded against ${debt.name}`, status: "cleared", createdManually: true };
    updateState((previous) => {
      const reconciled = createTransaction(previous, transaction);
      return { ...reconciled, debts: reconciled.debts.map((item) => item.id === debt.id ? { ...item, accountId, balance: Math.max(0, item.balance - numericAmount), progress: Math.min(100, Math.round(((item.principal - Math.max(0, item.balance - numericAmount)) / Math.max(1, item.principal)) * 100)) } : item), progression: addProgressionXp(reconciled, 5, `debt-payment-${debt.id}-${date}`) };
    });
    setSheet(null);
    setToast(`${formatGold(numericAmount, 0)} payment reconciled · +5 XP`);
  };
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); record(); }}><div className="formula-card"><LockKeyhole size={28} /><strong>{formatGold(debt.balance)} remaining</strong><p>This creates an expense movement and reduces the mapped debt by the same amount.</p></div><div className="edit-grid"><label>Payment amount<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Paid from<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{eligibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div>{!eligibleAccounts.length && <p className="warning-copy">Add a cash, transaction, savings, investment, or asset account before recording a linked payment.</p>}<button disabled={!eligibleAccounts.length} className="primary-button full" type="submit"><Coins size={18} /> Record and reconcile payment</button></form>;
}

function TransactionDetail({ transaction, state, updateState, setToast, setSheet }: { transaction: DragonState["transactions"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [direction, setDirection] = useState(transaction.direction);
  const [category, setCategory] = useState(transaction.category);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [note, setNote] = useState(transaction.note);
  const [status, setStatus] = useState(transaction.status);
  const [unusual, setUnusual] = useState(Boolean(transaction.unusual));
  const [duplicate, setDuplicate] = useState(Boolean(transaction.duplicate));
  const [recurringSeriesId, setRecurringSeriesId] = useState(transaction.recurringSeriesId ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState(transaction.transferToAccountId ?? "");
  const [worthRating, setWorthRating] = useState<WorthRating | "">(transaction.worthRating ?? "");
  const reviewed = Boolean(transaction.reviewedAt);
  const save = (markReviewed = false) => {
    const nextTransaction: Transaction = { ...transaction, merchant, amount: Number(amount) || 0, date: new Date(`${date}T12:00:00`).toISOString(), direction, category, accountId, transferToAccountId: transaction.transfer ? transferToAccountId || undefined : undefined, note, status, unusual, duplicate, reviewedAt: markReviewed ? new Date().toISOString() : transaction.reviewedAt, recurringSeriesId: recurringSeriesId || undefined, worthRating: worthRating || undefined };
    updateState((previous) => {
      const reconciled = replaceTransaction(previous, transaction, nextTransaction);
      return {
        ...reconciled,
        quests: reconciled.quests.map((quest) => quest.relatedEntityId === transaction.id && (markReviewed || (!unusual && !duplicate && category !== "Uncategorised")) ? { ...quest, completed: true, completedAt: new Date().toISOString() } : quest),
        progression: markReviewed && !reviewed ? addProgressionXp(reconciled, 10, `review-${transaction.id}`) : reconciled.progression,
      };
    });
    setToast(markReviewed ? "Movement reviewed · +10 XP" : "Transaction updated");
  };
  return <div className="detail-stack"><strong className={direction}>{transaction.transfer ? "↔ " : direction === "income" ? "+" : "−"}{formatGold(Number(amount) || 0)}</strong>{(transaction.unusual || transaction.duplicate) && !reviewed && <p className="warning-copy">This movement was flagged for a calm review. Only you can confirm it.</p>}<div className="edit-grid"><label>Merchant or source<input value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label><label>Amount<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>{!transaction.transfer && <label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="expense">Expense</option><option value="income">Income</option></select></label>}<label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Uncategorised</option><option>Income</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>{transaction.transfer ? "From account" : "Account"}<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{transaction.transfer && <label>To account<select value={transferToAccountId} onChange={(event) => setTransferToAccountId(event.target.value)}>{state.accounts.filter((item) => item.id !== accountId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="cleared">Cleared</option><option value="pending">Pending</option></select></label><label>Recurring claimant<select value={recurringSeriesId} onChange={(event) => setRecurringSeriesId(event.target.value)}><option value="">Not recurring</option>{state.subscriptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Worth the Gold?<select value={worthRating} onChange={(event) => setWorthRating(event.target.value as WorthRating | "")}><option value="">Not rated</option><option>Absolutely</option><option>Mostly</option><option>Neutral</option><option>Probably not</option><option>Regret it</option></select></label><label className="check-label"><input type="checkbox" checked={unusual} onChange={(event) => setUnusual(event.target.checked)} /> Mark unusual</label><label className="check-label"><input type="checkbox" checked={duplicate} onChange={(event) => setDuplicate(event.target.checked)} /> Possible duplicate</label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><p className="estimate-note">Saving or deleting this movement reconciles every affected account and chamber.</p><button type="button" className="primary-button full" onClick={() => save(false)}><Save size={17} /> Save changes</button>{!reviewed && (transaction.unusual || transaction.duplicate) && <button type="button" className="secondary-button full" onClick={() => save(true)}><ShieldCheck size={17} /> Mark reviewed</button>}<button type="button" className="danger-button full" onClick={() => { updateState((previous) => deleteTransaction(previous, transaction)); setSheet(null); setToast("Transaction removed and balances reconciled"); }}><Trash2 size={17} /> Delete transaction</button></div>;
}

function AccountDetail({ account, state, updateState, setSheet, setToast }: { account: DragonState["accounts"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(account.balance.toString());
  const [type, setType] = useState(account.type);
  const [chamberId, setChamberId] = useState(account.chamberId);
  const [institutionName, setInstitutionName] = useState(account.institutionName ?? "");
  const [includedInHoard, setIncludedInHoard] = useState(account.includedInHoard);
  const [creditLimit, setCreditLimit] = useState((account.creditLimit ?? 0).toString());
  const [interestRate, setInterestRate] = useState((account.interestRate ?? 0).toString());
  const [apy, setApy] = useState((account.apy ?? 0).toString());
  const [compounding, setCompounding] = useState(account.compounding ?? "monthly");
  const [promotionalApy, setPromotionalApy] = useState((account.promotionalApy ?? 0).toString());
  const [promotionStart, setPromotionStart] = useState(account.promotionStart?.slice(0, 10) ?? "");
  const [promotionEnd, setPromotionEnd] = useState(account.promotionEnd?.slice(0, 10) ?? "");
  const [bonusApy, setBonusApy] = useState((account.bonusApy ?? 0).toString());
  const [bonusConditions, setBonusConditions] = useState(account.bonusConditions ?? "");
  const [bonusStatus, setBonusStatus] = useState(account.bonusStatus ?? "unknown");
  const [interestPaymentFrequency, setInterestPaymentFrequency] = useState(account.interestPaymentFrequency ?? "unknown");
  const [nextInterestDate, setNextInterestDate] = useState(account.nextInterestDate?.slice(0, 10) ?? "");
  const [maturityDate, setMaturityDate] = useState(account.maturityDate?.slice(0, 10) ?? "");
  const [earlyWithdrawalNoticeDays, setEarlyWithdrawalNoticeDays] = useState((account.earlyWithdrawalNoticeDays ?? 0).toString());
  const [earlyWithdrawalNote, setEarlyWithdrawalNote] = useState(account.earlyWithdrawalNote ?? "");
  const [color, setColor] = useState(account.color);
  const saveAccount = () => {
    const nextBalance = Number(balance) || 0;
    const previousHoardAmount = account.type === "credit" || account.type === "loan" ? 0 : Math.max(0, account.balance);
    const nextHoardAmount = type === "credit" || type === "loan" ? 0 : Math.max(0, nextBalance);
    updateState((previous) => ({
      ...previous,
      chambers: previous.chambers.map((chamber) => {
        const remove = chamber.id === account.chamberId && account.includedInHoard ? previousHoardAmount : 0;
        const add = chamber.id === chamberId && includedInHoard ? nextHoardAmount : 0;
        return remove || add ? { ...chamber, amount: Math.max(0, chamber.amount - remove + add) } : chamber;
      }),
      accounts: previous.accounts.map((item) => item.id === account.id ? { ...item, name, balance: nextBalance, availableBalance: item.availableBalance === undefined ? undefined : nextBalance, type, chamberId, institutionName, includedInHoard, creditLimit: Number(creditLimit) || undefined, interestRate: Number(interestRate) || undefined, apy: Number(apy) || undefined, compounding, promotionalApy: Number(promotionalApy) || undefined, promotionStart: promotionStart ? new Date(`${promotionStart}T12:00:00`).toISOString() : undefined, promotionEnd: promotionEnd ? new Date(`${promotionEnd}T12:00:00`).toISOString() : undefined, bonusApy: Number(bonusApy) || undefined, bonusConditions: bonusConditions.trim() || undefined, bonusStatus, interestPaymentFrequency, nextInterestDate: nextInterestDate ? new Date(`${nextInterestDate}T12:00:00`).toISOString() : undefined, maturityDate: maturityDate ? new Date(`${maturityDate}T12:00:00`).toISOString() : undefined, earlyWithdrawalNoticeDays: Number(earlyWithdrawalNoticeDays) || undefined, earlyWithdrawalNote: earlyWithdrawalNote.trim() || undefined, lastConfirmedBalance: nextBalance, lastConfirmedAt: new Date().toISOString(), balanceSnapshots: nextBalance !== item.balance ? [...(item.balanceSnapshots ?? []), { id: crypto.randomUUID(), accountId: item.id, balance: nextBalance, capturedAt: new Date().toISOString(), source: "manual" as const, confirmed: true }].slice(-400) : item.balanceSnapshots, color } : item),
    }));
    setSheet(null);
    setToast("Account and yield settings updated");
  };
  const archiveAccount = () => {
    updateState((previous) => ({
      ...previous,
      chambers: previous.chambers.map((chamber) => chamber.id === account.chamberId && account.includedInHoard && account.type !== "credit" && account.type !== "loan" ? { ...chamber, amount: Math.max(0, chamber.amount - Math.max(0, account.balance)) } : chamber),
      accounts: previous.accounts.map((item) => item.id === account.id ? { ...item, archived: true, includedInHoard: false } : item),
    }));
    setSheet(null);
    setToast("Account archived");
  };
  return <div className="detail-stack"><strong>{formatGold(Number(balance) || 0)}</strong><div className="edit-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Institution<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} /></label><label>Balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="cash">Cash</option><option value="transaction">Transaction</option><option value="savings">Savings</option><option value="credit">Credit</option><option value="loan">Loan</option><option value="investment">Investment</option><option value="asset">Asset</option></select></label><label>Credit limit<input inputMode="decimal" value={creditLimit} onChange={(event) => setCreditLimit(event.target.value)} /></label><label>Borrowing APR %<input inputMode="decimal" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /></label><label>Base deposit APY %<input inputMode="decimal" value={apy} onChange={(event) => setApy(event.target.value)} /></label><label>Compounding<select value={compounding} onChange={(event) => setCompounding(event.target.value as typeof compounding)}><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label><label>Promotional APY %<input inputMode="decimal" value={promotionalApy} onChange={(event) => setPromotionalApy(event.target.value)} /></label><label>Promotion starts<input type="date" value={promotionStart} onChange={(event) => setPromotionStart(event.target.value)} /></label><label>Promotion ends<input type="date" value={promotionEnd} onChange={(event) => setPromotionEnd(event.target.value)} /></label><label>Bonus APY %<input inputMode="decimal" value={bonusApy} onChange={(event) => setBonusApy(event.target.value)} /></label><label>Bonus status<select value={bonusStatus} onChange={(event) => setBonusStatus(event.target.value as typeof bonusStatus)}><option value="unknown">Unknown — do not assume</option><option value="met">Conditions met</option><option value="not-met">Conditions not met</option></select></label><label>Interest paid<select value={interestPaymentFrequency} onChange={(event) => setInterestPaymentFrequency(event.target.value as typeof interestPaymentFrequency)}><option value="unknown">Unknown</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="maturity">At maturity</option></select></label><label>Next interest date<input type="date" value={nextInterestDate} onChange={(event) => setNextInterestDate(event.target.value)} /></label><label>Maturity date<input type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></label><label>Early-access notice days<input inputMode="numeric" value={earlyWithdrawalNoticeDays} onChange={(event) => setEarlyWithdrawalNoticeDays(event.target.value)} /></label><label>Colour<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}>{state.chambers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={includedInHoard} onChange={(event) => setIncludedInHoard(event.target.checked)} /> Include in hoard</label></div><label>Bonus conditions<textarea value={bonusConditions} onChange={(event) => setBonusConditions(event.target.value)} placeholder="For example: deposit monthly and make five card purchases" /></label><label>Early-access or rollover note<textarea value={earlyWithdrawalNote} onChange={(event) => setEarlyWithdrawalNote(event.target.value)} placeholder="Optional factual note from the account terms" /></label><p className="estimate-note">Rate and maturity fields power dated Idle Vault illustrations. Unknown bonus conditions are excluded, and estimates never add money to this balance.</p><button type="button" className="primary-button full" onClick={saveAccount}><Save size={17} /> Save account and confirm balance</button><button type="button" className="danger-button full" onClick={archiveAccount}><Trash2 size={17} /> Archive account</button></div>;
}

function InvestmentDetail({ investment, state, updateState, setSheet, setToast }: { investment: InvestmentPosition; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(investment.name);
  const [type, setType] = useState(investment.type);
  const [units, setUnits] = useState(investment.units.toString());
  const [unitPrice, setUnitPrice] = useState(investment.unitPrice.toString());
  const [contributions, setContributions] = useState(investment.contributions.toString());
  const [feeRate, setFeeRate] = useState((investment.feeRate ?? 0).toString());
  const [riskLabel, setRiskLabel] = useState(investment.riskLabel ?? "unknown");
  const [annualReturnAssumption, setAnnualReturnAssumption] = useState(investment.annualReturnAssumption.toString());
  const [accountId, setAccountId] = useState(investment.accountId);
  const [ticker, setTicker] = useState(investment.ticker ?? "");
  const [dividendYield, setDividendYield] = useState((investment.dividendYield ?? 0).toString());
  const [dividendFrequency, setDividendFrequency] = useState(investment.dividendFrequency ?? "quarterly");
  const [nextDividendDate, setNextDividendDate] = useState(investment.nextDividendDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(investment.note);
  const value = (Number(units) || 0) * (Number(unitPrice) || 0);
  const savePosition = () => {
    updateState((previous) => {
      const investments = previous.investments.map((item) => item.id === investment.id ? { ...item, name, ticker: EXPERIMENTAL_MARKET_DATA ? ticker.trim() || undefined : item.ticker, type, units: Number(units) || 0, unitPrice: Number(unitPrice) || 0, marketPrice: Number(unitPrice) || 0, quoteSource: "manual" as const, priceConfirmedAt: new Date().toISOString(), contributions: Number(contributions) || 0, costBasis: Number(contributions) || 0, feeRate: Number(feeRate) || 0, riskLabel, annualReturnAssumption: Number(annualReturnAssumption) || 0, dividendYield: Number(dividendYield) || undefined, dividendFrequency, nextDividendDate: nextDividendDate ? new Date(`${nextDividendDate}T12:00:00`).toISOString() : undefined, accountId, note, updatedAt: new Date().toISOString() } : item);
      return syncInvestmentAccounts(previous, investments);
    });
    setToast("Position and linked account reconciled");
  };
  const removePosition = () => {
    updateState((previous) => syncInvestmentAccounts(previous, previous.investments.filter((item) => item.id !== investment.id)));
    setSheet(null);
    setToast("Position removed and linked account reconciled");
  };
  return <div className="detail-stack"><strong>{formatGold(value)}</strong><p>Manual value is active. Confirm actual holdings and distributions with your provider; Dragon Mode never places trades.</p><div className="edit-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>{EXPERIMENTAL_MARKET_DATA && <label>Market symbol<input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder="e.g. VGS.AX" autoCapitalize="characters" /></label>}<label>Type<select value={type} onChange={(event) => setType(event.target.value as InvestmentPosition["type"])}><option value="fund">Fund</option><option value="shares">Shares</option><option value="retirement">Retirement</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label>Units<input inputMode="decimal" value={units} onChange={(event) => setUnits(event.target.value)} /></label><label>Confirmed/manual unit price<input inputMode="decimal" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} /></label><label>Cost basis / contributions<input inputMode="decimal" value={contributions} onChange={(event) => setContributions(event.target.value)} /></label><label>Entered annual fee %<input inputMode="decimal" value={feeRate} onChange={(event) => setFeeRate(event.target.value)} /></label><label>Descriptive risk label<select value={riskLabel} onChange={(event) => setRiskLabel(event.target.value as typeof riskLabel)}><option value="unknown">Unknown</option><option value="lower">Lower variability</option><option value="medium">Medium variability</option><option value="higher">Higher variability</option></select></label><label>Annual assumption %<input inputMode="decimal" value={annualReturnAssumption} onChange={(event) => setAnnualReturnAssumption(event.target.value)} /></label><label>Entered dividend yield %<input inputMode="decimal" value={dividendYield} onChange={(event) => setDividendYield(event.target.value)} /></label><label>Dividend cadence<select value={dividendFrequency} onChange={(event) => setDividendFrequency(event.target.value as typeof dividendFrequency)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half-yearly">Half-yearly</option><option value="annual">Annual</option><option value="irregular">Irregular</option></select></label><label>Next declared dividend<input type="date" value={nextDividendDate} onChange={(event) => setNextDividendDate(event.target.value)} /></label><label>Linked account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.filter((account) => account.type === "investment" || account.type === "asset").map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><p className="estimate-note">Saving records a confirmed/manual price and recalculates the linked investment account. Fee, risk, return, and dividend fields are editable illustrations—not a product assessment or recommendation.</p><button className="primary-button full" type="button" onClick={savePosition}><Save size={17} /> Save and reconcile position</button><button className="danger-button full" type="button" onClick={removePosition}><Trash2 size={17} /> Remove position</button></div>;
}

function GoalDetail({ goal, state, updateState, setSheet, setToast }: { goal: Goal; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [declaredAmount, setDeclaredAmount] = useState(String(goal.declaredAmount ?? Math.max(0, goal.currentAmount - (goal.verifiedAmount ?? 0))));
  const [targetDate, setTargetDate] = useState(goal.targetDate.slice(0, 10));
  const [chamberId, setChamberId] = useState(goal.chamberId);
  const [priority, setPriority] = useState(goal.priority);
  const [status, setStatus] = useState(goal.status);
  const [note, setNote] = useState(goal.note);
  const alreadyLinked = new Set(state.goals.flatMap((item) => item.progressEvents ?? []).map((event) => event.transactionId).filter(Boolean));
  const linkable = state.transactions.filter((transaction) => transaction.status === "cleared" && !transaction.transfer && !alreadyLinked.has(transaction.id)).slice(0, 20);
  const [linkedTransactionId, setLinkedTransactionId] = useState(linkable[0]?.id ?? "");
  const linkMovement = () => {
    const transaction = state.transactions.find((item) => item.id === linkedTransactionId);
    if (!transaction) return;
    updateState((previous) => ({
      ...previous,
      goals: previous.goals.map((item) => {
        if (item.id !== goal.id || item.progressEvents?.some((event) => event.transactionId === transaction.id)) return item;
        const verified = (item.verifiedAmount ?? 0) + transaction.amount;
        const declared = item.declaredAmount ?? Math.max(0, item.currentAmount - (item.verifiedAmount ?? 0));
        const current = declared + verified;
        return { ...item, verifiedAmount: verified, currentAmount: current, status: current >= item.targetAmount ? "completed" as const : item.status, progressEvents: [...(item.progressEvents ?? []), { id: `goal-link-${item.id}-${transaction.id}`, amount: transaction.amount, source: "linked-transaction" as const, recordedAt: new Date().toISOString(), transactionId: transaction.id }] };
      }),
      progression: addProgressionXp(previous, 5, `goal-link-${goal.id}-${transaction.id}`),
    }));
    setLinkedTransactionId("");
    setToast("Movement linked as verified goal progress · +5 XP");
  };
  return <div className="detail-stack">
    <div className="goal-detail-banner"><Target size={26} /><span><small>Progress is never erased</small><strong>{Math.round(goal.currentAmount / Math.max(1, goal.targetAmount) * 100)}% of this path is mapped</strong></span></div>
    <div className="goal-evidence"><div><small>Declared / mapped</small><strong>{formatGold(goal.declaredAmount ?? Math.max(0, goal.currentAmount - (goal.verifiedAmount ?? 0)))}</strong></div><div><small>Linked / verified</small><strong>{formatGold(goal.verifiedAmount ?? 0)}</strong></div></div>
    <div className="edit-grid"><label>Goal name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Target amount<input inputMode="decimal" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} /></label><label>Declared progress<input inputMode="decimal" value={declaredAmount} onChange={(event) => setDeclaredAmount(event.target.value)} /></label><label>Target date<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}>{state.chambers.map((chamber) => <option key={chamber.id} value={chamber.id}>{chamber.name}</option>)}</select></label><label>Rhythm<select value={priority} onChange={(event) => setPriority(event.target.value as Goal["priority"])}><option value="gentle">Gentle</option><option value="steady">Steady</option><option value="focused">Focused</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Goal["status"])}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label></div>
    <p className="estimate-note">Declared progress is your editable planning note and does not prove that money moved. Linked progress points back to a real cleared movement you select.</p>
    {linkable.length > 0 && <section className="goal-linker"><strong>Link a cleared movement</strong><select value={linkedTransactionId} onChange={(event) => setLinkedTransactionId(event.target.value)}><option value="">Choose a movement</option>{linkable.map((transaction) => <option value={transaction.id} key={transaction.id}>{formatDate(transaction.date)} · {transaction.merchant} · {formatGold(transaction.amount)}</option>)}</select><button type="button" disabled={!linkedTransactionId} onClick={linkMovement}><ShieldCheck size={16} /> Confirm linked progress</button></section>}
    <label>Why it matters<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <button className="primary-button full" type="button" onClick={() => { const target = Math.max(1, Number(targetAmount) || 0); const declared = Math.max(0, Number(declaredAmount) || 0); const current = declared + (goal.verifiedAmount ?? 0); updateState((previous) => ({ ...previous, goals: previous.goals.map((item) => item.id === goal.id ? { ...item, name: name.trim() || item.name, targetAmount: target, declaredAmount: declared, verifiedAmount: item.verifiedAmount ?? 0, currentAmount: current, targetDate: new Date(`${targetDate}T12:00:00`).toISOString(), chamberId, priority, status: current >= target ? "completed" : status, note: note.trim() || "A protected goal for the road ahead." } : item), progression: current >= target && goal.status !== "completed" ? addProgressionXp(previous, 25, `goal-complete-${goal.id}`) : previous.progression })); setSheet(null); setToast(current >= target ? "Goal protected · a permanent victory" : "Goal path updated"); }}><Save size={17} /> Save goal</button>
    <button className="danger-button full" type="button" onClick={() => { updateState((previous) => ({ ...previous, goals: previous.goals.filter((item) => item.id !== goal.id) })); setSheet(null); setToast("Goal removed; earned progress remains"); }}><Trash2 size={17} /> Remove goal</button>
  </div>;
}

function AddGoal({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState(dateAfterDays(90));
  const [chamberId, setChamberId] = useState("wish");
  const [priority, setPriority] = useState<Goal["priority"]>("steady");
  const [note, setNote] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); const target = Number(targetAmount); const declared = Math.max(0, Number(currentAmount) || 0); if (!name.trim() || target <= 0) return; updateState((previous) => ({ ...previous, goals: [...previous.goals, { id: crypto.randomUUID(), name: name.trim(), targetAmount: target, currentAmount: declared, declaredAmount: declared, verifiedAmount: 0, progressEvents: [], targetDate: new Date(`${targetDate}T12:00:00`).toISOString(), chamberId, priority, status: declared >= target ? "completed" : "active", visualRelicId: chamberId === "vault" ? "shield" : chamberId === "workshop" ? "key" : "star", note: note.trim() || "A protected milestone for the road ahead." }], progression: addProgressionXp(previous, 5, "first-goal") })); setSheet(null); setToast("A new light has been placed on the path · +5 XP"); }}><label>Goal name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Emergency buffer, trip, new tool…" /></label><div className="edit-grid"><label>Target amount<input required inputMode="decimal" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} /></label><label>Already mapped (declared)<input inputMode="decimal" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} /></label><label>Target date<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}>{state.chambers.map((chamber) => <option key={chamber.id} value={chamber.id}>{chamber.name}</option>)}</select></label><label>Rhythm<select value={priority} onChange={(event) => setPriority(event.target.value as Goal["priority"])}><option value="gentle">Gentle</option><option value="steady">Steady</option><option value="focused">Focused</option></select></label></div><label>Why it matters<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context for future you" /></label><p className="estimate-note">This declared amount is a visual planning note and does not move or verify money. You can link a cleared movement from the goal details later.</p><button className="primary-button full" type="submit"><Target size={18} /> Protect this goal</button></form>;
}

function AddInvestment({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const eligibleAccounts = state.accounts.filter((account) => account.type === "investment" || account.type === "asset");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState<InvestmentPosition["type"]>("fund");
  const [units, setUnits] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [contributions, setContributions] = useState("");
  const [annualReturnAssumption, setAnnualReturnAssumption] = useState("5");
  const [dividendYield, setDividendYield] = useState("");
  const [dividendFrequency, setDividendFrequency] = useState<NonNullable<InvestmentPosition["dividendFrequency"]>>("quarterly");
  const [accountId, setAccountId] = useState(eligibleAccounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(units) || !Number(unitPrice)) return; updateState((previous) => { const position: InvestmentPosition = { id: crypto.randomUUID(), accountId, name, ticker: EXPERIMENTAL_MARKET_DATA ? ticker.trim().toUpperCase() || undefined : undefined, type, units: Number(units), unitPrice: Number(unitPrice), marketPrice: Number(unitPrice), quoteSource: "manual", contributions: Number(contributions) || Number(units) * Number(unitPrice), annualReturnAssumption: Number(annualReturnAssumption) || 0, dividendYield: Number(dividendYield) || undefined, dividendFrequency, note, updatedAt: new Date().toISOString() }; return syncInvestmentAccounts(previous, [...previous.investments, position]); }); setSheet(null); setToast("Position and linked account mapped"); }}><label>Position name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Broad-market fund" /></label><div className="edit-grid">{EXPERIMENTAL_MARKET_DATA && <label>Market symbol<input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder="Optional · e.g. VGS.AX" autoCapitalize="characters" /></label>}<label>Type<select value={type} onChange={(event) => setType(event.target.value as InvestmentPosition["type"])}><option value="fund">Fund</option><option value="shares">Shares</option><option value="retirement">Retirement</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label>Linked account<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{eligibleAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label>Units<input required inputMode="decimal" value={units} onChange={(event) => setUnits(event.target.value)} /></label><label>Unit price<input required inputMode="decimal" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} /></label><label>Total contributed<input inputMode="decimal" value={contributions} onChange={(event) => setContributions(event.target.value)} /></label><label>Annual assumption %<input inputMode="decimal" value={annualReturnAssumption} onChange={(event) => setAnnualReturnAssumption(event.target.value)} /></label><label>Entered dividend yield %<input inputMode="decimal" value={dividendYield} onChange={(event) => setDividendYield(event.target.value)} /></label><label>Dividend cadence<select value={dividendFrequency} onChange={(event) => setDividendFrequency(event.target.value as typeof dividendFrequency)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="half-yearly">Half-yearly</option><option value="annual">Annual</option><option value="irregular">Irregular</option></select></label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><p className="estimate-note">Saving recalculates the linked investment account from its mapped positions. Entered yield is used only for Idle Vault estimates.</p>{!eligibleAccounts.length && <p className="warning-copy">Add an investment or asset account first.</p>}<button disabled={!eligibleAccounts.length} className="primary-button full" type="submit"><Plus size={18} /> Add and reconcile position</button></form>;
}

function AddTransaction({ state, preset, updateState, setSheet, setToast }: { state: DragonState; preset?: Partial<Transaction>; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [merchant, setMerchant] = useState(preset?.merchant ?? "");
  const [amount, setAmount] = useState(preset?.amount?.toString() ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(preset?.category ?? state.chambers[0]?.name ?? "The Hearth");
  const [direction, setDirection] = useState<"expense" | "income">(preset?.direction ?? "expense");
  const [accountId, setAccountId] = useState(preset?.accountId ?? state.accounts[0]?.id ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState(preset?.transferToAccountId ?? state.accounts.find((account) => account.id !== (preset?.accountId ?? state.accounts[0]?.id))?.id ?? "");
  const [note, setNote] = useState(preset?.note ?? "");
  const [status, setStatus] = useState<"cleared" | "pending">(preset?.status ?? "cleared");
  const [recurringSeriesId, setRecurringSeriesId] = useState("");
  const [unusual, setUnusual] = useState(false);
  const [transfer, setTransfer] = useState(Boolean(preset?.transfer));
  const submit = () => {
    const numericAmount = Number(amount);
    if (!merchant || !numericAmount || (transfer && (!transferToAccountId || transferToAccountId === accountId))) return;
    const transaction: Transaction = { id: crypto.randomUUID(), accountId, transferToAccountId: transfer ? transferToAccountId : undefined, date: new Date(`${date}T12:00:00`).toISOString(), merchant, amount: numericAmount, direction, category, recurringSeriesId: recurringSeriesId || undefined, note, status, unusual, transfer, createdManually: true };
    updateState((previous) => createTransaction(previous, transaction));
    setSheet(null);
    setToast(transfer ? "Transfer recorded across both accounts" : "Treasure movement added and reconciled");
  };
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); submit(); }}><label>Merchant or source<input required value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="e.g. Moon Market" /></label><div className="edit-grid"><label>Amount<input required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>{!transfer && <label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="expense">Expense</option><option value="income">Income</option></select></label>}<label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="cleared">Cleared</option><option value="pending">Pending</option></select></label><label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Uncategorised</option><option>Income</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>{transfer ? "From account" : "Account"}<select value={accountId} onChange={(event) => { setAccountId(event.target.value); if (event.target.value === transferToAccountId) setTransferToAccountId(state.accounts.find((item) => item.id !== event.target.value)?.id ?? ""); }}>{state.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{transfer && <label>To account<select required value={transferToAccountId} onChange={(event) => setTransferToAccountId(event.target.value)}>{state.accounts.filter((item) => item.id !== accountId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<label>Recurring claimant<select value={recurringSeriesId} onChange={(event) => setRecurringSeriesId(event.target.value)}><option value="">Not recurring</option>{state.subscriptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={transfer} disabled={state.accounts.length < 2} onChange={(event) => setTransfer(event.target.checked)} /> Transfer between my accounts</label><label className="check-label"><input type="checkbox" checked={unusual} onChange={(event) => setUnusual(event.target.checked)} /> Mark unusual</label></div>{transfer && <p className="estimate-note">A cleared transfer debits the source and credits the destination. It never counts as income or spending.</p>}<label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><button className="primary-button full" type="submit"><Plus size={18} /> {transfer ? "Record transfer" : "Add transaction"}</button></form>;
}

function AddSubscription({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Subscription["cadence"]>("monthly");
  const [nextCharge, setNextCharge] = useState(dateAfterDays(30));
  const [trackingMode, setTrackingMode] = useState<Subscription["trackingMode"]>("every-use");
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? "");
  const [reminderDays, setReminderDays] = useState(3);
  const [cancellationNotes, setCancellationNotes] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(amount)) return; const numericAmount = Number(amount); updateState((previous) => ({ ...previous, subscriptions: [...previous.subscriptions, { id: crypto.randomUUID(), name, amount: numericAmount, cadence, nextCharge: new Date(`${nextCharge}T12:00:00`).toISOString(), categoryId: "tribute", accountId, usageCount: 0, usageEvents: [], lastUsed: null, priceHistory: [{ amount: numericAmount, changedAt: new Date().toISOString() }], trackingMode, valueRating: "Not rated", cancellationNotes, reminderDays, reminderEnabled: false, usageQuestDays: 30, questEnabled: true, color: "#5b55d6", glyph: name.slice(0, 1).toUpperCase() }] })); setSheet(null); setToast("Claimant added"); }}><label>Claimant name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Amount<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Cadence<select value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label><label>Next charge<input type="date" value={nextCharge} onChange={(event) => setNextCharge(event.target.value)} /></label><label>Payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label>Usage tracking<select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as typeof trackingMode)}><option value="every-use">Every use</option><option value="weekly">Weekly check</option><option value="monthly">Monthly review</option><option value="off">Do not track</option></select></label><label>Reminder before<select value={reminderDays} onChange={(event) => setReminderDays(Number(event.target.value))}><option value="1">1 day</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label></div><label>Cancellation notes<textarea value={cancellationNotes} onChange={(event) => setCancellationNotes(event.target.value)} placeholder="Optional instructions" /></label><button className="primary-button full" type="submit"><Plus size={18} /> Add claimant</button></form>;
}

function AddWish({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("3");
  const [category, setCategory] = useState("Workshop");
  const [desiredDate, setDesiredDate] = useState(dateAfterDays(14));
  const [fundingSource, setFundingSource] = useState("Free Gold");
  const [reason, setReason] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(price)) return; const wishId = crypto.randomUUID(); const endsAt = new Date(Date.now() + Number(days) * 86_400_000); updateState((previous) => ({ ...previous, wishes: [...previous.wishes, { id: wishId, name, price: Number(price), restDays: Number(days), endsAt: endsAt.toISOString(), category, desiredDate: new Date(`${desiredDate}T12:00:00`).toISOString(), fundingSource, reason: reason || "A considered future purchase.", status: "resting" }] })); if (state.profile.notificationsEnabled && state.profile.notificationPreferences.wishes) scheduleWishReminder({ id: wishId, name, at: endsAt }).catch(() => undefined); setSheet(null); setToast("Wish placed in Dragon's Rest"); }}><label>Wished-for item<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Price<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Workshop</option><option>The Roost</option><option>The Hearth</option><option>Wish Vault</option></select></label><label>Desired date<input type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} /></label><label>Funding source<select value={fundingSource} onChange={(event) => setFundingSource(event.target.value)}><option>Free Gold</option><option>Wish Vault</option><option>Save over time</option><option>Credit</option></select></label><label>Rest period<select value={days} onChange={(event) => setDays(event.target.value)}><option value="1">One night</option><option value="3">Three days</option><option value="7">One week</option><option value="14">Until payday</option></select></label></div><label>Why do you want it?<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional context for future you" /></label><button className="primary-button full" type="submit"><Star size={18} /> Begin the rest</button></form>;
}

function AddAccount({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [balance, setBalance] = useState("");
  const [apy, setApy] = useState("");
  const [compounding, setCompounding] = useState<NonNullable<DragonState["accounts"][number]["compounding"]>>("monthly");
  const [type, setType] = useState<DragonState["accounts"][number]["type"]>("savings");
  const [chamberId, setChamberId] = useState("vault");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name) return; const numericBalance = Number(balance) || 0; const hoardAmount = type === "credit" || type === "loan" ? 0 : Math.max(0, numericBalance); const id = crypto.randomUUID(); const capturedAt = new Date().toISOString(); updateState((previous) => ({ ...previous, accounts: [...previous.accounts, { id, name, institutionName, type, balance: numericBalance, availableBalance: type === "transaction" || type === "cash" ? numericBalance : undefined, apy: Number(apy) || undefined, compounding, includedInHoard: true, chamberId, icon: type === "investment" ? "sprout" : type === "credit" ? "card" : "vault", color: type === "investment" ? "#66c79a" : "#5b55d6", archived: false, lastConfirmedBalance: numericBalance, lastConfirmedAt: capturedAt, reconciliationStatus: "approximate" as const, balanceSnapshots: [{ id: crypto.randomUUID(), accountId: id, balance: numericBalance, capturedAt, source: "manual" as const, confirmed: true }] }], chambers: previous.chambers.map((chamber) => chamber.id === chamberId ? { ...chamber, amount: chamber.amount + hoardAmount } : chamber) })); setSheet(null); setToast("Account added with a dated balance snapshot"); }}><label>Account name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Institution<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="Optional" /></label><div className="edit-grid"><label>Current balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="cash">Cash</option><option value="transaction">Transaction</option><option value="savings">Savings</option><option value="credit">Credit</option><option value="loan">Loan</option><option value="investment">Investment</option><option value="asset">Asset</option></select></label><label>Deposit APY %<input inputMode="decimal" value={apy} onChange={(event) => setApy(event.target.value)} placeholder="Optional" /></label><label>Compounding<select value={compounding} onChange={(event) => setCompounding(event.target.value as typeof compounding)}><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}><option value="hearth">The Hearth</option><option value="vault">Deep Vault</option><option value="workshop">Workshop</option><option value="roost">The Roost</option><option value="sleep">Long Sleep</option><option value="tribute">Tribute Hall</option><option value="wish">Wish Vault</option></select></label></div><p className="estimate-note">APY is used only for Idle Vault estimates until real interest is recorded as a transaction.</p><button className="primary-button full" type="submit"><Plus size={18} /> Add account</button></form>;
}

function AddDebt({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [minimum, setMinimum] = useState("");
  const [nextDue, setNextDue] = useState(dateAfterDays(14));
  const [accountId, setAccountId] = useState(state.accounts.find((account) => account.type === "transaction" || account.type === "cash")?.id ?? "");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); const numericBalance = Number(balance); if (!name || !numericBalance) return; updateState((previous) => ({ ...previous, debts: [...previous.debts, { id: crypto.randomUUID(), name, balance: numericBalance, principal: numericBalance, apr: Number(apr) || 0, minimum: Number(minimum) || 0, nextDue: new Date(`${nextDue}T12:00:00`).toISOString(), progress: 0, strategyOrder: previous.debts.length + 1, targetExtraPayment: 0, accountId: accountId || undefined, icon: "card" }] })); setSheet(null); setToast("New claim mapped. Past victories still count."); }}><label>Debt name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Current balance<input required inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>APR %<input inputMode="decimal" value={apr} onChange={(event) => setApr(event.target.value)} /></label><label>Minimum payment<input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label>Next due<input type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} /></label><label>Default payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Choose each time</option>{state.accounts.filter((account) => !account.archived).map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label></div><button className="primary-button full" type="submit"><Plus size={18} /> Map this claim</button></form>;
}

function Reorganise({ state, updateState, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= state.chambers.length) return;
    updateState((previous) => { const next = [...previous.chambers]; [next[destination], next[index]] = [next[index], next[destination]]; return { ...previous, chambers: next.map((chamber, sortOrder) => ({ ...chamber, sortOrder })) }; });
    setToast("Chamber order saved");
  };
  return <div className="reorganise-list">{state.chambers.map((chamber, index) => <div key={chamber.id}><Menu size={18} /><span><strong>{index + 1}. {chamber.name}</strong><small>{chamber.practicalName}</small></span><span className="reorder-actions"><button type="button" disabled={!index} aria-label={`Move ${chamber.name} up`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === state.chambers.length - 1} aria-label={`Move ${chamber.name} down`} onClick={() => move(index, 1)}>↓</button></span></div>)}</div>;
}

function SetupTrail({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const tasks = [
    { title: "Map one account", detail: "A balance can be approximate and edited later.", done: state.accounts.length > 0, icon: Landmark, action: () => setSheet({ type: "add-account", title: "Add an account" }) },
    { title: "Record one movement", detail: "Income or spending helps wake the Scrying Pool.", done: state.transactions.length > 0, icon: Coins, action: () => state.accounts.length ? setSheet({ type: "add-transaction", title: "Add treasure movement" }) : setSheet({ type: "add-account", title: "Add an account first" }) },
    { title: "Protect one goal", detail: "Choose a milestone—small, flexible, and fully yours.", done: state.goals.length > 0, icon: Target, action: () => navigate("goals") },
    { title: "Name a claimant", detail: "Optional: map one subscription or recurring cost.", done: state.subscriptions.length > 0, icon: ScrollText, action: () => state.accounts.length ? setSheet({ type: "add-subscription", title: "Add a claimant" }) : setSheet({ type: "add-account", title: "Add an account first" }) },
  ];
  const completed = tasks.filter((task) => task.done).length;
  return <section className="setup-trail"><div className="setup-heading"><span><Sparkles size={18} /></span><div><small>Chapter 2 · Open the chambers</small><strong>Your first gentle path</strong></div><b>{completed}/{tasks.length}</b></div><i className="setup-progress"><b style={{ width: `${completed / tasks.length * 100}%` }} /></i><div className="setup-steps">{tasks.map((task, index) => { const Icon = task.icon; return <button type="button" key={task.title} className={task.done ? "done" : ""} onClick={task.action}><span>{task.done ? <Check size={17} /> : <Icon size={17} />}</span><div><small>Step {index + 1}</small><strong>{task.title}</strong><p>{task.done ? "Mapped—this can still be changed." : task.detail}</p></div><ChevronRight size={17} /></button>; })}</div></section>;
}

function Tutorial({ state, firstRun, step, setStep, finish }: { state: DragonState; firstRun: boolean; step: number; setStep: (step: number) => void; finish: (choices: OnboardingChoices) => void }) {
  const [choices, setChoices] = useState<OnboardingChoices>({
    dataMode: state.profile.dataMode,
    displayName: state.profile.displayName,
    dragonName: state.profile.dragonName,
    dragonColor: state.profile.selectedDragonColor,
    lairTheme: state.profile.selectedLairTheme,
    avatarId: state.journey.selectedAvatarId,
    journeyEnabled: state.journey.enabled,
    cadence: state.journey.cadence,
  });
  const safeStep = Math.min(step, 7);
  const selectedAvatar = JOURNEY_AVATARS.find((avatar) => avatar.id === choices.avatarId) ?? JOURNEY_AVATARS[0];
  const chapterLabels = ["Chapter 1 · The Awakening", "Chapter 2 · Count the Treasure", "Chapter 3 · Open the Chambers", "Chapter 4 · The First Claimant", "Chapter 5 · Wake the Scrying Pool", "Chapter 6 · The Sleeping Wish", "Chapter 7 · The Chain in the Deep", "Chapter 8 · The First Relic"];
  const chapterTitles = ["A guardian stirs", "Name what matters", "Shape the sky-vault", "Choose what may return", "A keeper reads the path", "Time protects a decision", "A chain is only a map", "The first victory is permanent"];
  const next = () => safeStep === 7 ? finish(choices) : setStep(safeStep + 1);
  return <div className="tutorial-backdrop"><section className={`tutorial-card onboarding-step-${safeStep}`} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <button className="skip" type="button" onClick={() => finish(choices)}>{firstRun ? "Use these defaults" : "Close replay"}</button>
    <div className={`onboarding-stage tutorial-${safeStep}`}><span className="onboarding-dragon" aria-hidden="true" />{safeStep >= 4 && <span className="onboarding-avatar" style={{ "--onboarding-avatar": `url("${selectedAvatar.asset}")` } as React.CSSProperties} aria-hidden="true" />}<div><small>{chapterLabels[safeStep]}</small><strong>{chapterTitles[safeStep]}</strong></div></div>
    <div className="onboarding-copy">
      {safeStep === 0 && <><h2 id="tutorial-title">Your hoard can be understood.</h2><p>You inherit a sleeping sky-vault and awaken a young dragon. It reflects stewardship and awareness—never the size of your balance.</p>{firstRun && <div className="mode-choice"><button type="button" className={choices.dataMode === "demo" ? "selected" : ""} onClick={() => setChoices((current) => ({ ...current, dataMode: "demo" }))}><Sparkles size={22} /><span><strong>Explore vivid demo</strong><small>See every chamber with fictional data. Replace it anytime.</small></span><Check size={18} /></button><button type="button" className={choices.dataMode === "personal" ? "selected" : ""} onClick={() => setChoices((current) => ({ ...current, dataMode: "personal" }))}><ShieldCheck size={22} /><span><strong>Start private & empty</strong><small>Add only what helps. Nothing is connected automatically.</small></span><Check size={18} /></button></div>}</>}
      {safeStep === 1 && <><h2 id="tutorial-title">The names in your story</h2><p>Use a name, nickname, title, or anything that makes this feel comfortable.</p><div className="onboarding-fields"><label>Keeper name<input value={choices.displayName} onChange={(event) => setChoices((current) => ({ ...current, displayName: event.target.value }))} maxLength={28} /></label><label>Dragon name<input value={choices.dragonName} onChange={(event) => setChoices((current) => ({ ...current, dragonName: event.target.value }))} maxLength={24} /></label></div><aside><Heart size={18} /> Your dragon never becomes sick, leaves, or loses trust because money is tight.</aside></>}
      {safeStep === 2 && <><h2 id="tutorial-title">Colour the next chapter</h2><p>These choices are cosmetic and can be changed later.</p><span className="choice-label">Guardian colour</span><div className="color-choice">{["Emerald", "Sapphire", "Amethyst", "Ember"].map((color) => <button type="button" key={color} className={choices.dragonColor === color ? `selected color-${color.toLowerCase()}` : `color-${color.toLowerCase()}`} onClick={() => setChoices((current) => ({ ...current, dragonColor: color }))}><i />{color}</button>)}</div><span className="choice-label">Lair atmosphere</span><div className="theme-choice">{["Sky Vault", "Moon Garden", "Ember Library"].map((theme) => <button type="button" key={theme} className={choices.lairTheme === theme ? "selected" : ""} onClick={() => setChoices((current) => ({ ...current, lairTheme: theme }))}><CloudSun size={17} />{theme}</button>)}</div></>}
      {safeStep === 3 && <><h2 id="tutorial-title">A claimant is only a recurring cost.</h2><p>Subscriptions and bills may be mapped with a renewal date, price history, usage notes, and an optional reminder. Keeping, pausing, or removing one is always your choice.</p><div className="privacy-seals"><div><CalendarDays size={20} /><span><strong>See arrivals</strong><small>Know what is expected and when</small></span></div><div><Eye size={20} /><span><strong>Track value</strong><small>Usage is optional and editable</small></span></div><div><Bell size={20} /><span><strong>Stay quiet</strong><small>No reminder without permission</small></span></div></div></>}
      {safeStep === 4 && <><h2 id="tutorial-title">Who travels the Living Atlas?</h2><p>The Scrying Pool reveals patterns, while optional Story Mode turns recent financial direction into a hopeful route. Neither judges the size of the hoard.</p><div className="onboarding-roster">{JOURNEY_AVATARS.map((avatar) => <button type="button" key={avatar.id} className={choices.avatarId === avatar.id ? "selected" : ""} onClick={() => setChoices((current) => ({ ...current, avatarId: avatar.id }))}><span style={{ "--avatar-image": `url("${avatar.asset}")` } as React.CSSProperties} /><small>{avatar.name.split(" ")[0]}</small></button>)}</div><div className="journey-onboarding-controls"><label className="check-label"><input type="checkbox" checked={choices.journeyEnabled} onChange={(event) => setChoices((current) => ({ ...current, journeyEnabled: event.target.checked }))} /> Enable optional Journey chapters</label><label>Story rhythm<select value={choices.cadence} onChange={(event) => setChoices((current) => ({ ...current, cadence: event.target.value as OnboardingChoices["cadence"] }))}><option value="daily">Daily check-in</option><option value="weekly">Weekly reflection</option><option value="pay-cycle">Pay-cycle reflection</option></select></label></div></>}
      {safeStep === 5 && <><h2 id="tutorial-title">A wish may rest before it becomes a purchase.</h2><p>Dragon&apos;s Rest shows the effect of a future purchase without forbidding it. At the end, record the purchase, create a goal, rest longer, or release it.</p><aside><Star size={18} /> The reward is for making a considered choice—not for choosing “no.”</aside></>}
      {safeStep === 6 && <><h2 id="tutorial-title">Debt is a claim, not a moral score.</h2><p>Linked payments reconcile both the payment account and the debt balance. If debt rises, titles, relics, pet bonds, and earlier victories remain yours.</p><div className="privacy-seals"><div><LockKeyhole size={20} /><span><strong>See the claim</strong><small>Balance, APR, minimum, and date</small></span></div><div><Route size={20} /><span><strong>Compare routes</strong><small>Snowball, avalanche, or your order</small></span></div><div><Heart size={20} /><span><strong>Keep hope</strong><small>One safe step is enough</small></span></div></div></>}
      {safeStep === 7 && <><h2 id="tutorial-title">The first relic belongs to you.</h2><p>Release mode stores records in this app&apos;s private on-device vault. The first permanent reward marks that you returned and made the map visible—not how much money you have.</p><div className="privacy-seals"><div><ShieldCheck size={20} /><span><strong>On device</strong><small>Balances, goals, debts, and story progress</small></span></div><div><Download size={20} /><span><strong>Portable</strong><small>Export or import JSON when you choose</small></span></div><div><Crown size={20} /><span><strong>Permanent</strong><small>Relics and progress never regress</small></span></div></div><aside><Heart size={18} /> If the path slides backward, the story adapts with hope and one actionable next step. It never gives up on you.</aside></>}
    </div>
    <div className="story-dots" aria-label={`Chapter ${safeStep + 1} of 8`}>{Array.from({ length: 8 }, (_, index) => <i key={index} className={index === safeStep ? "active" : ""} />)}</div>
    <div className="onboarding-actions">{safeStep > 0 && <button className="secondary-button" type="button" onClick={() => setStep(safeStep - 1)}><ArrowLeft size={17} /> Back</button>}<button className="primary-button" type="button" onClick={next}>{safeStep === 7 ? (choices.dataMode === "personal" && firstRun ? "Open my empty vault" : "Enter the Lair") : "Continue"} <ChevronRight size={18} /></button></div>
  </section></div>;
}
