"use client";

import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
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
  Plus,
  RotateCcw,
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
  Volume2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  averageApr,
  estimateDebtPlan,
  getActiveQuests,
  getCategoryBreakdown,
  getHoardSummary,
  getMonthlyFlow,
  getWorthSummary,
  hibernationModes,
  hibernationMonths,
  monthlyTribute,
  projectScenario,
  searchTransactions,
  totalDebt,
} from "./calculations";
import { APP_NAME, APP_TAGLINE, formatGold, type MainTab } from "./constants";
import { createSeedState, normalizeState, type DragonState, type Quest, type Subscription, type WorthRating } from "./data";
import { playFeedback, scheduleClaimantReminder } from "./native";
import { clearState, loadState, saveState } from "./storage";

type Screen = "lair" | "hoard" | "quests" | "analytics" | "tribute" | "flight" | "wish" | "dragon" | "debt" | "legacy" | "settings";
type Sheet = { type: string; id?: string; title?: string; body?: string } | null;

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
  dragon: "lair",
  legacy: "lair",
  hoard: "hoard",
  quests: "quests",
  wish: "quests",
  analytics: "scrying",
  flight: "scrying",
  tribute: "treasury",
  debt: "treasury",
  settings: "treasury",
};

const navItems: Array<{ id: MainTab; label: string; icon: LucideIcon }> = [
  { id: "lair", label: "Lair", icon: Home },
  { id: "hoard", label: "Hoard", icon: Landmark },
  { id: "quests", label: "Quests", icon: ListChecks },
  { id: "scrying", label: "Scrying", icon: Telescope },
  { id: "treasury", label: "Treasury", icon: WalletCards },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(value));

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
  const scrollPositions = useRef<Record<MainTab, number>>({ lair: 0, hoard: 0, quests: 0, scrying: 0, treasury: 0 });

  useEffect(() => {
    loadState()
      .then((saved) => {
        if (saved) setState(saved);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

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

  const currentTab = screenTab[screen];
  const summary = useMemo(() => getHoardSummary(state), [state]);

  const navigate = (nextScreen: Screen) => {
    if (mainRef.current) scrollPositions.current[currentTab] = mainRef.current.scrollTop;
    const nextTab = screenTab[nextScreen];
    setScreen(nextScreen);
    setSheet(null);
    window.requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = scrollPositions.current[nextTab] ?? 0;
    });
  };

  const updateState = (updater: (previous: DragonState) => DragonState) => setState((previous) => updater(previous));

  const completeQuest = (quest: Quest) => {
    if (quest.completed) return;
    updateState((previous) => ({
      ...previous,
      chambers: quest.id === "q-vault" ? previous.chambers.map((item) => item.id === "vault" ? { ...item, amount: item.amount + 100 } : item) : previous.chambers,
      accounts: quest.id === "q-vault" ? previous.accounts.map((item) => item.type === "transaction" ? { ...item, balance: item.balance - 100, availableBalance: item.availableBalance === undefined ? undefined : item.availableBalance - 100 } : item) : previous.accounts,
      quests: previous.quests.some((item) => item.id === quest.id)
        ? previous.quests.map((item) => (item.id === quest.id ? { ...item, completed: true, completedAt: new Date().toISOString() } : item))
        : [...previous.quests, { ...quest, completed: true, completedAt: new Date().toISOString() }],
      progression: {
        ...previous.progression,
        xp: previous.progression.xp + quest.xp,
        completedQuestCount: previous.progression.completedQuestCount + 1,
      },
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
      progression: { ...previous.progression, xp: previous.progression.xp + 2 },
    }));
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled }).catch(() => undefined);
    setToast(`${subscription.name} use logged · +2 XP`);
  };

  const finishTutorial = () => {
    updateState((previous) => ({ ...previous, profile: { ...previous.profile, tutorialComplete: true } }));
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
      <div className={`mobile-shell theme-${currentTab} ${state.profile.reducedMotion ? "reduce-motion" : ""}`}>
        <main ref={mainRef} className="screen-scroll" id="main-content">
          {screen === "lair" && <LairScreen state={state} summary={summary} navigate={navigate} setSheet={setSheet} />}
          {screen === "hoard" && <HoardScreen state={state} summary={summary} setSheet={setSheet} />}
          {screen === "quests" && <QuestScreen state={state} completeQuest={completeQuest} navigate={navigate} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
          {screen === "analytics" && <AnalyticsScreen state={state} navigate={navigate} setSheet={setSheet} />}
          {screen === "tribute" && <TributeScreen state={state} navigate={navigate} setSheet={setSheet} logUse={logSubscriptionUse} />}
          {screen === "flight" && <FlightScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "wish" && <WishScreen state={state} navigate={navigate} updateState={updateState} summary={summary} setToast={setToast} setSheet={setSheet} />}
          {screen === "dragon" && <DragonScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "debt" && <DebtScreen state={state} navigate={navigate} setSheet={setSheet} updateState={updateState} setToast={setToast} />}
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
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {sheet && (
          <Modal sheet={sheet} state={state} updateState={updateState} setSheet={setSheet} logUse={logSubscriptionUse} setToast={setToast} navigate={navigate} />
        )}

        {!state.profile.tutorialComplete && (
          <Tutorial step={tutorialStep} setStep={setTutorialStep} finish={finishTutorial} />
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

function LairScreen({ state, summary, navigate, setSheet }: { state: DragonState; summary: ReturnType<typeof getHoardSummary>; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const unusualCount = state.transactions.filter((item) => item.unusual).length;
  const safetyTitle = unusualCount ? "The dragon is watchful." : "The hoard is safe.";
  const safetyDetail = unusualCount ? `${unusualCount} movement${unusualCount === 1 ? "" : "s"} deserves a calm review.` : `${state.profile.dragonName} rests, but keeps one eye open.`;
  const metrics = [
    { label: "Available", value: summary.available, icon: Coins, key: "available" },
    { label: "Committed", value: summary.committed, icon: ScrollText, key: "committed" },
    { label: "Guarded", value: summary.guarded, icon: ShieldCheck, key: "guarded" },
    { label: "Invested", value: summary.invested, icon: Gem, key: "invested" },
  ];
  return (
    <section className="screen screen-lair">
      <ScreenHeader
        icon={Home}
        title="The Lair"
        subtitle={APP_TAGLINE}
        action={<button type="button" className="level-badge" onClick={() => navigate("legacy")} aria-label="Open Dragon's Legacy"><Crown size={16} /> LV {state.progression.level}</button>}
      />
      <button className="safety-banner" type="button" onClick={() => navigate("dragon")}> 
        <ShieldCheck size={24} />
        <span><strong>{safetyTitle}</strong><small>{safetyDetail}</small></span>
        {unusualCount ? <Eye className="banner-check" size={22} /> : <Check className="banner-check" size={22} />}
      </button>
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
      <SectionTitle title="Upcoming events" action="View all" onAction={() => setSheet({ type: "events", title: "Upcoming events" })} />
      <div className="event-list">
        <button type="button" onClick={() => setSheet({ type: "event", title: "Streamkeep returns", body: "A $15.49 monthly tribute arrives in 2 days. It is covered by Available Gold." })}>
          <span className="service-mini red">S</span><span><strong>Streamkeep</strong><small>Claimant returns</small></span><em>in 2 days</em><b>$15.49</b>
        </button>
        <button type="button" onClick={() => setSheet({ type: "event", title: "Lair Energy", body: "The estimated $87.12 electricity bill arrives in 5 days. No action is required." })}>
          <span className="service-mini green"><Zap size={15} /></span><span><strong>Lair Energy</strong><small>Essential bill</small></span><em>in 5 days</em><b>$87.12</b>
        </button>
        <button type="button" onClick={() => setSheet({ type: "event", title: "Skyforge payday", body: "Expected income of approximately $3,240 lands in 8 days." })}>
          <span className="service-mini blue"><Coins size={15} /></span><span><strong>Skyforge payday</strong><small>Expected income</small></span><em>in 8 days</em><b>+$3,240</b>
        </button>
      </div>
      <button className="lore-card" type="button" onClick={() => setSheet({ type: "lore", title: "Gold with a job", body: "Committed Gold is money still in your account that already has a job—like a bill, debt minimum, or planned obligation before payday." })}>
        <BookOpen size={25} /><span><strong>Lore: Gold with a job</strong><small>Why Available and Free Gold are different</small></span><ChevronRight size={18} />
      </button>
    </section>
  );
}

function HoardScreen({ state, summary, setSheet }: { state: DragonState; summary: ReturnType<typeof getHoardSummary>; setSheet: (sheet: Sheet) => void }) {
  const [view, setView] = useState<"Chambers" | "Accounts" | "Transactions">("Chambers");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All chambers");
  const [accountFilter, setAccountFilter] = useState("All accounts");
  const [transactionFilter, setTransactionFilter] = useState("All");
  const filteredTransactions = searchTransactions(state.transactions, query).filter((transaction) => {
    const categoryMatches = categoryFilter === "All chambers" || transaction.category === categoryFilter;
    const accountMatches = accountFilter === "All accounts" || transaction.accountId === accountFilter;
    const typeMatches = transactionFilter === "All"
      || (transactionFilter === "Recurring" && Boolean(transaction.recurringSeriesId))
      || (transactionFilter === "Unusual" && Boolean(transaction.unusual))
      || (transactionFilter === "Pending" && transaction.status === "pending");
    return categoryMatches && accountMatches && typeMatches;
  });
  return (
    <section className="screen screen-hoard">
      <ScreenHeader icon={Landmark} title="Hoard" subtitle="Treasury chambers" action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })} aria-label="Add transaction"><Plus size={21} /></button>} />
      <section className="hoard-total">
        <div className="crystal-cluster"><Gem size={30} /><Coins size={31} /><Gem size={22} /></div>
        <span>Total hoard value</span><strong>{formatGold(summary.total)}</strong><small>Across {state.accounts.length} accounts</small>
      </section>
      <Segmented options={["Chambers", "Accounts", "Transactions"]} value={view} onChange={(value) => setView(value as typeof view)} />
      {view === "Chambers" && (
        <div className="chamber-list">
          {state.chambers.map((chamber) => {
            const Icon = ICONS[chamber.icon] ?? Gem;
            const progress = Math.min(100, Math.round((chamber.amount / chamber.target) * 100));
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
        <div className="cream-list">
          {state.accounts.filter((account) => !account.archived).map((account) => (
            <button key={account.id} type="button" onClick={() => setSheet({ type: "account", id: account.id, title: account.name })}>
              <span className={`round-icon ${account.type}`}><WalletCards size={20} /></span><span><strong>{account.name}</strong><small>{account.type}</small></span><b>{formatGold(account.balance)}</b><ChevronRight size={17} />
            </button>
          ))}
          <button className="add-row" type="button" onClick={() => setSheet({ type: "add-account", title: "Add an account" })}><Plus size={19} /> Add account</button>
        </div>
      )}
      {view === "Transactions" && (
        <div className="transaction-panel">
          <div className="transaction-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movements" aria-label="Search transactions" /></div>
          <div className="transaction-filters">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by chamber"><option>All chambers</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select>
            <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)} aria-label="Filter by account"><option>All accounts</option>{state.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </div>
          <Segmented options={["All", "Recurring", "Unusual", "Pending"]} value={transactionFilter} onChange={setTransactionFilter} compact />
          <button className="primary-button full" type="button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })}><Plus size={18} /> Add transaction</button>
          {filteredTransactions.map((transaction) => (
            <button key={transaction.id} type="button" className="transaction-row" onClick={() => setSheet({ type: "transaction", id: transaction.id, title: transaction.merchant })}>
              <span className={`transaction-glyph ${transaction.unusual ? "unusual" : ""}`}>{transaction.unusual ? "!" : transaction.merchant.slice(0, 1)}</span>
              <span><strong>{transaction.merchant}</strong><small>{formatDate(transaction.date)} · {transaction.category}{transaction.status === "pending" ? " · Pending" : ""}</small></span>
              <b className={transaction.direction}>{transaction.direction === "income" ? "+" : "−"}{formatGold(transaction.amount)}</b>
            </button>
          ))}
          {!filteredTransactions.length && <div className="empty-state"><Search size={28} /><strong>No treasure movements found.</strong><p>Try clearing one of the filters.</p></div>}
        </div>
      )}
      <button className="secondary-button full" type="button" onClick={() => setSheet({ type: "reorganise", title: "Reorganise treasure" })}><Menu size={18} /> Reorganise treasure</button>
    </section>
  );
}

function QuestScreen({ state, completeQuest, navigate, updateState, setToast, setSheet }: { state: DragonState; completeQuest: (quest: Quest) => void; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
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
        <span><Star size={24} /><i /></span><div><strong>Dragon&apos;s Rest</strong><small>Your sleeping wish is ready in 2 days</small></div><ChevronRight size={20} />
      </button>
      <div className="quest-list">
        {visible.map((quest) => {
          const Icon = ICONS[quest.icon] ?? Sword;
          return (
            <article className="quest-card" key={quest.id}>
              <span className={`quest-illustration category-${quest.category.toLowerCase()}`}><Icon size={31} /></span>
              <div className="quest-copy"><strong>{quest.title}</strong><p>{quest.description}</p><small><Star size={13} /> {quest.estimatedMinutes} min · {quest.xp} XP {quest.progress && <b>{quest.progress}</b>}</small></div>
              <div className="quest-actions"><button type="button" className="quest-go" onClick={() => { const relatedTransaction = state.transactions.find((item) => item.id === quest.relatedEntityId); const relatedSubscription = state.subscriptions.find((item) => item.id === quest.relatedEntityId); if (relatedTransaction) setSheet({ type: "transaction", id: relatedTransaction.id, title: relatedTransaction.merchant }); else if (relatedSubscription) setSheet({ type: "subscription", id: relatedSubscription.id, title: relatedSubscription.name }); else completeQuest(quest); }}>GO!</button><button type="button" aria-label={`More options for ${quest.title}`} onClick={() => setSheet({ type: "quest", id: quest.id, title: quest.title, body: quest.reason })}><MoreHorizontal size={17} /></button></div>
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
  return (
    <section className="screen screen-scrying">
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
      {view === "Trends" && <TrendPanel />}
    </section>
  );
}

function TributeScreen({ state, navigate, setSheet, logUse }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void; logUse: (subscription: Subscription, quantity?: number) => void }) {
  const tribute = monthlyTribute(state);
  const renewalsSoon = state.subscriptions.filter((item) => daysUntil(item.nextCharge) <= 7).length;
  const changed = state.subscriptions.find((item) => item.priceChange);
  return (
    <section className="screen screen-treasury screen-tribute">
      <ScreenHeader icon={ScrollText} title="Tribute Hall" subtitle="Subscriptions & recurring costs" action={<button className="icon-button" type="button" onClick={() => setSheet({ type: "add-subscription", title: "Add a claimant" })} aria-label="Add subscription"><Plus size={21} /></button>} />
      <TreasurySwitcher current="tribute" navigate={navigate} />
      <section className="tribute-total"><Gem size={24} /><span>Total monthly tribute<strong>{formatGold(tribute)}</strong><small>{formatGold(tribute * 12, 0)} yearly · {state.subscriptions.length} active · {renewalsSoon} soon</small></span><Coins size={32} /></section>
      <div className="claimant-list">
        {state.subscriptions.map((subscription) => (
          <button key={subscription.id} type="button" className="claimant-card" onClick={() => setSheet({ type: "subscription", id: subscription.id, title: subscription.name })}>
            <span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span>
            <span><strong>{subscription.name}</strong><small>{formatGold(subscription.amount)} / {subscription.cadence === "monthly" ? "month" : "year"}</small>{subscription.lastUsed && <em>Last logged {daysSince(subscription.lastUsed) === 0 ? "today" : `${dayLabel(daysSince(subscription.lastUsed))} ago`}</em>}</span>
            <span className="claimant-arrival">in {dayLabel(daysUntil(subscription.nextCharge))}{subscription.priceChange && <b>↑ +{formatGold(subscription.priceChange)}</b>}</span><ChevronRight size={17} />
          </button>
        ))}
      </div>
      {changed && <section className="tribute-alert"><div><Bell size={20} /><span><strong>One claimant increased tribute.</strong><small>{changed.name} rose by {formatGold(changed.priceChange ?? 0)} this month.</small></span></div><button type="button" onClick={() => setSheet({ type: "subscription", id: changed.id, title: changed.name })}>Review now</button></section>}
      <section className="quick-log"><SectionTitle title="Quick usage log" /><div>{state.subscriptions.slice(0, 3).map((subscription) => <button key={subscription.id} type="button" onClick={() => logUse(subscription)}><span style={{ background: subscription.color }}>{subscription.glyph}</span><b>{subscription.name}</b><small>Used today</small></button>)}</div></section>
    </section>
  );
}

function FlightScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const scenario = state.projections.activeScenario;
  const rangeMonths = state.projections.rangeMonths;
  const settings = state.projections.scenarios[scenario] ?? state.projections.scenarios["Current Flight"];
  const projection = projectScenario(state, settings, rangeMonths);
  const chartMin = Math.min(...projection.points) - 1000;
  const chartMax = Math.max(...projection.points) + 1000;
  const chartPath = projection.points.map((point, index) => {
    const x = (index / Math.max(1, projection.points.length - 1)) * 300;
    const y = 156 - ((point - chartMin) / Math.max(1, chartMax - chartMin)) * 132;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const updateScenario = (changes: Partial<typeof settings>) => updateState((previous) => ({
    ...previous,
    projections: { ...previous.projections, scenarios: { ...previous.projections.scenarios, [scenario]: { ...previous.projections.scenarios[scenario], ...changes } } },
  }));
  return (
    <section className="screen screen-flight">
      <ScreenHeader icon={Map} title="Flight Path" subtitle="Chart your dragon's journey" back={() => navigate("analytics")} />
      <Segmented options={["Current Flight", "Cautious", "Treasure Hunt", "Resting"]} value={scenario} onChange={(value) => updateState((previous) => ({ ...previous, projections: { ...previous.projections, activeScenario: value } }))} compact />
      <div className="range-tabs" aria-label="Projection range">{[{ label: "Payday", value: 1 }, { label: "3M", value: 3 }, { label: "6M", value: 6 }, { label: "1Y", value: 12 }].map((item) => <button type="button" key={item.label} className={rangeMonths === item.value ? "active" : ""} onClick={() => updateState((previous) => ({ ...previous, projections: { ...previous.projections, rangeMonths: item.value } }))}>{item.label}</button>)}</div>
      <section className="flight-chart" aria-label={`${scenario} projection from ${formatGold(projection.start, 0)} to a range of ${formatGold(projection.low, 0)} through ${formatGold(projection.high, 0)} over ${rangeMonths} months`}>
        <div className="chart-y"><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span></div>
        <div className="chart-grid"><span /><span /><span /><span /><span /><svg viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden="true"><path className="range" d={`${chartPath} L300 164 L0 164 Z`} /><path className="line active-line" d={chartPath}/><circle cx="300" cy={156 - ((projection.end - chartMin) / Math.max(1, chartMax - chartMin)) * 132} r="5" /></svg></div>
        <div className="chart-x"><span>Now</span><span>{Math.max(1, Math.round(rangeMonths / 3))}M</span><span>{Math.max(1, Math.round(rangeMonths * 2 / 3))}M</span><span>{rangeMonths}M</span></div>
        <span className="chart-result">{formatGold(projection.end, 0)}</span>
      </section>
      <section className="range-note"><Sparkles size={19} /><p>With the assumptions below, your hoard may be between <strong>{formatGold(projection.low, 0)} – {formatGold(projection.high, 0)}</strong>. This is a range, not a promise.</p></section>
      <section className="scenario-editor"><SectionTitle title="Scenario editor" />
        <label>Expected monthly income <b>{formatGold(settings.expectedMonthlyIncome, 0)}</b><input type="range" min="0" max="7000" step="50" value={settings.expectedMonthlyIncome} onChange={(event) => updateScenario({ expectedMonthlyIncome: Number(event.target.value) })} /></label>
        <label>Essential spending <b>{formatGold(settings.essentialSpending, 0)}</b><input type="range" min="400" max="3500" step="25" value={settings.essentialSpending} onChange={(event) => updateScenario({ essentialSpending: Number(event.target.value) })} /></label>
        <label>Flexible spending <b>{formatGold(settings.flexibleSpending, 0)}</b><input type="range" min="0" max="2500" step="25" value={settings.flexibleSpending} onChange={(event) => updateScenario({ flexibleSpending: Number(event.target.value) })} /></label>
        <label>Subscription change <b>{settings.subscriptionChange >= 0 ? "+" : ""}{formatGold(settings.subscriptionChange, 0)}</b><input type="range" min="-150" max="150" step="5" value={settings.subscriptionChange} onChange={(event) => updateScenario({ subscriptionChange: Number(event.target.value) })} /></label>
        <label>Extra debt payment <b>{formatGold(settings.debtExtraPayment, 0)}</b><input type="range" min="0" max="600" step="25" value={settings.debtExtraPayment} onChange={(event) => updateScenario({ debtExtraPayment: Number(event.target.value) })} /></label>
        <label>One-off purchase <b>{formatGold(settings.oneOffPurchase, 0)}</b><input type="range" min="0" max="3000" step="50" value={settings.oneOffPurchase} onChange={(event) => updateScenario({ oneOffPurchase: Number(event.target.value) })} /></label>
        <div className="cause-card"><Target size={21} /><p>This path changes the hoard by about <strong>{formatGold(projection.monthlyNet, 0)} per month</strong> before one-off purchases.</p></div>
      </section>
      <button className="primary-button full" type="button" onClick={() => { setToast(`${scenario} saved`); playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined); navigate("analytics"); }}><Check size={18} /> Save this flight</button>
    </section>
  );
}

function WishScreen({ state, navigate, updateState, summary, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; summary: ReturnType<typeof getHoardSummary>; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const wish = state.wishes.find((item) => item.status === "resting") ?? state.wishes[0];
  const [restDays, setRestDays] = useState(wish?.restDays ?? 3);
  if (!wish) return <section className="screen"><ScreenHeader icon={Star} title="Dragon's Rest" back={() => navigate("quests")} /><div className="empty-state"><Star size={40} /><strong>No wishes are resting.</strong><button className="primary-button" type="button" onClick={() => setSheet({ type: "add-wish", title: "Add a wish" })}>Add a wish</button></div></section>;
  const decide = (status: "claimed" | "saved" | "released") => {
    updateState((previous) => ({ ...previous, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, status } : item), progression: { ...previous.progression, xp: previous.progression.xp + 15 } }));
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
    setToast("A considered choice · +15 patience XP");
    navigate("quests");
  };
  const fitsFreeGold = wish.price <= summary.freeGold;
  const hibernationShift = Math.max(1, Math.ceil((wish.price / state.profile.comfortableMonthlyCost) * 30));
  const monthlySurplus = Math.max(1, getMonthlyFlow(state).net || 460);
  const savePaydays = Math.max(1, Math.ceil(wish.price / (monthlySurplus / 2)));
  const relatedRatings = state.transactions.filter((item) => item.category === wish.category && item.worthRating).map((item) => item.worthRating);
  const similarRating = relatedRatings[0] ?? "Not rated";
  const setRest = (days: number) => {
    setRestDays(days);
    updateState((previous) => ({ ...previous, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, restDays: days, endsAt: new Date(Date.now() + days * 86_400_000).toISOString() } : item) }));
  };
  return (
    <section className="screen screen-wish">
      <ScreenHeader icon={Star} title="Dragon's Rest" subtitle="Let time tell if it's worthy" back={() => navigate("quests")} action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-wish", title: "Add another wish" })} aria-label="Add wish"><Plus size={20} /></button>} />
      <section className="wish-frame"><div className="wish-product-art" /><div><strong>{wish.name}</strong><b>{formatGold(wish.price)}</b></div></section>
      <section className="rest-panel"><span>Resting for</span><Segmented options={["1 Night", "3 Days", "1 Week", "Custom"]} value={restDays === 1 ? "1 Night" : restDays === 3 ? "3 Days" : restDays === 7 ? "1 Week" : "Custom"} onChange={(value) => setRest(value === "1 Night" ? 1 : value === "3 Days" ? 3 : value === "1 Week" ? 7 : 14)} compact /><strong><Orbit size={18} /> Ends in {dayLabel(daysUntil(wish.endsAt))}</strong></section>
      <section className="wish-impact"><div className="wish-dragon" /><p>{fitsFreeGold ? "It fits within your Free Gold" : "It is larger than your current Free Gold"} and would shift comfortable hibernation by <strong>{hibernationShift} days</strong>.</p></section>
      <div className="impact-grid"><div><span>Free Gold after</span><strong>{formatGold(summary.freeGold - wish.price)}</strong></div><div><span>Hibernation shift</span><strong>− {hibernationShift} days</strong></div><div><span>Save time</span><strong>{savePaydays} payday{savePaydays === 1 ? "" : "s"}</strong></div><div><span>Similar worth rating</span><strong>{similarRating}</strong></div></div>
      <p className="supportive-copy">Buying it is a valid outcome. The reward is for making the choice with the full map in view.</p>
      <div className="wish-actions"><button type="button" className="claim" onClick={() => decide("claimed")}>Claim treasure</button><button type="button" className="rest" onClick={() => { setRest(restDays + 3); setToast("Rest extended by 3 days"); }}>Rest longer</button><button type="button" className="save" onClick={() => decide("saved")}>Save toward it</button><button type="button" className="release" onClick={() => decide("released")}>Release</button></div>
    </section>
  );
}

function DragonScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const colors = ["Emerald", "Sky", "Amethyst", "Ember"];
  const unusualCount = state.transactions.filter((item) => item.unusual).length;
  const priceChanges = state.subscriptions.filter((item) => item.priceChange).length;
  const status = unusualCount > 1 ? "GUARDING" : unusualCount || priceChanges ? "WATCHFUL" : "CONTENT";
  const reasons = [unusualCount ? `${unusualCount} unusual charge${unusualCount === 1 ? "" : "s"} deserves a look` : "No unusual charges are waiting", priceChanges ? `${priceChanges} claimant changed its tribute` : "Recurring tribute is steady", `Free Gold is ${formatGold(getHoardSummary(state).freeGold, 0)}`];
  return (
    <section className="screen screen-dragon">
      <ScreenHeader icon={Eye} title="The Dragon" subtitle="Your dragon reflects your stewardship" back={() => navigate("lair")} />
      <section className="dragon-status-art"><span>{state.profile.dragonName}</span></section>
      <section className="state-panel"><Eye size={30} /><span>Current state<strong>{status}</strong><small>{status === "CONTENT" ? "The mapped path is calm." : "The dragon senses something that deserves attention."}</small></span></section>
      <section className="reason-panel"><h2>Why?</h2><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><button type="button" onClick={() => navigate("quests")}>Open stabilising quest <ChevronRight size={18} /></button></section>
      <blockquote>“The path narrowed, but it did not close. We protect the next seven days first.”</blockquote>
      <section className="cosmetics"><SectionTitle title="Scale colours" /><div>{colors.map((item) => <button key={item} className={state.profile.selectedDragonColor === item ? "selected" : ""} type="button" onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, selectedDragonColor: item } })); setToast(`${item} scales equipped`); }}><span className={item.toLowerCase()} /><small>{item}</small></button>)}</div></section>
      <button className="secondary-button full" type="button" onClick={() => navigate("legacy")}><Crown size={18} /> View permanent legacy</button>
    </section>
  );
}

function DebtScreen({ state, navigate, setSheet, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [strategy, setStrategy] = useState("Smallest first");
  const [extra, setExtra] = useState(50);
  const plan = estimateDebtPlan(state.debts, strategy, extra);
  const victoryDebt = [...state.debts].sort((a, b) => a.balance - b.balance)[0];
  const victoryTarget = victoryDebt ? Math.floor(victoryDebt.balance / 500) * 500 : 0;
  const victoryRemaining = victoryDebt ? Math.max(0, victoryDebt.balance - victoryTarget) : 0;
  const recordPayment = () => {
    if (!victoryDebt) return;
    const amount = Math.min(50, victoryDebt.balance);
    updateState((previous) => ({ ...previous, debts: previous.debts.map((item) => item.id === victoryDebt.id ? { ...item, balance: Math.max(0, item.balance - amount), progress: Math.min(100, Math.round(((item.principal - Math.max(0, item.balance - amount)) / item.principal) * 100)) } : item), progression: { ...previous.progression, xp: previous.progression.xp + 5 } }));
    setToast(`${formatGold(amount, 0)} payment recorded · +5 XP`);
    playFeedback({ sound: state.profile.soundEnabled, haptics: state.profile.hapticsEnabled, kind: "success" }).catch(() => undefined);
  };
  return (
    <section className="screen screen-debt">
      <ScreenHeader icon={LockKeyhole} title="Debt Chamber" subtitle="Understand and break the chains" back={() => navigate("tribute")} action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-debt", title: "Add a claim" })} aria-label="Add debt"><Plus size={20} /></button>} />
      <TreasurySwitcher current="debt" navigate={navigate} />
      <section className="debt-total"><div className="chain-line"><span /><LockKeyhole size={30} /><span /></div><span>Total debt</span><strong>{formatGold(totalDebt(state))}</strong><small>{formatGold(state.debts.reduce((sum, debt) => sum + debt.minimum, 0))} monthly minimum · {averageApr(state).toFixed(1)}% weighted APR</small></section>
      <div className="debt-list">{state.debts.map((debt) => { const Icon = ICONS[debt.icon] ?? CreditCard; return <button key={debt.id} type="button" onClick={() => setSheet({ type: "debt", id: debt.id, title: debt.name })}><span className="debt-icon"><Icon size={21} /></span><span><strong>{debt.name}</strong><small>{debt.apr.toFixed(2)}% APR · min {formatGold(debt.minimum)}</small><i><b style={{ width: `${debt.progress}%` }} /></i></span><b>{formatGold(debt.balance)}</b></button>; })}</div>
      <section className="strategy-panel"><SectionTitle title="Compare strategies" /><label>Payoff order<select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option>Smallest first</option><option>Highest interest first</option><option>Minimum payments</option><option>Custom order</option></select></label><label>Extra each month <b>{formatGold(extra, 0)}</b><input type="range" min="0" max="400" step="25" value={extra} onChange={(event) => setExtra(Number(event.target.value))} /></label><p>{strategy} with {formatGold(extra, 0)} extra estimates <strong>{plan.months} months</strong> to clear all mapped claims, with about {formatGold(plan.interestPaid, 0)} interest.</p></section>
      {victoryDebt && <section className="victory-panel"><span>Next victory · {victoryDebt.name}</span><strong>{victoryRemaining ? `Pay ${formatGold(victoryRemaining, 0)} to cross below ${formatGold(victoryTarget, 0)}.` : "The next chain marker is ready."}</strong><div><i><b style={{ width: `${Math.min(100, 100 - (victoryRemaining / 500) * 100)}%` }} /></i><small>{formatGold(victoryDebt.balance, 0)} remaining</small></div><button className="secondary-button full" type="button" onClick={recordPayment}><Coins size={17} /> Record $50 payment</button></section>}
    </section>
  );
}

function LegacyScreen({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  return (
    <section className="screen screen-legacy">
      <ScreenHeader icon={Crown} title="Dragon's Legacy" subtitle="Wisdom, relics, and milestones" back={() => navigate("lair")} />
      <section className="legacy-hero"><div className="level-crest"><Crown size={23} /><strong>{state.progression.level}</strong><small>LEVEL</small></div><div><span>Level {state.progression.level}</span><strong>{state.progression.title}</strong><i><b style={{ width: `${(state.progression.xp / state.progression.nextLevelXp) * 100}%` }} /></i><small>{state.progression.xp.toLocaleString()} / {state.progression.nextLevelXp.toLocaleString()} XP</small></div><div className="legacy-chest"><Gem size={41} /></div></section>
      <section className="relic-panel"><SectionTitle title="Recent relics" /><div>{state.progression.relics.map((relic, index) => <button key={relic} type="button" onClick={() => setSheet({ type: "relic", title: relic, body: ["A permanent reminder of your first protected buffer.", "Earned for reviewing the first claimant.", "Earned for making a considered purchase decision.", "Earned for charting your first Flight Path.", "Earned when the Deep Vault crossed $5,000."][index] })}><span className={`relic relic-${index + 1}`}>{index === 0 ? <Crown /> : index === 1 ? <LockKeyhole /> : index === 2 ? <Orbit /> : index === 3 ? <Telescope /> : <Gem />}</span><small>{relic}</small></button>)}</div></section>
      <button className="story-card" type="button" onClick={() => setSheet({ type: "story", title: "The Ancient Guardian", body: "Beyond the next ridge, an older guardian waits beside a vault that has not opened for centuries. Reach Level 10 to continue." })}><div className="story-art"><Sparkles size={31} /></div><span><small>Next title reward</small><strong>Reach Level 10</strong><p>The Ancient Guardian</p><i><b style={{ width: "67%" }} /></i></span><ChevronRight size={19} /></button>
      <section className="milestones"><SectionTitle title="Milestone path" /><div><span className="done"><Check /></span><i /><span className="done"><Check /></span><i /><span className="current">8</span><i /><span>9</span><i /><span>10</span></div></section>
      <p className="supportive-copy">Relics are permanent. A difficult month can change the path, but never erases what you learned.</p>
    </section>
  );
}

function SettingsScreen({ state, navigate, updateState, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dragon-mode-${new Date().toISOString().slice(0, 10)}.json`;
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
  return (
    <section className="screen screen-settings">
      <ScreenHeader icon={Settings} title="Treasury Settings" subtitle="Your vault, your rules" back={() => navigate("tribute")} />
      <TreasurySwitcher current="settings" navigate={navigate} />
      <section className="settings-card"><div><span><Volume2 size={20} /><b>Sound effects</b></span><button type="button" role="switch" aria-label="Sound effects" aria-checked={state.profile.soundEnabled} className={state.profile.soundEnabled ? "toggle on" : "toggle"} onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, soundEnabled: !previous.profile.soundEnabled } })); playFeedback({ sound: !state.profile.soundEnabled, haptics: false }).catch(() => undefined); }}><i /></button></div><div><span><Zap size={20} /><b>Haptic feedback</b></span><button type="button" role="switch" aria-label="Haptic feedback" aria-checked={state.profile.hapticsEnabled} className={state.profile.hapticsEnabled ? "toggle on" : "toggle"} onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, hapticsEnabled: !previous.profile.hapticsEnabled } })); playFeedback({ sound: false, haptics: !state.profile.hapticsEnabled }).catch(() => undefined); }}><i /></button></div><div><span><Bell size={20} /><b>Claimant reminders</b></span><button type="button" role="switch" aria-label="Claimant reminders" aria-checked={state.profile.notificationsEnabled} className={state.profile.notificationsEnabled ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, notificationsEnabled: !previous.profile.notificationsEnabled } }))}><i /></button></div><div><span><Sparkles size={20} /><b>Reduced motion</b></span><button type="button" role="switch" aria-label="Reduced motion" aria-checked={state.profile.reducedMotion} className={state.profile.reducedMotion ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, reducedMotion: !previous.profile.reducedMotion } }))}><i /></button></div><div><span><BookOpen size={20} /><b>Plain-language hints</b></span><button type="button" role="switch" aria-label="Plain-language hints" aria-checked={state.profile.plainLanguage} className={state.profile.plainLanguage ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, plainLanguage: !previous.profile.plainLanguage } }))}><i /></button></div></section>
      <section className="budget-settings"><SectionTitle title="Planning assumptions" /><label>Protected minimum buffer <b>{formatGold(state.profile.minimumBuffer, 0)}</b><input type="range" min="0" max="5000" step="100" value={state.profile.minimumBuffer} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, minimumBuffer: Number(event.target.value) } }))} /></label><label>Comfortable monthly cost <b>{formatGold(state.profile.comfortableMonthlyCost, 0)}</b><input type="range" min="500" max="6000" step="50" value={state.profile.comfortableMonthlyCost} onChange={(event) => updateState((previous) => ({ ...previous, profile: { ...previous.profile, comfortableMonthlyCost: Number(event.target.value) } }))} /></label></section>
      <section className="data-panel"><h2>On-device data</h2><p>Your MVP hoard is stored locally on this device in IndexedDB. No account or cloud connection is used.</p><button type="button" onClick={exportData}><Download size={18} /> Export JSON</button><label><Upload size={18} /> Import JSON<input type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} /></label><button type="button" onClick={() => setSheet({ type: "reset", title: "Reset demo data" })}><RotateCcw size={18} /> Reset demo</button></section>
      <button className="lore-card" type="button" onClick={() => { updateState((previous) => ({ ...previous, profile: { ...previous.profile, tutorialComplete: false } })); navigate("lair"); }}><BookOpen size={24} /><span><strong>Replay the Awakening</strong><small>Start the story tutorial again</small></span><ChevronRight size={18} /></button>
      <p className="version-note">{APP_NAME} mobile MVP · Local-first demo</p>
    </section>
  );
}

function TreasurySwitcher({ current, navigate }: { current: "tribute" | "debt" | "settings"; navigate: (screen: Screen) => void }) {
  return <div className="treasury-switcher"><button type="button" className={current === "tribute" ? "active" : ""} onClick={() => navigate("tribute")}><ScrollText size={16} /> Claimants</button><button type="button" className={current === "debt" ? "active" : ""} onClick={() => navigate("debt")}><LockKeyhole size={16} /> Debt</button><button type="button" className={current === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings size={16} /> Settings</button></div>;
}

function Segmented({ options, value, onChange, compact = false }: { options: string[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return <div className={`segmented ${compact ? "compact" : ""}`}>{options.map((option) => <button type="button" key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button type="button" onClick={onAction}>{action} <ChevronRight size={15} /></button>}</div>;
}

function SimpleBarChart({ title, rows }: { title: string; rows: Array<{ label: string; value: number; percent: number }> }) {
  return <section className="simple-bars"><SectionTitle title={title} />{rows.map((row) => <div key={row.label}><span>{row.label}<b>{formatGold(row.value, 0)}</b></span><i><b style={{ width: `${row.percent}%` }} /></i></div>)}<p>Values are based on the seeded transactions in this demo.</p></section>;
}

function TrendPanel() {
  return <section className="trend-panel"><SectionTitle title="Six-month path" /><div className="spark-bars">{[42, 58, 50, 68, 74, 82].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="trend-stat"><TrendingUp size={22} /><span><strong>Guarded Gold is up 14%</strong><small>Your emergency buffer grew in four of the last six months.</small></span></div></section>;
}

function Modal({ sheet, state, updateState, setSheet, logUse, setToast, navigate }: { sheet: NonNullable<Sheet>; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; logUse: (subscription: Subscription, quantity?: number) => void; setToast: (toast: string) => void; navigate: (screen: Screen) => void }) {
  const subscription = sheet.id ? state.subscriptions.find((item) => item.id === sheet.id) : undefined;
  const chamber = sheet.id ? state.chambers.find((item) => item.id === sheet.id) : undefined;
  const debt = sheet.id ? state.debts.find((item) => item.id === sheet.id) : undefined;
  const transaction = sheet.id ? state.transactions.find((item) => item.id === sheet.id) : undefined;
  const account = sheet.id ? state.accounts.find((item) => item.id === sheet.id) : undefined;
  const questRecord = sheet.id ? getActiveQuests(state).find((item) => item.id === sheet.id) : undefined;
  const hibernation = hibernationModes(state);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-grip" />
        <header><h2 id="modal-title">{sheet.title}</h2><button type="button" aria-label="Close" onClick={() => setSheet(null)}><X size={20} /></button></header>
        {sheet.body && <p className="modal-body-copy">{sheet.body}</p>}
        {sheet.type === "metric" && <MetricDetail id={sheet.id ?? ""} state={state} />}
        {sheet.type === "events" && <div className="modal-list"><button type="button">Streamkeep · in 2 days <b>$15.49</b></button><button type="button">Lair Energy · in 5 days <b>$87.12</b></button><button type="button">Skyforge payday · in 8 days <b>+$3,240</b></button><button type="button">Ember Card minimum · in 9 days <b>$75</b></button></div>}
        {sheet.type === "hibernation" && <div className="formula-card"><strong>{hibernation.Comfortable.toFixed(1)} months · Comfortable</strong><div className="detail-grid"><div><span>Essential</span><strong>{hibernation.Essential.toFixed(1)} mo</strong></div><div><span>Comfortable</span><strong>{hibernation.Comfortable.toFixed(1)} mo</strong></div><div><span>Current lifestyle</span><strong>{hibernation["Current lifestyle"].toFixed(1)} mo</strong></div></div><p>Deep Vault reserves ({formatGold(getHoardSummary(state).guarded)}) ÷ the monthly cost for each mode.</p><small>This is an estimate, not financial advice.</small></div>}
        {sheet.type === "chart" && <div className="formula-card"><BarChart3 size={32} /><p>{sheet.body}</p></div>}
        {sheet.type === "worth" && <WorthTheGold state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "quest" && questRecord && <div className="detail-stack"><p>{questRecord.description}</p><small>{questRecord.reason}</small><button className="secondary-button full" type="button" onClick={() => { updateState((previous) => ({ ...previous, quests: previous.quests.some((item) => item.id === questRecord.id) ? previous.quests.map((item) => item.id === questRecord.id ? { ...item, snoozedUntil: new Date(Date.now() + 3 * 86_400_000).toISOString() } : item) : [...previous.quests, { ...questRecord, snoozedUntil: new Date(Date.now() + 3 * 86_400_000).toISOString() }] })); setSheet(null); setToast("Quest will return in 3 days"); }}><CalendarDays size={17} /> Remind me later</button></div>}
        {sheet.type === "subscription" && subscription && <SubscriptionDetail subscription={subscription} state={state} updateState={updateState} logUse={logUse} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "chamber" && chamber && <ChamberDetail chamber={chamber} state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "debt" && debt && <DebtDetail debt={debt} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "transaction" && transaction && <TransactionDetail transaction={transaction} state={state} updateState={updateState} setToast={setToast} setSheet={setSheet} />}
        {sheet.type === "account" && account && <AccountDetail account={account} state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-transaction" && <AddTransaction state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-subscription" && <AddSubscription state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-wish" && <AddWish updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-account" && <AddAccount updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-debt" && <AddDebt updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "reorganise" && <Reorganise state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "reset" && <div className="confirm-panel"><p>This restores the vivid seeded demo. Your current local data will be replaced.</p><button type="button" className="danger-button" onClick={() => { clearState().then(() => { updateState(() => createSeedState()); setSheet(null); navigate("lair"); setToast("Demo hoard restored"); }); }}>Reset demo data</button><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Keep current hoard</button></div>}
        {!sheet.body && ["event", "lore", "insight", "relic", "story"].includes(sheet.type) && <p className="modal-body-copy">Nothing here is irreversible. Review the detail, then choose the next useful step.</p>}
      </section>
    </div>
  );
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
  const [accountId, setAccountId] = useState(subscription.accountId);
  const monthly = cadence === "monthly" ? Number(amount) || 0 : (Number(amount) || 0) / 12;
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
      accountId,
      priceChange: numericAmount !== item.amount ? numericAmount - item.amount : item.priceChange,
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
  return <div className="subscription-detail"><div className="detail-hero"><span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span><div><strong>{formatGold(Number(amount) || 0)}</strong><small>Renews {formatDate(`${nextCharge}T12:00:00`)}</small></div></div><div className="detail-grid"><div><span>Annual cost</span><strong>{formatGold(monthly * 12)}</strong></div><div><span>Logged uses</span><strong>{subscription.usageCount}</strong></div><div><span>Cost per logged use</span><strong>{formatGold(subscription.usageCount ? monthly / subscription.usageCount : monthly)}</strong></div><div><span>Last logged</span><strong>{subscription.lastUsed ? `${daysSince(subscription.lastUsed)}d ago` : "Never"}</strong></div></div><label className="quantity-field">Quantity<input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><button type="button" className="primary-button full" onClick={() => logUse(subscription, quantity)}><Check size={18} /> Used today</button><div className="edit-grid"><label>Price<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Cadence<select value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label><label>Next charge<input type="date" value={nextCharge} onChange={(event) => setNextCharge(event.target.value)} /></label><label>Payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label>Usage tracking<select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as typeof trackingMode)}><option value="every-use">Every use</option><option value="weekly">Weekly check</option><option value="monthly">Monthly review</option><option value="off">Do not track</option></select></label><label>Value rating<select value={valueRating} onChange={(event) => setValueRating(event.target.value as typeof valueRating)}><option>Not rated</option><option>Absolutely</option><option>Mostly</option><option>Neutral</option><option>Probably not</option><option>Regret it</option></select></label><label>Usage quest after <select value={usageQuestDays} onChange={(event) => setUsageQuestDays(Number(event.target.value))}><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><label>Reminder before <select value={reminderDays} onChange={(event) => setReminderDays(Number(event.target.value))}><option value="1">1 day</option><option value="2">2 days</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label></div><label>Cancellation notes<textarea value={cancellationNotes} onChange={(event) => setCancellationNotes(event.target.value)} placeholder="Where to cancel, notice period, or export steps" /></label><div className="price-history"><h3>Price history</h3>{subscription.priceHistory.map((entry) => <p key={`${entry.changedAt}-${entry.amount}`}><span>{formatDate(entry.changedAt)}</span><b>{formatGold(entry.amount)}</b></p>)}</div><button type="button" className="primary-button full" onClick={save}><Save size={17} /> Save claimant</button><button type="button" className="secondary-button full" onClick={schedule}><Bell size={17} /> Schedule friendly reminder</button><button type="button" className="danger-button full" onClick={() => { updateState((previous) => ({ ...previous, subscriptions: previous.subscriptions.filter((item) => item.id !== subscription.id) })); setSheet(null); setToast("Claimant removed"); }}><Trash2 size={17} /> Remove claimant</button><p className="fine-print">Cost per use is based only on usage you have logged.</p></div>;
}

function ChamberDetail({ chamber, state, updateState, setToast }: { chamber: DragonState["chambers"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [amount, setAmount] = useState(chamber.amount.toString());
  const transactions = state.transactions.filter((item) => item.category === chamber.name || item.category === chamber.practicalName).slice(0, 3);
  return <div className="detail-stack"><label>Current amount<input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} /></label><label>Target<input value={formatGold(chamber.target)} disabled /></label><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, chambers: previous.chambers.map((item) => item.id === chamber.id ? { ...item, amount: Number(amount) || item.amount } : item) })); setToast(`${chamber.name} updated`); }}><Save size={17} /> Save chamber</button>{transactions.length > 0 && <div className="mini-history"><h3>Recent movement</h3>{transactions.map((item) => <p key={item.id}>{item.merchant}<b>{formatGold(item.amount)}</b></p>)}</div>}</div>;
}

function DebtDetail({ debt, updateState, setSheet, setToast }: { debt: DragonState["debts"][number]; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(debt.name);
  const [balance, setBalance] = useState(debt.balance.toString());
  const [apr, setApr] = useState(debt.apr.toString());
  const [minimum, setMinimum] = useState(debt.minimum.toString());
  const [nextDue, setNextDue] = useState(debt.nextDue.slice(0, 10));
  return <div className="detail-stack"><strong>{formatGold(Number(balance) || 0)}</strong><div className="edit-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>APR %<input inputMode="decimal" value={apr} onChange={(event) => setApr(event.target.value)} /></label><label>Minimum payment<input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label>Next due<input type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} /></label></div><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, debts: previous.debts.map((item) => item.id === debt.id ? { ...item, name, balance: Number(balance) || 0, apr: Number(apr) || 0, minimum: Number(minimum) || 0, nextDue: new Date(`${nextDue}T12:00:00`).toISOString(), progress: Math.min(100, Math.max(0, Math.round(((item.principal - (Number(balance) || 0)) / item.principal) * 100))) } : item) })); setToast("Debt plan updated"); }}><Save size={17} /> Save claim</button><button type="button" className="danger-button full" onClick={() => { updateState((previous) => ({ ...previous, debts: previous.debts.filter((item) => item.id !== debt.id) })); setSheet(null); setToast("Claim removed from the map"); }}><Trash2 size={17} /> Remove claim</button><p>A claim on part of the hoard—not a judgment. Your past victories still count if the balance changes.</p></div>;
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
  const [recurringSeriesId, setRecurringSeriesId] = useState(transaction.recurringSeriesId ?? "");
  const [worthRating, setWorthRating] = useState<WorthRating | "">(transaction.worthRating ?? "");
  return <div className="detail-stack"><strong className={direction}>{direction === "income" ? "+" : "−"}{formatGold(Number(amount) || 0)}</strong>{transaction.unusual && <p className="warning-copy">This charge differs from your recent pattern. Review it calmly.</p>}<div className="edit-grid"><label>Merchant or source<input value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label><label>Amount<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Uncategorised</option><option>Income</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>Account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="cleared">Cleared</option><option value="pending">Pending</option></select></label><label>Recurring claimant<select value={recurringSeriesId} onChange={(event) => setRecurringSeriesId(event.target.value)}><option value="">Not recurring</option>{state.subscriptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Worth the Gold?<select value={worthRating} onChange={(event) => setWorthRating(event.target.value as WorthRating | "")}><option value="">Not rated</option><option>Absolutely</option><option>Mostly</option><option>Neutral</option><option>Probably not</option><option>Regret it</option></select></label><label className="check-label"><input type="checkbox" checked={unusual} onChange={(event) => setUnusual(event.target.checked)} /> Mark unusual</label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, transactions: previous.transactions.map((item) => item.id === transaction.id ? { ...item, merchant, amount: Number(amount) || 0, date: new Date(`${date}T12:00:00`).toISOString(), direction, category, accountId, note, status, unusual, recurringSeriesId: recurringSeriesId || undefined, worthRating: worthRating || undefined } : item), quests: previous.quests.map((quest) => quest.relatedEntityId === transaction.id && !unusual && category !== "Uncategorised" ? { ...quest, completed: true, completedAt: new Date().toISOString() } : quest) })); setToast("Transaction updated"); }}><Save size={17} /> Save changes</button><button type="button" className="danger-button full" onClick={() => { updateState((previous) => ({ ...previous, transactions: previous.transactions.filter((item) => item.id !== transaction.id) })); setSheet(null); setToast("Transaction removed"); }}><Trash2 size={17} /> Delete transaction</button></div>;
}

function AccountDetail({ account, state, updateState, setSheet, setToast }: { account: DragonState["accounts"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(account.balance.toString());
  const [type, setType] = useState(account.type);
  const [chamberId, setChamberId] = useState(account.chamberId);
  const [institutionName, setInstitutionName] = useState(account.institutionName ?? "");
  const [includedInHoard, setIncludedInHoard] = useState(account.includedInHoard);
  return <div className="detail-stack"><strong>{formatGold(Number(balance) || 0)}</strong><div className="edit-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Institution<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} /></label><label>Balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="transaction">Transaction</option><option value="savings">Savings</option><option value="credit">Credit</option><option value="loan">Loan</option><option value="investment">Investment</option></select></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}>{state.chambers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={includedInHoard} onChange={(event) => setIncludedInHoard(event.target.checked)} /> Include in hoard</label></div><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, accounts: previous.accounts.map((item) => item.id === account.id ? { ...item, name, balance: Number(balance) || 0, availableBalance: item.availableBalance === undefined ? undefined : Number(balance) || 0, type, chamberId, institutionName, includedInHoard } : item) })); setToast("Account updated"); }}><Save size={17} /> Save account</button><button type="button" className="danger-button full" onClick={() => { updateState((previous) => ({ ...previous, accounts: previous.accounts.map((item) => item.id === account.id ? { ...item, archived: true, includedInHoard: false } : item) })); setSheet(null); setToast("Account archived"); }}><Trash2 size={17} /> Archive account</button></div>;
}

function AddTransaction({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(state.chambers[0]?.name ?? "The Hearth");
  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"cleared" | "pending">("cleared");
  const [recurringSeriesId, setRecurringSeriesId] = useState("");
  const [unusual, setUnusual] = useState(false);
  const submit = () => {
    const numericAmount = Number(amount);
    if (!merchant || !numericAmount) return;
    updateState((previous) => ({
      ...previous,
      accounts: previous.accounts.map((account) => account.id === accountId && status === "cleared" ? { ...account, balance: account.balance + (direction === "income" ? numericAmount : -numericAmount), availableBalance: account.availableBalance === undefined ? undefined : account.availableBalance + (direction === "income" ? numericAmount : -numericAmount) } : account),
      transactions: [{ id: crypto.randomUUID(), accountId, date: new Date(`${date}T12:00:00`).toISOString(), merchant, amount: numericAmount, direction, category, recurringSeriesId: recurringSeriesId || undefined, note, status, unusual, createdManually: true }, ...previous.transactions],
    }));
    setSheet(null);
    setToast("Treasure movement added");
  };
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); submit(); }}><label>Merchant or source<input required value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="e.g. Moon Market" /></label><div className="edit-grid"><label>Amount<input required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="cleared">Cleared</option><option value="pending">Pending</option></select></label><label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Uncategorised</option><option>Income</option>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>Account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Recurring claimant<select value={recurringSeriesId} onChange={(event) => setRecurringSeriesId(event.target.value)}><option value="">Not recurring</option>{state.subscriptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={unusual} onChange={(event) => setUnusual(event.target.checked)} /> Mark unusual</label></div><label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /></label><button className="primary-button full" type="submit"><Plus size={18} /> Add transaction</button></form>;
}

function AddSubscription({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [nextCharge, setNextCharge] = useState(dateAfterDays(30));
  const [trackingMode, setTrackingMode] = useState<Subscription["trackingMode"]>("every-use");
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? "");
  const [reminderDays, setReminderDays] = useState(3);
  const [cancellationNotes, setCancellationNotes] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(amount)) return; const numericAmount = Number(amount); updateState((previous) => ({ ...previous, subscriptions: [...previous.subscriptions, { id: crypto.randomUUID(), name, amount: numericAmount, cadence, nextCharge: new Date(`${nextCharge}T12:00:00`).toISOString(), categoryId: "tribute", accountId, usageCount: 0, usageEvents: [], lastUsed: null, priceHistory: [{ amount: numericAmount, changedAt: new Date().toISOString() }], trackingMode, valueRating: "Not rated", cancellationNotes, reminderDays, reminderEnabled: false, usageQuestDays: 30, questEnabled: true, color: "#5b55d6", glyph: name.slice(0, 1).toUpperCase() }] })); setSheet(null); setToast("Claimant added"); }}><label>Claimant name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Amount<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Cadence<select value={cadence} onChange={(event) => setCadence(event.target.value as typeof cadence)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label><label>Next charge<input type="date" value={nextCharge} onChange={(event) => setNextCharge(event.target.value)} /></label><label>Payment account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{state.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label>Usage tracking<select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as typeof trackingMode)}><option value="every-use">Every use</option><option value="weekly">Weekly check</option><option value="monthly">Monthly review</option><option value="off">Do not track</option></select></label><label>Reminder before<select value={reminderDays} onChange={(event) => setReminderDays(Number(event.target.value))}><option value="1">1 day</option><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option></select></label></div><label>Cancellation notes<textarea value={cancellationNotes} onChange={(event) => setCancellationNotes(event.target.value)} placeholder="Optional instructions" /></label><button className="primary-button full" type="submit"><Plus size={18} /> Add claimant</button></form>;
}

function AddWish({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("3");
  const [category, setCategory] = useState("Workshop");
  const [desiredDate, setDesiredDate] = useState(dateAfterDays(14));
  const [fundingSource, setFundingSource] = useState("Free Gold");
  const [reason, setReason] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(price)) return; updateState((previous) => ({ ...previous, wishes: [...previous.wishes, { id: crypto.randomUUID(), name, price: Number(price), restDays: Number(days), endsAt: new Date(Date.now() + Number(days) * 86_400_000).toISOString(), category, desiredDate: new Date(`${desiredDate}T12:00:00`).toISOString(), fundingSource, reason: reason || "A considered future purchase.", status: "resting" }] })); setSheet(null); setToast("Wish placed in Dragon's Rest"); }}><label>Wished-for item<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Price<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Workshop</option><option>The Roost</option><option>The Hearth</option><option>Wish Vault</option></select></label><label>Desired date<input type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} /></label><label>Funding source<select value={fundingSource} onChange={(event) => setFundingSource(event.target.value)}><option>Free Gold</option><option>Wish Vault</option><option>Save over time</option><option>Credit</option></select></label><label>Rest period<select value={days} onChange={(event) => setDays(event.target.value)}><option value="1">One night</option><option value="3">Three days</option><option value="7">One week</option><option value="14">Until payday</option></select></label></div><label>Why do you want it?<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional context for future you" /></label><button className="primary-button full" type="submit"><Star size={18} /> Begin the rest</button></form>;
}

function AddAccount({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [balance, setBalance] = useState("");
  const [type, setType] = useState<DragonState["accounts"][number]["type"]>("savings");
  const [chamberId, setChamberId] = useState("vault");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name) return; updateState((previous) => ({ ...previous, accounts: [...previous.accounts, { id: crypto.randomUUID(), name, institutionName, type, balance: Number(balance) || 0, availableBalance: type === "transaction" ? Number(balance) || 0 : undefined, includedInHoard: true, chamberId, archived: false }] })); setSheet(null); setToast("Account added to the hoard"); }}><label>Account name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Institution<input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="Optional" /></label><div className="edit-grid"><label>Current balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="transaction">Transaction</option><option value="savings">Savings</option><option value="credit">Credit</option><option value="loan">Loan</option><option value="investment">Investment</option></select></label><label>Chamber<select value={chamberId} onChange={(event) => setChamberId(event.target.value)}><option value="hearth">The Hearth</option><option value="vault">Deep Vault</option><option value="workshop">Workshop</option><option value="roost">The Roost</option><option value="sleep">Long Sleep</option><option value="tribute">Tribute Hall</option><option value="wish">Wish Vault</option></select></label></div><button className="primary-button full" type="submit"><Plus size={18} /> Add account</button></form>;
}

function AddDebt({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [minimum, setMinimum] = useState("");
  const [nextDue, setNextDue] = useState(dateAfterDays(14));
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); const numericBalance = Number(balance); if (!name || !numericBalance) return; updateState((previous) => ({ ...previous, debts: [...previous.debts, { id: crypto.randomUUID(), name, balance: numericBalance, principal: numericBalance, apr: Number(apr) || 0, minimum: Number(minimum) || 0, nextDue: new Date(`${nextDue}T12:00:00`).toISOString(), progress: 0, strategyOrder: previous.debts.length + 1, targetExtraPayment: 0, icon: "card" }] })); setSheet(null); setToast("New claim mapped. Past victories still count."); }}><label>Debt name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="edit-grid"><label>Current balance<input required inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><label>APR %<input inputMode="decimal" value={apr} onChange={(event) => setApr(event.target.value)} /></label><label>Minimum payment<input inputMode="decimal" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label>Next due<input type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} /></label></div><button className="primary-button full" type="submit"><Plus size={18} /> Map this claim</button></form>;
}

function Reorganise({ state, updateState, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  return <div className="reorganise-list">{state.chambers.map((chamber, index) => <div key={chamber.id}><Menu size={18} /><span><strong>{index + 1}. {chamber.name}</strong><small>{chamber.practicalName}</small></span><button type="button" onClick={() => { if (!index) return; updateState((previous) => { const next = [...previous.chambers]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return { ...previous, chambers: next }; }); setToast("Chamber moved"); }}>↑</button></div>)}</div>;
}

function Tutorial({ step, setStep, finish }: { step: number; setStep: (step: number) => void; finish: () => void }) {
  const chapters = [
    { eyebrow: "Chapter 1 · The Awakening", title: "A guardian stirs", text: "You inherited a neglected sky-vault—and woke a young dragon named Moss. The dragon reflects stewardship, never wealth.", icon: Eye },
    { eyebrow: "Chapter 2 · Count the Treasure", title: "Every coin needs a place", text: "Available is liquid gold. Committed already has a job. Guarded protects your future. Invested sleeps for the long journey.", icon: Coins },
    { eyebrow: "Chapter 3 · The First Quest", title: "One useful step", text: "Quests are suggestions, never tests. Ignoring one is not failure, and a smaller quest may be enough today.", icon: ListChecks },
    { eyebrow: "The First Relic", title: "Your legacy begins", text: "Relics preserve what you learned. They are never removed when balances fall or the path changes.", icon: Crown },
  ];
  const chapter = chapters[step]; const Icon = chapter.icon;
  return <div className="tutorial-backdrop"><section className="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><button className="skip" type="button" onClick={finish}>Skip story</button><div className={`tutorial-art tutorial-${step}`}><Icon size={49} /><Sparkles size={24} /></div><span>{chapter.eyebrow}</span><h2 id="tutorial-title">{chapter.title}</h2><p>{chapter.text}</p><div className="story-dots">{chapters.map((_, index) => <i key={index} className={index === step ? "active" : ""} />)}</div><button className="primary-button full" type="button" onClick={() => step === chapters.length - 1 ? finish() : setStep(step + 1)}>{step === chapters.length - 1 ? "Enter the Lair" : "Continue"} <ChevronRight size={18} /></button></section></div>;
}
