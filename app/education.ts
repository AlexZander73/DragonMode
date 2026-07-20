import { addProgressionXp, estimateDebtPlan, getHoardSummary, hibernationMonths, monthlyTribute, projectScenario } from "./calculations";
import type { DragonState } from "./data";

const DAY_MS = 86_400_000;

export type CalculatorField = { label: string; value: number | string; source: string; editable: boolean };
export type CalculatorResult = {
  id: string;
  fantasyTitle: string;
  plainTitle: string;
  question: string;
  result: string;
  explanation: string;
  fields: CalculatorField[];
  assumptions: string[];
  exclusions: string[];
  sourceTitle: string;
  sourceUrl: string;
  reviewedAt: string;
  priority: "high" | "medium";
};

const money = (state: DragonState, value: number) => new Intl.NumberFormat(state.profile.locale, { style: "currency", currency: state.profile.preferredCurrency, maximumFractionDigits: 0 }).format(value);
const safeNumber = (value: number) => Number.isFinite(value) ? value : 0;

export function buildCalculatorResults(state: DragonState, now = new Date()): CalculatorResult[] {
  const summary = getHoardSummary(state);
  const activeScenario = state.projections.scenarios[state.projections.activeScenario];
  const fourteenDays = now.getTime() + 14 * DAY_MS;
  const upcomingSubscriptions = state.subscriptions.filter((item) => {
    const time = new Date(item.nextCharge).getTime();
    return time >= now.getTime() && time <= fourteenDays;
  }).reduce((sum, item) => sum + item.amount, 0);
  const upcomingDebt = state.debts.filter((item) => {
    const time = new Date(item.nextDue).getTime();
    return time >= now.getTime() && time <= fourteenDays;
  }).reduce((sum, item) => sum + item.minimum, 0);
  const fortnightIncome = state.journey.incomeSources.filter((item) => item.reliability === "steady" && (item.cadence === "weekly" || item.cadence === "fortnightly")).reduce((sum, item) => sum + item.expectedAmount * (item.cadence === "weekly" ? 2 : 1), 0);
  const checkpoint = summary.available + fortnightIncome - upcomingSubscriptions - upcomingDebt;
  const primarySavings = state.accounts.find((account) => account.type === "savings" && (account.apy || account.promotionalApy));
  const activePromo = primarySavings?.promotionalApy && primarySavings.promotionStart && primarySavings.promotionEnd && now >= new Date(primarySavings.promotionStart) && now < new Date(primarySavings.promotionEnd);
  const savingsRate = activePromo ? primarySavings?.promotionalApy ?? 0 : primarySavings?.apy ?? 0;
  const nextMonthInterest = (primarySavings?.balance ?? 0) * (savingsRate / 100) * 30 / 365;
  const firstGoal = state.goals.find((goal) => goal.status === "active");
  const goalContribution = Math.max(0, activeScenario?.savingsContribution ?? 0);
  const remainingGoal = Math.max(0, (firstGoal?.targetAmount ?? 0) - (firstGoal?.currentAmount ?? 0));
  const goalMonths = goalContribution > 0 ? Math.ceil(remainingGoal / goalContribution) : 0;
  const debtMinimum = estimateDebtPlan(state.debts, "Minimum payments", 0);
  const debtFixed = estimateDebtPlan(state.debts, "Highest interest first", Math.max(0, activeScenario?.debtExtraPayment ?? 0));
  const primaryDebt = state.debts[0];
  const primaryMinimum = primaryDebt ? estimateDebtPlan([primaryDebt], "Minimum payments", 0) : { months: 0, interestPaid: 0 };
  const fixedPaymentExtra = primaryDebt ? Math.max(25, primaryDebt.minimum * 0.5) : 0;
  const primaryFixed = primaryDebt ? estimateDebtPlan([primaryDebt], "Highest interest first", fixedPaymentExtra) : { months: 0, interestPaid: 0 };
  const raisedRate = primaryDebt ? estimateDebtPlan([{ ...primaryDebt, apr: primaryDebt.apr + 1 }], "Minimum payments", 0) : { months: 0, interestPaid: 0 };
  const term = state.accounts.find((account) => account.maturityDate && (account.apy || account.interestRate));
  const termDays = term?.maturityDate ? Math.max(0, (new Date(term.maturityDate).getTime() - now.getTime()) / DAY_MS) : 0;
  const termRate = term?.apy ?? term?.interestRate ?? 0;
  const termYears = termDays / 365;
  const termFuture = term?.compounding === "monthly"
    ? term.balance * Math.pow(1 + termRate / 100 / 12, 12 * termYears)
    : (term?.balance ?? 0) * (1 + termRate / 100 * termYears);
  const wish = state.wishes.find((item) => item.status === "resting");
  const projection = activeScenario ? projectScenario(state, activeScenario, 12) : null;
  const investmentValue = state.investments.reduce((sum, item) => sum + item.units * (item.marketPrice ?? item.unitPrice), 0);
  const enteredFees = state.investments.reduce((sum, item) => sum + (item.units * (item.marketPrice ?? item.unitPrice)) * (item.feeRate ?? 0), 0);
  const investmentFeeRate = investmentValue > 0 && enteredFees > 0 ? enteredFees / investmentValue : 1;
  const feeDrag = investmentValue * (investmentFeeRate / 100) * 10;
  const compoundPrincipal = primarySavings?.balance ?? 0;
  const compoundRate = primarySavings?.apy ?? 0;
  const compoundContribution = Math.max(0, activeScenario?.savingsContribution ?? 0);
  const compoundYears = 5;
  const monthlyRate = compoundRate / 100 / 12;
  const compoundFuture = monthlyRate > 0
    ? compoundPrincipal * Math.pow(1 + monthlyRate, compoundYears * 12) + compoundContribution * ((Math.pow(1 + monthlyRate, compoundYears * 12) - 1) / monthlyRate)
    : compoundPrincipal + compoundContribution * compoundYears * 12;
  const sourceDate = state.updatedAt ? new Date(state.updatedAt).toLocaleDateString(state.profile.locale) : "current device copy";
  const common = { reviewedAt: "2026-07-21", priority: "high" as const };
  return [
    {
      ...common, id: "next-checkpoint", fantasyTitle: "The Next Gate", plainTitle: "Next-checkpoint cash flow", question: "What is already mapped for the next 14 days?", result: `${money(state, checkpoint)} illustrated after mapped arrivals and claims`,
      explanation: "Available balance + steady mapped income − subscriptions due − debt minimums due.",
      fields: [{ label: "Available", value: summary.available, source: `Accounts · ${sourceDate}`, editable: true }, { label: "Expected steady income", value: fortnightIncome, source: "Income routes", editable: true }, { label: "Subscriptions due", value: upcomingSubscriptions, source: "Claimants", editable: true }, { label: "Debt minimums due", value: upcomingDebt, source: "Debt map", editable: true }],
      assumptions: ["Only currently mapped dates are included", "Expected income is not treated as guaranteed"], exclusions: ["Unmapped spending", "Fees and timing changes"], sourceTitle: "Moneysmart budgeting", sourceUrl: "https://moneysmart.gov.au/budgeting/budget-planner",
    },
    {
      ...common, id: "promotion-cliff", fantasyTitle: "Star Vault Rate Watch", plainTitle: "Savings interest and promotion expiry", question: "What might this account earn before its rate changes?", result: primarySavings ? `${money(state, nextMonthInterest)} estimated over 30 days at ${savingsRate.toFixed(2)}%` : "Add a savings rate to create this illustration",
      explanation: "Balance × annual rate × 30 ÷ 365. The Idle Vault uses finer dated periods and compounding.",
      fields: [{ label: "Balance", value: primarySavings?.balance ?? 0, source: primarySavings?.name ?? "No savings account", editable: true }, { label: "Rate", value: savingsRate, source: activePromo ? "Promotional APY" : "Base APY", editable: true }, { label: "Promotion ends", value: primarySavings?.promotionEnd?.slice(0, 10) ?? "Unknown", source: primarySavings?.name ?? "No account", editable: true }],
      assumptions: ["Rate remains unchanged inside the illustrated period", "Unknown bonus conditions are excluded"], exclusions: ["Tax", "Institution-specific day-count rules unless supplied"], sourceTitle: "Moneysmart compound interest", sourceUrl: "https://moneysmart.gov.au/saving/compound-interest",
    },
    {
      ...common, id: "goal-path", fantasyTitle: "Quest Horizon", plainTitle: "Savings goal path", question: "When might the next goal be reached?", result: firstGoal ? (goalMonths ? `About ${goalMonths} months at ${money(state, goalContribution)} per month` : `${money(state, remainingGoal)} remains; add a scenario contribution`) : "Create a goal to map a path",
      explanation: "Remaining goal amount ÷ editable monthly contribution.",
      fields: [{ label: "Remaining", value: remainingGoal, source: firstGoal?.name ?? "No goal", editable: true }, { label: "Monthly contribution", value: goalContribution, source: state.projections.activeScenario, editable: true }], assumptions: ["Contribution remains steady", "Interest and irregular deposits are excluded from this simple view"], exclusions: ["Rate changes", "Missed or extra contributions"], sourceTitle: "Moneysmart savings goals calculator", sourceUrl: "https://moneysmart.gov.au/saving/savings-goals-calculator",
    },
    {
      ...common, id: "emergency-runway", fantasyTitle: "Hibernation Chamber", plainTitle: "Emergency runway", question: "How long could the guarded balance cover mapped essentials?", result: `${safeNumber(hibernationMonths(state, state.profile.essentialMonthlyCost)).toFixed(1)} months at the current essential-cost assumption`,
      explanation: "Guarded balance ÷ editable essential monthly cost.", fields: [{ label: "Guarded balance", value: summary.guarded, source: "Deep Vault", editable: true }, { label: "Essential monthly cost", value: state.profile.essentialMonthlyCost, source: "Profile assumptions", editable: true }], assumptions: ["Monthly essentials remain near the entered amount"], exclusions: ["Unexpected one-off costs", "Access restrictions on locked deposits"], sourceTitle: "Moneysmart emergency fund", sourceUrl: "https://moneysmart.gov.au/saving/save-for-an-emergency-fund",
    },
    {
      ...common, id: "debt-comparison", fantasyTitle: "The Chain Map", plainTitle: "Debt repayment comparison", question: "How do minimum and extra-payment illustrations differ?", result: state.debts.length ? `${debtMinimum.months} months at minimums vs ${debtFixed.months} with the mapped extra amount` : "Add a debt to compare repayment methods",
      explanation: "Monthly interest is applied, then minimums and the editable extra payment are allocated by the selected ordering.", fields: [{ label: "Mapped debts", value: state.debts.length, source: "Debt map", editable: false }, { label: "Extra monthly payment", value: activeScenario?.debtExtraPayment ?? 0, source: state.projections.activeScenario, editable: true }, { label: "Minimum-path interest", value: debtMinimum.interestPaid, source: "Illustration", editable: false }], assumptions: ["Rates and minimums remain unchanged", "No new borrowing"], exclusions: ["Fees", "Promotional transfers", "Lender-specific allocation rules"], sourceTitle: "Moneysmart pay off your credit card", sourceUrl: "https://moneysmart.gov.au/credit-cards/pay-off-your-credit-card",
    },
    {
      ...common, id: "credit-fixed-payment", fantasyTitle: "The Steady Hammer", plainTitle: "Credit minimum versus fixed payment", question: "What changes if a fixed extra amount is added to this mapped debt?", result: primaryDebt ? `${primaryMinimum.months} months at the mapped minimum vs ${primaryFixed.months} with ${money(state, fixedPaymentExtra)} extra` : "Add a credit card or debt to compare payments",
      explanation: "Monthly interest is applied before the mapped minimum plus an editable extra amount. No payment is changed.", fields: [{ label: "Balance", value: primaryDebt?.balance ?? 0, source: primaryDebt?.name ?? "No debt", editable: true }, { label: "APR", value: primaryDebt?.apr ?? 0, source: primaryDebt?.name ?? "No debt", editable: true }, { label: "Minimum", value: primaryDebt?.minimum ?? 0, source: primaryDebt?.name ?? "No debt", editable: true }, { label: "Extra payment", value: fixedPaymentExtra, source: "Editable illustration", editable: true }], assumptions: ["Rate and payment remain unchanged", "Payment is made monthly"], exclusions: ["Fees", "New purchases", "Lender-specific minimum formulas"], sourceTitle: "Moneysmart credit card calculator", sourceUrl: "https://moneysmart.gov.au/credit-cards/credit-card-calculator",
    },
    {
      ...common, id: "term-maturity", fantasyTitle: "The Sealed Vault", plainTitle: "Term-deposit maturity", question: "What may be available when a locked deposit matures?", result: term ? `${money(state, termFuture)} illustrated at maturity using ${term.compounding === "monthly" ? "monthly compounding" : "simple interest"}` : "Add a maturity date and rate to a locked account",
      explanation: term?.compounding === "monthly" ? "Principal is compounded monthly for the remaining mapped term." : "Principal plus simple interest for the remaining mapped term.", fields: [{ label: "Principal", value: term?.balance ?? 0, source: term?.name ?? "No term deposit", editable: true }, { label: "Rate", value: termRate, source: term?.name ?? "No term deposit", editable: true }, { label: "Maturity", value: term?.maturityDate?.slice(0, 10) ?? "Unknown", source: term?.name ?? "No term deposit", editable: true }, { label: "Compounding periods", value: term?.compounding === "monthly" ? 12 : 0, source: term?.compounding ?? "Unknown", editable: true }], assumptions: ["The entered compounding choice applies", "Principal remains locked"], exclusions: ["Early-withdrawal adjustments", "Tax", "Automatic rollover"], sourceTitle: "Moneysmart term deposits", sourceUrl: "https://moneysmart.gov.au/investments-paying-interest/term-deposits",
    },
    {
      ...common, id: "recurring-annual", fantasyTitle: "Claimants’ Year", plainTitle: "Recurring-cost annualiser", question: "What do mapped recurring costs add up to?", result: `${money(state, monthlyTribute(state) * 12)} illustrated per year`, explanation: "Each cadence is normalized to a monthly amount, then multiplied by 12.", fields: [{ label: "Monthly normalized total", value: monthlyTribute(state), source: `${state.subscriptions.length} mapped claimants`, editable: false }], assumptions: ["Current prices and cadences continue"], exclusions: ["Price changes not yet entered", "Cancelled or paused periods"], sourceTitle: "Moneysmart subscriptions", sourceUrl: "https://moneysmart.gov.au/budgeting/expenses-to-include-in-your-budget",
    },
    {
      ...common, id: "wish-impact", fantasyTitle: "The Sleeping Wish", plainTitle: "Purchase-impact illustration", question: "What would remain if this resting purchase happened now?", result: wish ? `${money(state, summary.freeGold - wish.price)} illustrated Free Gold afterward` : "No resting Wish is mapped",
      explanation: "Current Free Gold − Wish price. No purchase is made and no recommendation is implied.", fields: [{ label: "Free Gold", value: summary.freeGold, source: "Hoard summary", editable: true }, { label: "Wish price", value: wish?.price ?? 0, source: wish?.name ?? "No Wish", editable: true }], assumptions: ["Known commitments and buffer remain unchanged"], exclusions: ["Future income", "Price changes", "Non-financial value"], sourceTitle: "Moneysmart spending plan", sourceUrl: "https://moneysmart.gov.au/budgeting/how-to-do-a-budget",
    },
    {
      ...common, id: "projection-range", fantasyTitle: "The Scrying Range", plainTitle: "Twelve-month cash-flow scenario", question: "What does the active scenario illustrate?", result: projection ? `${money(state, projection.low)} to ${money(state, projection.high)} after 12 months` : "Choose a projection scenario",
      explanation: "The active monthly assumptions are projected with an uncertainty range; it is not a forecast guarantee.", fields: [{ label: "Active scenario", value: state.projections.activeScenario, source: "Flight Path", editable: true }, { label: "Monthly net", value: projection?.monthlyNet ?? 0, source: "Scenario assumptions", editable: true }], assumptions: ["Scenario inputs repeat monthly"], exclusions: ["Market returns", "Unexpected events", "Inflation unless manually reflected"], sourceTitle: "Moneysmart savings goals", sourceUrl: "https://moneysmart.gov.au/saving/savings-goals-calculator",
    },
    {
      ...common, id: "compound-explorer", fantasyTitle: "The Growing Constellation", plainTitle: "Compound-interest explorer", question: "How might principal and regular contributions change over time?", result: `${money(state, compoundFuture)} illustrated after ${compoundYears} years`,
      explanation: "Principal compounds monthly and editable monthly contributions are added at the end of each period.", fields: [{ label: "Principal", value: compoundPrincipal, source: primarySavings?.name ?? "No savings account", editable: true }, { label: "Annual rate", value: compoundRate, source: primarySavings?.name ?? "Unknown", editable: true }, { label: "Monthly contribution", value: compoundContribution, source: state.projections.activeScenario, editable: true }, { label: "Years", value: compoundYears, source: "Educational assumption", editable: true }], assumptions: ["Rate and contribution remain constant", "Monthly compounding and end-of-month contributions"], exclusions: ["Tax", "Fees", "Rate changes", "Missed contributions"], sourceTitle: "Moneysmart compound interest calculator", sourceUrl: "https://moneysmart.gov.au/saving/compound-interest",
    },
    {
      ...common, id: "loan-rate-change", fantasyTitle: "The Changing Chain", plainTitle: "Loan rate-change scenario", question: "What if the mapped borrowing rate changed by one percentage point?", result: primaryDebt ? `${money(state, primaryMinimum.interestPaid)} interest at the mapped rate vs ${money(state, raisedRate.interestPaid)} at ${(primaryDebt.apr + 1).toFixed(2)}%` : "Add a debt or loan to compare a rate change",
      explanation: "The same mapped balance and minimum are illustrated at an editable rate. It does not predict a lender decision.", fields: [{ label: "Balance", value: primaryDebt?.balance ?? 0, source: primaryDebt?.name ?? "No debt", editable: true }, { label: "Current APR", value: primaryDebt?.apr ?? 0, source: primaryDebt?.name ?? "Unknown", editable: true }, { label: "Scenario APR", value: (primaryDebt?.apr ?? 0) + 1, source: "Editable +1 percentage point scenario", editable: true }, { label: "Monthly payment", value: primaryDebt?.minimum ?? 0, source: primaryDebt?.name ?? "Unknown", editable: true }], assumptions: ["Payment and balance inputs remain as shown", "Interest is applied monthly"], exclusions: ["Fees", "Variable lender formulas", "New borrowing"], sourceTitle: "Moneysmart personal loans", sourceUrl: "https://moneysmart.gov.au/loans/personal-loans",
    },
    {
      ...common, id: "fee-drag", fantasyTitle: "The Quiet Toll", plainTitle: "Investment fee-drag illustration", question: "What could the entered annual fee represent over ten years?", result: `${money(state, feeDrag)} simple, non-compounded illustration`, explanation: `Current mapped investment value × ${investmentFeeRate.toFixed(2)}% × 10 years. A full compound model would differ.`, fields: [{ label: "Mapped value", value: investmentValue, source: "Investment positions", editable: true }, { label: "Illustrative fee", value: investmentFeeRate, source: enteredFees > 0 ? "Position fee rates" : "Labelled educational assumption", editable: true }, { label: "Years", value: 10, source: "Educational assumption", editable: true }], assumptions: ["Value is held constant for this deliberately simple comparison"], exclusions: ["Returns", "Compounding", "Taxes", "Product fee tiers not entered"], sourceTitle: "Moneysmart investment fees", sourceUrl: "https://moneysmart.gov.au/how-to-invest/fees-and-costs",
    },
  ];
}

export function completeLoreCard(state: DragonState, cardId: string) {
  if (state.education.completedLoreIds.includes(cardId)) return state;
  const eventId = `lore-${cardId}`;
  return {
    ...state,
    education: { ...state.education, completedLoreIds: [...state.education.completedLoreIds, cardId] },
    checkIns: { ...state.checkIns, loreKeys: state.checkIns.loreKeys + 1 },
    progression: addProgressionXp(state, 5, eventId),
  };
}

export function recalculateResult(state: DragonState, card: CalculatorResult, overrides: Record<string, number | string>) {
  const value = (label: string) => Number(overrides[label] ?? card.fields.find((field) => field.label === label)?.value ?? 0) || 0;
  const payoff = (balance: number, apr: number, monthlyPayment: number) => {
    let remaining = Math.max(0, balance);
    let interest = 0;
    let months = 0;
    while (remaining > 0.01 && months < 600) {
      const charged = remaining * Math.max(0, apr) / 100 / 12;
      interest += charged;
      remaining += charged;
      if (monthlyPayment <= charged) return { months: 600, interest };
      remaining = Math.max(0, remaining - monthlyPayment);
      months += 1;
    }
    return { months, interest };
  };
  if (card.id === "next-checkpoint") return `${money(state, value("Available") + value("Expected steady income") - value("Subscriptions due") - value("Debt minimums due"))} illustrated after mapped arrivals and claims`;
  if (card.id === "promotion-cliff") return `${money(state, value("Balance") * value("Rate") / 100 * 30 / 365)} estimated over 30 days at ${value("Rate").toFixed(2)}%`;
  if (card.id === "goal-path") return value("Monthly contribution") > 0 ? `About ${Math.ceil(value("Remaining") / value("Monthly contribution"))} months at ${money(state, value("Monthly contribution"))} per month` : `${money(state, value("Remaining"))} remains; add a scenario contribution`;
  if (card.id === "emergency-runway") return `${(value("Guarded balance") / Math.max(1, value("Essential monthly cost"))).toFixed(1)} months at the illustrated essential cost`;
  if (card.id === "credit-fixed-payment") {
    const minimum = payoff(value("Balance"), value("APR"), value("Minimum"));
    const fixed = payoff(value("Balance"), value("APR"), value("Minimum") + value("Extra payment"));
    return `${minimum.months} months at the mapped minimum vs ${fixed.months} with ${money(state, value("Extra payment"))} extra`;
  }
  if (card.id === "term-maturity") {
    const maturity = String(overrides.Maturity ?? card.fields.find((field) => field.label === "Maturity")?.value ?? "");
    const days = Math.max(0, (new Date(maturity).getTime() - Date.now()) / DAY_MS);
    const periods = Math.max(0, value("Compounding periods"));
    const years = days / 365;
    const future = periods > 0 ? value("Principal") * Math.pow(1 + value("Rate") / 100 / periods, periods * years) : value("Principal") * (1 + value("Rate") / 100 * years);
    return `${money(state, future)} illustrated at maturity using ${periods > 0 ? `${periods} compounding periods a year` : "simple interest"}`;
  }
  if (card.id === "recurring-annual") return `${money(state, value("Monthly normalized total") * 12)} illustrated per year`;
  if (card.id === "wish-impact") return `${money(state, value("Free Gold") - value("Wish price"))} illustrated Free Gold afterward`;
  if (card.id === "compound-explorer") {
    const rate = value("Annual rate") / 100 / 12;
    const months = Math.max(0, value("Years") * 12);
    const future = rate > 0 ? value("Principal") * Math.pow(1 + rate, months) + value("Monthly contribution") * ((Math.pow(1 + rate, months) - 1) / rate) : value("Principal") + value("Monthly contribution") * months;
    return `${money(state, future)} illustrated after ${value("Years")} years`;
  }
  if (card.id === "loan-rate-change") {
    const current = payoff(value("Balance"), value("Current APR"), value("Monthly payment"));
    const scenario = payoff(value("Balance"), value("Scenario APR"), value("Monthly payment"));
    return `${money(state, current.interest)} interest at the mapped rate vs ${money(state, scenario.interest)} at ${value("Scenario APR").toFixed(2)}%`;
  }
  if (card.id === "fee-drag") return `${money(state, value("Mapped value") * value("Illustrative fee") / 100 * value("Years"))} simple, non-compounded illustration`;
  return card.result;
}
