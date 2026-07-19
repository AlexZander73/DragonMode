"use client";

import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Car,
  Check,
  ChevronRight,
  CircleDollarSign,
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
  Music,
  Orbit,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Sword,
  Target,
  Telescope,
  TrendingUp,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { averageApr, getHoardSummary, hibernationMonths, monthlyTribute, totalDebt } from "./calculations";
import { APP_NAME, APP_TAGLINE, formatGold, type MainTab } from "./constants";
import { createSeedState, type DragonState, type Quest, type Subscription } from "./data";
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
      quests: previous.quests.map((item) => (item.id === quest.id ? { ...item, completed: true } : item)),
      progression: {
        ...previous.progression,
        xp: previous.progression.xp + quest.xp,
        completedQuestCount: previous.progression.completedQuestCount + 1,
      },
    }));
    setToast(`Quest complete · +${quest.xp} XP`);
  };

  const logSubscriptionUse = (subscription: Subscription, quantity = 1) => {
    updateState((previous) => ({
      ...previous,
      subscriptions: previous.subscriptions.map((item) =>
        item.id === subscription.id
          ? { ...item, usageCount: item.usageCount + quantity, lastUsed: new Date().toISOString() }
          : item,
      ),
      progression: { ...previous.progression, xp: previous.progression.xp + 2 },
    }));
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
          {screen === "hoard" && <HoardScreen state={state} summary={summary} updateState={updateState} setSheet={setSheet} />}
          {screen === "quests" && <QuestScreen state={state} completeQuest={completeQuest} navigate={navigate} />}
          {screen === "analytics" && <AnalyticsScreen state={state} navigate={navigate} setSheet={setSheet} />}
          {screen === "tribute" && <TributeScreen state={state} navigate={navigate} setSheet={setSheet} logUse={logSubscriptionUse} />}
          {screen === "flight" && <FlightScreen navigate={navigate} />}
          {screen === "wish" && <WishScreen state={state} navigate={navigate} updateState={updateState} summary={summary} setToast={setToast} setSheet={setSheet} />}
          {screen === "dragon" && <DragonScreen state={state} navigate={navigate} updateState={updateState} setToast={setToast} />}
          {screen === "debt" && <DebtScreen state={state} navigate={navigate} setSheet={setSheet} />}
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
        <span><strong>The hoard is safe.</strong><small>{state.profile.dragonName} rests, but keeps one eye open.</small></span>
        <Check className="banner-check" size={22} />
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

function HoardScreen({ state, summary, updateState, setSheet }: { state: DragonState; summary: ReturnType<typeof getHoardSummary>; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void }) {
  const [view, setView] = useState<"Chambers" | "Accounts" | "Transactions">("Chambers");
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
          {state.accounts.map((account) => (
            <button key={account.id} type="button" onClick={() => setSheet({ type: "account", id: account.id, title: account.name })}>
              <span className={`round-icon ${account.type}`}><WalletCards size={20} /></span><span><strong>{account.name}</strong><small>{account.type}</small></span><b>{formatGold(account.balance)}</b><ChevronRight size={17} />
            </button>
          ))}
          <button className="add-row" type="button" onClick={() => setSheet({ type: "add-account", title: "Add an account" })}><Plus size={19} /> Add account</button>
        </div>
      )}
      {view === "Transactions" && (
        <div className="transaction-panel">
          <button className="primary-button full" type="button" onClick={() => setSheet({ type: "add-transaction", title: "Add treasure movement" })}><Plus size={18} /> Add transaction</button>
          {state.transactions.map((transaction) => (
            <button key={transaction.id} type="button" className="transaction-row" onClick={() => setSheet({ type: "transaction", id: transaction.id, title: transaction.merchant })}>
              <span className={`transaction-glyph ${transaction.unusual ? "unusual" : ""}`}>{transaction.unusual ? "!" : transaction.merchant.slice(0, 1)}</span>
              <span><strong>{transaction.merchant}</strong><small>{formatDate(transaction.date)} · {transaction.category}</small></span>
              <b className={transaction.direction}>{transaction.direction === "income" ? "+" : "−"}{formatGold(transaction.amount)}</b>
            </button>
          ))}
        </div>
      )}
      <button className="secondary-button full" type="button" onClick={() => setSheet({ type: "reorganise", title: "Reorganise treasure" })}><Menu size={18} /> Reorganise treasure</button>
    </section>
  );
}

function QuestScreen({ state, completeQuest, navigate }: { state: DragonState; completeQuest: (quest: Quest) => void; navigate: (screen: Screen) => void }) {
  const [filter, setFilter] = useState("All");
  const visible = state.quests.filter((quest) => !quest.completed && (filter === "All" || quest.category === filter));
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
              <div className="quest-copy"><strong>{quest.title}</strong><p>{quest.description}</p><small><Star size={13} /> Reward: {quest.xp} XP {quest.progress && <b>{quest.progress}</b>}</small></div>
              <button type="button" onClick={() => completeQuest(quest)}>GO!</button>
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
  return (
    <section className="screen screen-scrying">
      <ScreenHeader icon={Telescope} title="Scrying Pool" subtitle="Patterns in the gold" action={<button type="button" className="icon-button" onClick={() => navigate("flight")} aria-label="Open Flight Path"><TrendingUp size={21} /></button>} />
      <Segmented options={["Overview", "Spending", "Income", "Trends"]} value={view} onChange={setView} compact />
      {view === "Overview" && (
        <>
          <section className="analytics-summary">
            <div><span>Inflow</span><strong>+$3,700</strong></div><div><span>Outflow</span><strong>−$3,240</strong></div><div><span>Net change</span><strong>+$460</strong></div>
          </section>
          <section className="chart-panel">
            <SectionTitle title="This month" />
            <div className="donut-wrap">
              <button className="donut" type="button" onClick={() => setSheet({ type: "chart", title: "Spending by chamber", body: "Hearth 40%, Roost 23%, Workshop 15%, Tribute 12%, Long Sleep 6%, Other 4%." })} aria-label="Spending donut chart. Total spent $3,240"><span><b>$3,240</b><small>Total spent</small></span></button>
              <ul className="chart-legend"><li><i className="orange" />Hearth <b>40%</b></li><li><i className="purple" />Roost <b>23%</b></li><li><i className="blue" />Workshop <b>15%</b></li><li><i className="teal" />Tribute <b>12%</b></li><li><i className="green" />Long Sleep <b>6%</b></li></ul>
            </div>
          </section>
          <section className="insight-card"><h2>Insights</h2><button type="button" onClick={() => setSheet({ type: "insight", title: "Dining changed course", body: "Dining spending is 18% higher than your recent three-month average. Most of the increase came from two weekend purchases." })}><Sparkles size={16} /><span>Dining is 18% higher than your recent average.</span><ChevronRight size={18} /></button><button type="button" onClick={() => setSheet({ type: "insight", title: "Worth the Gold", body: "You rated 82% of Roost spending as worthwhile. Hobby purchases scored highest; convenience purchases were more mixed." })}><Star size={16} /><span>82% of Roost spending felt worth the gold.</span><ChevronRight size={18} /></button></section>
          <button className="hibernation-card" type="button" onClick={() => setSheet({ type: "hibernation", title: "Hibernation estimate" })}>
            <div><span>Hibernation estimate</span><p>Your hoard could sustain your lair for <strong>{months.toFixed(1)} months</strong> comfortably.</p><small>Tap to inspect the estimate</small></div><div className="sleeping-orb"><Orbit size={38} /></div>
          </button>
          <button className="primary-button full" type="button" onClick={() => navigate("flight")}><Map size={18} /> Open Flight Path</button>
        </>
      )}
      {view === "Spending" && <SimpleBarChart title="Spending by chamber" rows={[{ label: "The Hearth", value: 1296, percent: 100 }, { label: "The Roost", value: 745, percent: 58 }, { label: "Workshop", value: 486, percent: 38 }, { label: "Tribute Hall", value: 389, percent: 30 }]} />}
      {view === "Income" && <SimpleBarChart title="Income streams" rows={[{ label: "Skyforge Payroll", value: 3240, percent: 100 }, { label: "Freelance bounties", value: 460, percent: 14 }]} />}
      {view === "Trends" && <TrendPanel />}
    </section>
  );
}

function TributeScreen({ state, navigate, setSheet, logUse }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void; logUse: (subscription: Subscription, quantity?: number) => void }) {
  const tribute = monthlyTribute(state);
  return (
    <section className="screen screen-treasury screen-tribute">
      <ScreenHeader icon={ScrollText} title="Tribute Hall" subtitle="Subscriptions & recurring costs" action={<button className="icon-button" type="button" onClick={() => setSheet({ type: "add-subscription", title: "Add a claimant" })} aria-label="Add subscription"><Plus size={21} /></button>} />
      <TreasurySwitcher current="tribute" navigate={navigate} />
      <section className="tribute-total"><Gem size={24} /><span>Total monthly tribute<strong>{formatGold(tribute)}</strong><small>{formatGold(tribute * 12, 0)} each year · {state.subscriptions.length} active claimants</small></span><Coins size={32} /></section>
      <div className="claimant-list">
        {state.subscriptions.map((subscription) => (
          <button key={subscription.id} type="button" className="claimant-card" onClick={() => setSheet({ type: "subscription", id: subscription.id, title: subscription.name })}>
            <span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span>
            <span><strong>{subscription.name}</strong><small>{formatGold(subscription.amount)} / {subscription.cadence === "monthly" ? "month" : "year"}</small>{subscription.lastUsed && <em>Last logged {daysSince(subscription.lastUsed) === 0 ? "today" : `${dayLabel(daysSince(subscription.lastUsed))} ago`}</em>}</span>
            <span className="claimant-arrival">in {dayLabel(daysUntil(subscription.nextCharge))}{subscription.priceChange && <b>↑ +{formatGold(subscription.priceChange)}</b>}</span><ChevronRight size={17} />
          </button>
        ))}
      </div>
      <section className="tribute-alert"><div><Bell size={20} /><span><strong>One claimant increased tribute.</strong><small>CloudQuill rose by $3 this month.</small></span></div><button type="button" onClick={() => setSheet({ type: "subscription", id: "s3", title: "CloudQuill" })}>Review now</button></section>
      <section className="quick-log"><SectionTitle title="Quick usage log" /><div>{state.subscriptions.slice(0, 3).map((subscription) => <button key={subscription.id} type="button" onClick={() => logUse(subscription)}><span style={{ background: subscription.color }}>{subscription.glyph}</span><b>{subscription.name}</b><small>Used today</small></button>)}</div></section>
    </section>
  );
}

function FlightScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [scenario, setScenario] = useState("Current Flight");
  const [extraIncome, setExtraIncome] = useState(50);
  const scenarioEnd: Record<string, number> = { "Current Flight": 31210, Cautious: 33480, "Treasure Hunt": 37120, Resting: 16420 };
  return (
    <section className="screen screen-flight">
      <ScreenHeader icon={Map} title="Flight Path" subtitle="Chart your dragon's journey" back={() => navigate("analytics")} />
      <Segmented options={["Current Flight", "Cautious", "Treasure Hunt", "Resting"]} value={scenario} onChange={setScenario} compact />
      <section className="flight-chart" aria-label={`${scenario} projection from $19,400 to ${formatGold(scenarioEnd[scenario], 0)} over one year`}>
        <div className="chart-y"><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span></div>
        <div className="chart-grid"><span /><span /><span /><span /><span /><svg viewBox="0 0 300 170" preserveAspectRatio="none" aria-hidden="true"><path className="range" d="M0 115 C55 97 95 72 150 68 S245 33 300 18 L300 44 C245 54 205 62 150 83 S55 117 0 126 Z"/><path className="line purple" d="M0 118 C55 98 95 88 150 78 S245 63 300 54"/><path className="line green" d="M0 120 C55 126 95 127 150 129 S245 132 300 134"/><path className="line active-line" d={scenario === "Resting" ? "M0 118 C55 126 95 127 150 129 S245 132 300 134" : scenario === "Cautious" ? "M0 118 C55 100 95 76 150 68 S245 43 300 28" : scenario === "Treasure Hunt" ? "M0 118 C55 92 95 68 150 55 S245 27 300 12" : "M0 118 C55 97 95 82 150 70 S245 48 300 35"}/><circle cx="300" cy={scenario === "Resting" ? "134" : scenario === "Cautious" ? "28" : scenario === "Treasure Hunt" ? "12" : "35"} r="5" /></svg></div>
        <div className="chart-x"><span>Now</span><span>3M</span><span>6M</span><span>1Y</span></div>
        <span className="chart-result">{formatGold(scenarioEnd[scenario] + (scenario === "Treasure Hunt" ? extraIncome * 52 : 0), 0)}</span>
      </section>
      <section className="range-note"><Sparkles size={19} /><p>At your current pace, your hoard may be between <strong>$28,300 – {formatGold(scenarioEnd[scenario] + (scenario === "Treasure Hunt" ? extraIncome * 52 : 0), 0)}</strong> in one year.</p></section>
      <section className="scenario-editor"><SectionTitle title="Scenario editor" /><label>Extra weekly income <b>{formatGold(extraIncome, 0)}</b><input type="range" min="0" max="200" step="10" value={extraIncome} onChange={(event) => setExtraIncome(Number(event.target.value))} /></label><div className="cause-card"><Target size={21} /><p>Adding {formatGold(extraIncome, 0)} each week reaches the Deep Vault target about <strong>{Math.max(1, 9 - Math.round(extraIncome / 25))} weeks earlier</strong>.</p></div></section>
      <button className="primary-button full" type="button" onClick={() => navigate("analytics")}><Check size={18} /> Save this flight</button>
    </section>
  );
}

function WishScreen({ state, navigate, updateState, summary, setToast, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; summary: ReturnType<typeof getHoardSummary>; setToast: (toast: string) => void; setSheet: (sheet: Sheet) => void }) {
  const wish = state.wishes.find((item) => item.status === "resting") ?? state.wishes[0];
  const [restDays, setRestDays] = useState(wish?.restDays ?? 3);
  if (!wish) return <section className="screen"><ScreenHeader icon={Star} title="Dragon's Rest" back={() => navigate("quests")} /><div className="empty-state"><Star size={40} /><strong>No wishes are resting.</strong><button className="primary-button" type="button" onClick={() => setSheet({ type: "add-wish", title: "Add a wish" })}>Add a wish</button></div></section>;
  const decide = (status: "claimed" | "saved" | "released") => {
    updateState((previous) => ({ ...previous, wishes: previous.wishes.map((item) => item.id === wish.id ? { ...item, status } : item), progression: { ...previous.progression, xp: previous.progression.xp + 15 } }));
    setToast("A considered choice · +15 patience XP");
    navigate("quests");
  };
  return (
    <section className="screen screen-wish">
      <ScreenHeader icon={Star} title="Dragon's Rest" subtitle="Let time tell if it's worthy" back={() => navigate("quests")} action={<button type="button" className="icon-button" onClick={() => setSheet({ type: "add-wish", title: "Add another wish" })} aria-label="Add wish"><Plus size={20} /></button>} />
      <section className="wish-frame"><div className="wish-product-art" /><div><strong>{wish.name}</strong><b>{formatGold(wish.price)}</b></div></section>
      <section className="rest-panel"><span>Resting for</span><Segmented options={["1 Night", "3 Days", "1 Week", "Custom"]} value={restDays === 1 ? "1 Night" : restDays === 3 ? "3 Days" : restDays === 7 ? "1 Week" : "Custom"} onChange={(value) => setRestDays(value === "1 Night" ? 1 : value === "3 Days" ? 3 : value === "1 Week" ? 7 : 14)} compact /><strong><Orbit size={18} /> Ends in {dayLabel(daysUntil(wish.endsAt))}</strong></section>
      <section className="wish-impact"><div className="wish-dragon" /><p>It fits within your Free Gold, but would delay the Workshop Upgrade by <strong>6 days</strong>.</p></section>
      <div className="impact-grid"><div><span>Free Gold after</span><strong>{formatGold(summary.freeGold - wish.price)}</strong></div><div><span>Hibernation shift</span><strong>− 3 days</strong></div><div><span>Save time</span><strong>1 payday</strong></div><div><span>Similar worth rating</span><strong>Mostly</strong></div></div>
      <p className="supportive-copy">Buying it is a valid outcome. The reward is for making the choice with the full map in view.</p>
      <div className="wish-actions"><button type="button" className="claim" onClick={() => decide("claimed")}>Claim treasure</button><button type="button" className="rest" onClick={() => { setRestDays(restDays + 3); setToast("Rest extended by 3 days"); }}>Rest longer</button><button type="button" className="save" onClick={() => decide("saved")}>Save toward it</button><button type="button" className="release" onClick={() => decide("released")}>Release</button></div>
    </section>
  );
}

function DragonScreen({ state, navigate, updateState, setToast }: { state: DragonState; navigate: (screen: Screen) => void; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const colors = ["Emerald", "Sky", "Amethyst", "Ember"];
  const [color, setColor] = useState("Emerald");
  return (
    <section className="screen screen-dragon">
      <ScreenHeader icon={Eye} title="The Dragon" subtitle="Your dragon reflects your stewardship" back={() => navigate("lair")} />
      <section className="dragon-status-art"><span>{state.profile.dragonName}</span></section>
      <section className="state-panel"><Eye size={30} /><span>Current state<strong>WATCHFUL</strong><small>The dragon senses something that deserves attention.</small></span></section>
      <section className="reason-panel"><h2>Why?</h2><ul><li>An expense increased</li><li>One bill is higher than usual</li><li>A subscription returns soon</li></ul><button type="button" onClick={() => navigate("quests")}>Open stabilising quest <ChevronRight size={18} /></button></section>
      <blockquote>“The path narrowed, but it did not close. We protect the next seven days first.”</blockquote>
      <section className="cosmetics"><SectionTitle title="Scale colours" /><div>{colors.map((item) => <button key={item} className={color === item ? "selected" : ""} type="button" onClick={() => { setColor(item); setToast(`${item} scales equipped`); }}><span className={item.toLowerCase()} /><small>{item}</small></button>)}</div></section>
      <button className="secondary-button full" type="button" onClick={() => navigate("legacy")}><Crown size={18} /> View permanent legacy</button>
    </section>
  );
}

function DebtScreen({ state, navigate, setSheet }: { state: DragonState; navigate: (screen: Screen) => void; setSheet: (sheet: Sheet) => void }) {
  const [strategy, setStrategy] = useState("Smallest first");
  const [extra, setExtra] = useState(50);
  return (
    <section className="screen screen-debt">
      <ScreenHeader icon={LockKeyhole} title="Debt Chamber" subtitle="Understand and break the chains" back={() => navigate("tribute")} />
      <TreasurySwitcher current="debt" navigate={navigate} />
      <section className="debt-total"><div className="chain-line"><span /><LockKeyhole size={30} /><span /></div><span>Total debt</span><strong>{formatGold(totalDebt(state))}</strong><small>{formatGold(state.debts.reduce((sum, debt) => sum + debt.minimum, 0))} monthly minimum · {averageApr(state).toFixed(1)}% weighted APR</small></section>
      <div className="debt-list">{state.debts.map((debt) => { const Icon = ICONS[debt.icon] ?? CreditCard; return <button key={debt.id} type="button" onClick={() => setSheet({ type: "debt", id: debt.id, title: debt.name })}><span className="debt-icon"><Icon size={21} /></span><span><strong>{debt.name}</strong><small>{debt.apr.toFixed(2)}% APR · min {formatGold(debt.minimum)}</small><i><b style={{ width: `${debt.progress}%` }} /></i></span><b>{formatGold(debt.balance)}</b></button>; })}</div>
      <section className="strategy-panel"><SectionTitle title="Compare strategies" /><label>Payoff order<select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option>Smallest first</option><option>Highest interest first</option><option>Minimum payments</option><option>Custom order</option></select></label><label>Extra each month <b>{formatGold(extra, 0)}</b><input type="range" min="0" max="400" step="25" value={extra} onChange={(event) => setExtra(Number(event.target.value))} /></label><p>{strategy} with {formatGold(extra, 0)} extra may clear the first chain in <strong>{Math.max(2, 11 - Math.round(extra / 50))} months</strong>.</p></section>
      <section className="victory-panel"><span>Next victory</span><strong>Pay off $500 to break another chain.</strong><div><i><b style={{ width: "81%" }} /></i><small>$2,100 / $2,600</small></div></section>
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
      const parsed = JSON.parse(text) as DragonState;
      if (!parsed.profile || !parsed.chambers) throw new Error("Invalid Dragon Mode export");
      setStateSafely(parsed);
      setToast("Hoard import complete");
    }).catch(() => setToast("That file could not be read"));
  };
  const setStateSafely = (next: DragonState) => updateState(() => next);
  return (
    <section className="screen screen-settings">
      <ScreenHeader icon={Settings} title="Treasury Settings" subtitle="Your vault, your rules" back={() => navigate("tribute")} />
      <TreasurySwitcher current="settings" navigate={navigate} />
      <section className="settings-card"><div><span><Volume2 size={20} /><b>Sound effects</b></span><button type="button" role="switch" aria-label="Sound effects" aria-checked={state.profile.soundEnabled} className={state.profile.soundEnabled ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, soundEnabled: !previous.profile.soundEnabled } }))}><i /></button></div><div><span><Sparkles size={20} /><b>Reduced motion</b></span><button type="button" role="switch" aria-label="Reduced motion" aria-checked={state.profile.reducedMotion} className={state.profile.reducedMotion ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, reducedMotion: !previous.profile.reducedMotion } }))}><i /></button></div><div><span><BookOpen size={20} /><b>Plain-language hints</b></span><button type="button" role="switch" aria-label="Plain-language hints" aria-checked={state.profile.plainLanguage} className={state.profile.plainLanguage ? "toggle on" : "toggle"} onClick={() => updateState((previous) => ({ ...previous, profile: { ...previous.profile, plainLanguage: !previous.profile.plainLanguage } }))}><i /></button></div></section>
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
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-grip" />
        <header><h2 id="modal-title">{sheet.title}</h2><button type="button" aria-label="Close" onClick={() => setSheet(null)}><X size={20} /></button></header>
        {sheet.body && <p className="modal-body-copy">{sheet.body}</p>}
        {sheet.type === "metric" && <MetricDetail id={sheet.id ?? ""} state={state} />}
        {sheet.type === "events" && <div className="modal-list"><button type="button">Streamkeep · in 2 days <b>$15.49</b></button><button type="button">Lair Energy · in 5 days <b>$87.12</b></button><button type="button">Skyforge payday · in 8 days <b>+$3,240</b></button><button type="button">Ember Card minimum · in 9 days <b>$75</b></button></div>}
        {sheet.type === "hibernation" && <div className="formula-card"><strong>{hibernationMonths(state).toFixed(1)} months · Comfortable</strong><p>Deep Vault reserves ({formatGold(getHoardSummary(state).guarded)}) ÷ comfortable monthly cost ({formatGold(1706.5)}).</p><small>This is an estimate, not financial advice.</small></div>}
        {sheet.type === "chart" && <div className="formula-card"><BarChart3 size={32} /><p>{sheet.body}</p></div>}
        {sheet.type === "subscription" && subscription && <SubscriptionDetail subscription={subscription} logUse={logUse} />}
        {sheet.type === "chamber" && chamber && <ChamberDetail chamber={chamber} state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "debt" && debt && <DebtDetail debt={debt} />}
        {sheet.type === "transaction" && transaction && <TransactionDetail transaction={transaction} state={state} updateState={updateState} setToast={setToast} />}
        {sheet.type === "account" && account && <div className="detail-stack"><strong>{formatGold(account.balance)}</strong><p>{account.type} account · Included in your hoard</p><button className="secondary-button" type="button"><Pencil size={17} /> Edit account</button></div>}
        {sheet.type === "add-transaction" && <AddTransaction state={state} updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-subscription" && <AddSubscription updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-wish" && <AddWish updateState={updateState} setSheet={setSheet} setToast={setToast} />}
        {sheet.type === "add-account" && <AddAccount updateState={updateState} setSheet={setSheet} setToast={setToast} />}
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

function SubscriptionDetail({ subscription, logUse }: { subscription: Subscription; logUse: (subscription: Subscription, quantity?: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  const monthly = subscription.cadence === "monthly" ? subscription.amount : subscription.amount / 12;
  return <div className="subscription-detail"><div className="detail-hero"><span className="claimant-logo" style={{ background: subscription.color }}>{subscription.glyph}</span><div><strong>{formatGold(subscription.amount)}</strong><small>Renews {formatDate(subscription.nextCharge)}</small></div></div><div className="detail-grid"><div><span>Annual cost</span><strong>{formatGold(monthly * 12)}</strong></div><div><span>Logged uses</span><strong>{subscription.usageCount}</strong></div><div><span>Cost per logged use</span><strong>{formatGold(subscription.usageCount ? monthly / subscription.usageCount : monthly)}</strong></div><div><span>Tracking</span><strong>Every use</strong></div></div><label className="quantity-field">Quantity<input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><button type="button" className="primary-button full" onClick={() => logUse(subscription, quantity)}><Check size={18} /> Used today</button><p className="fine-print">Cost per use is based only on usage you have logged.</p></div>;
}

function ChamberDetail({ chamber, state, updateState, setToast }: { chamber: DragonState["chambers"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [amount, setAmount] = useState(chamber.amount.toString());
  const transactions = state.transactions.filter((item) => item.category === chamber.name || item.category === chamber.practicalName).slice(0, 3);
  return <div className="detail-stack"><label>Current amount<input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} /></label><label>Target<input value={formatGold(chamber.target)} disabled /></label><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, chambers: previous.chambers.map((item) => item.id === chamber.id ? { ...item, amount: Number(amount) || item.amount } : item) })); setToast(`${chamber.name} updated`); }}><Save size={17} /> Save chamber</button>{transactions.length > 0 && <div className="mini-history"><h3>Recent movement</h3>{transactions.map((item) => <p key={item.id}>{item.merchant}<b>{formatGold(item.amount)}</b></p>)}</div>}</div>;
}

function DebtDetail({ debt }: { debt: DragonState["debts"][number] }) {
  return <div className="detail-stack"><strong>{formatGold(debt.balance)}</strong><div className="detail-grid"><div><span>APR</span><strong>{debt.apr.toFixed(2)}%</strong></div><div><span>Minimum</span><strong>{formatGold(debt.minimum)}</strong></div><div><span>Next due</span><strong>{formatDate(debt.nextDue)}</strong></div><div><span>Progress</span><strong>{debt.progress}%</strong></div></div><p>A claim on part of the hoard—not a judgment. Your past victories still count if the balance changes.</p></div>;
}

function TransactionDetail({ transaction, state, updateState, setToast }: { transaction: DragonState["transactions"][number]; state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setToast: (toast: string) => void }) {
  const [category, setCategory] = useState(transaction.category);
  return <div className="detail-stack"><strong className={transaction.direction}>{transaction.direction === "income" ? "+" : "−"}{formatGold(transaction.amount)}</strong>{transaction.unusual && <p className="warning-copy">This charge differs from your recent pattern. Review it calmly.</p>}<label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><button type="button" className="primary-button full" onClick={() => { updateState((previous) => ({ ...previous, transactions: previous.transactions.map((item) => item.id === transaction.id ? { ...item, category, unusual: false } : item) })); setToast("Transaction updated"); }}><Save size={17} /> Save changes</button></div>;
}

function AddTransaction({ state, updateState, setSheet, setToast }: { state: DragonState; updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [merchant, setMerchant] = useState(""); const [amount, setAmount] = useState(""); const [category, setCategory] = useState(state.chambers[0]?.name ?? "The Hearth"); const [direction, setDirection] = useState<"expense" | "income">("expense");
  const submit = () => { if (!merchant || !Number(amount)) return; updateState((previous) => ({ ...previous, transactions: [{ id: crypto.randomUUID(), date: new Date().toISOString(), merchant, amount: Number(amount), direction, category }, ...previous.transactions] })); setSheet(null); setToast("Treasure movement added"); };
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); submit(); }}><label>Merchant or source<input required value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="e.g. Moon Market" /></label><label>Amount<input required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label><label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Chamber<select value={category} onChange={(event) => setCategory(event.target.value)}>{state.chambers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><button className="primary-button full" type="submit"><Plus size={18} /> Add transaction</button></form>;
}

function AddSubscription({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(amount)) return; updateState((previous) => ({ ...previous, subscriptions: [...previous.subscriptions, { id: crypto.randomUUID(), name, amount: Number(amount), cadence: "monthly", nextCharge: new Date(Date.now() + 30 * 86_400_000).toISOString(), usageCount: 0, lastUsed: null, color: "#5b55d6", glyph: name.slice(0, 1).toUpperCase() }] })); setSheet(null); setToast("Claimant added"); }}><label>Claimant name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Monthly amount<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button className="primary-button full" type="submit"><Plus size={18} /> Add claimant</button></form>;
}

function AddWish({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [days, setDays] = useState("3");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name || !Number(price)) return; updateState((previous) => ({ ...previous, wishes: [...previous.wishes, { id: crypto.randomUUID(), name, price: Number(price), restDays: Number(days), endsAt: new Date(Date.now() + Number(days) * 86_400_000).toISOString(), reason: "A considered future purchase.", status: "resting" }] })); setSheet(null); setToast("Wish placed in Dragon's Rest"); }}><label>Wished-for item<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Price<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Rest period<select value={days} onChange={(event) => setDays(event.target.value)}><option value="1">One night</option><option value="3">Three days</option><option value="7">One week</option><option value="14">Until payday</option></select></label><button className="primary-button full" type="submit"><Star size={18} /> Begin the rest</button></form>;
}

function AddAccount({ updateState, setSheet, setToast }: { updateState: (updater: (state: DragonState) => DragonState) => void; setSheet: (sheet: Sheet) => void; setToast: (toast: string) => void }) {
  const [name, setName] = useState(""); const [balance, setBalance] = useState("");
  return <form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!name) return; updateState((previous) => ({ ...previous, accounts: [...previous.accounts, { id: crypto.randomUUID(), name, type: "savings", balance: Number(balance) || 0, chamberId: "vault" }] })); setSheet(null); setToast("Account added to the hoard"); }}><label>Account name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Current balance<input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} /></label><button className="primary-button full" type="submit"><Plus size={18} /> Add account</button></form>;
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
