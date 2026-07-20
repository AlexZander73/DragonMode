# DragonMode product research

**Date:** 21 July 2026
**Scope:** Product research and recommendations only; no app code was changed.
**Market lens:** Australia-first, local-first personal financial tracking. This is product research, not legal, financial, tax, credit, or investment advice.

## Executive conclusion

DragonMode should not be designed as a finance tracker with game decoration. It should be designed as a **trustworthy, forgiving game about understanding uncertain records**.

The strongest product loop is:

> Capture almost anything → let DragonMode do the parsing → show uncertainty honestly → let the user resolve only the important questions → reconcile the result → reveal a small story/cosmetic reward → teach one relevant idea → let the user leave.

This matters because financial avoidance is real. Research on personal-finance attention finds that people pay less attention as liquidity worsens, including when balances cross below zero; research on financial shame also connects shame with withdrawal and avoidance. The app’s kind, non-punishing tone is therefore not merely branding—it is part of the functional intervention. Sources: [NBER, “The Ostrich in Us”](https://www.nber.org/papers/w23945) and [Gladstone et al., “Financial shame spirals”](https://www.sciencedirect.com/science/article/pii/S0749597821000662).

DragonMode already contains much of the difficult creative foundation: fantasy chambers, a five-tab structure, manual financial CRUD, projections, debt strategies, quests, permanent XP/relics, pets, goals, story chapters, income rhythms, promotional savings rates, and an Idle Vault. The next differentiator is not more surface area. It is:

1. dramatically easier and safer data capture;
2. a visible “trust layer” for imports, duplicates, reconciliation, and estimates;
3. richer daily/weekly/seasonal loops built on the existing game systems;
4. contextual education and calculators that are almost completely pre-filled;
5. cosmetic collection that borrows the joy of gacha without paid chance, pressure, or punishment.

## What is already in the repository

The review used the current source, README, privacy summary, market-data notes, master specification, and source-parity audit. Important existing capabilities include:

- local IndexedDB persistence with JSON import/export;
- manual account, transaction, subscription, debt, goal, wish, and investment records;
- transaction editing, transfers, searches, filters, manual unusual/duplicate flags, and a review state;
- account/chamber reconciliation when transactions are created, edited, or deleted;
- Available, Committed, Guarded, Invested, Free Gold, hibernation, cash-flow, category, worth-rating, debt, and projection calculations;
- rule-driven Guard, Grow, Learn, and Tend quests with snooze and dismissal;
- permanent XP, levels, titles, relics, milestones, and cosmetics;
- three companions with daily, weekly, and monthly cadences and no loss from absence;
- a Living Atlas with daily, weekly, or pay-cycle chapters, multiple characters, choices, snapshots, and supportive rising/steady/sheltered routes;
- an Idle Vault that estimates savings interest and dividends without modifying real balances;
- base APY, compounding frequency, promotional APY, promotion start, and promotion end fields;
- goals, goal progress, Dragon’s Rest, subscription usage/cost-per-use, debt strategies, and market-data isolation;
- accessibility settings, plain-language mode, notification controls, and local-first privacy positioning.

The largest functional gaps relevant to this research are:

- no universal paste box, share-sheet capture, or statement text parser;
- no CSV, OFX, QFX, or QIF transaction import flow;
- JSON import replaces/normalizes app state rather than staging bank movements;
- no automatic candidate matching for duplicates or pending-to-posted replacements;
- no import batch, source provenance, raw-row audit trail, confidence score, or one-tap import undo;
- no statement opening/closing-balance reconciliation workflow;
- no split transactions or reusable merchant/category rules exposed as a first-class workflow;
- no contextual calculator/lore library tied to the user’s actual records;
- a story library that will repeat because each financial direction has only a small number of authored variants;
- collection unlocks exist, but there is not yet a real earned reveal/collection system;
- saved lair/dragon customization fields and unlocks are not yet a deep, user-facing skin system.

Two current mechanics deserve special review:

- Idle Vault Star Shards are proportional to estimated interest/dividends. This unintentionally grants more cosmetic progress to people with larger balances, conflicting with DragonMode’s principle that stewardship—not wealth—drives progression.
- Goal “small steps” can increase visual progress and XP without a corresponding account allocation or transaction. Manual declarations can remain valid, but the app should clearly distinguish **mapped/declared progress** from **verified/linked progress**.

## Finance-app benchmark

### What leading products consistently do well

Across YNAB, Monarch, Copilot Money, Rocket Money, PocketSmith, Quicken Simplifi, Empower, and Frollo, the recurring strengths are:

- aggregate accounts and provide one understandable current picture;
- import or connect movements instead of demanding full manual entry;
- keep a review queue for new or uncertain transactions;
- remember merchant/category decisions through rules;
- detect recurring income, bills, and subscriptions;
- surface cash flow, net worth, goals, upcoming obligations, and trends;
- allow edits, exclusions, splits, tags, notes, and custom categories;
- separate transfers/investment movements from normal spending and income;
- project forward from recurring obligations and user assumptions;
- make the user confirm or correct machine decisions rather than hiding automation.

Specific useful precedents:

- **YNAB** supports QFX, OFX, QIF, and CSV file import. It can match a manually entered movement with an imported movement when amounts match and dates are close, assigns occurrence-aware import IDs, and lets users approve, reject, match, or unmatch. Crucially, its own documentation acknowledges that same-day/same-amount movements can both be real. [File-based import](https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo), [matching](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i), [API import IDs](https://api.ynab.com/v1).
- **Monarch** combines connected/manual accounts, transaction rules, recurring tracking, goals, reports, and household collaboration. Its CSV import modes show why destructive replacement rules must be exceptionally explicit and reversible. [Manual import](https://help.monarch.com/hc/en-us/articles/4409682789908-Import-Transaction-Data-Manually-from-Banks-or-Other-Finance-Apps), [rules](https://help.monarch.com/hc/en-us/articles/360048393372-Creating-transaction-rules), [getting started](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started).
- **Copilot Money** places new imported transactions into a **To Review** queue and combines that with budgets, recurring items, net income, investments, cash flow, and net worth. This is a strong interaction model for DragonMode’s Quest Board. [Dashboard](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview), [quick start](https://help.copilot.money/en/articles/11157550-quick-start-guide).
- **Rocket Money** makes subscriptions and recurring bills a central hook, alongside balance alerts, category budgets, transaction splits, tags, notes, rules, manual entries, goals, and net worth. [Product overview](https://www.rocketmoney.com/), [Premium features](https://help.rocketmoney.com/en/articles/2677184-premium-membership-features).
- **PocketSmith** combines bank files with calendar/scenario forecasting. It also documents that overlapping files can create duplicates, reinforcing the need for an import-batch ledger and explicit overlap handling. [Bank files](https://learn.pocketsmith.com/article/484-bank-files), [forecast/scenarios](https://www.pocketsmith.com/blog/updates-to-how-pocketsmith-manages-accounts-and-forecasts/).
- **Quicken Simplifi** builds a spending plan from recurring income, bills, subscriptions, transfers, savings goals, and planned spending, and can plan up to 12 months ahead. [Spending Plan](https://support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan), [setup](https://support.simplifi.quicken.com/en/articles/14893966-how-to-set-up-the-spending-plan).
- **Empower** is strong at a unified net-worth/cash-flow/investment overview and explicitly excludes reinvested dividends from spendable cash flow by default. That boundary is useful for DragonMode’s dividend handling. [Dashboard](https://support-personalwealth.empower.com/hc/en-us/articles/201169740-Dashboard-Overview), [cash-flow exclusions](https://support-personalwealth.empower.com/hc/en-us/articles/115009570667-Investment-Income-Dividends-Received-and-Advisory-Fees-not-showing-in-Cash-Flow-Budgeting-Tools).
- **Frollo** demonstrates the Australia-specific value of CDR/Open Banking: net worth, budgets, goals, unusual-spending alerts, bills, and insights with consented account data. [Frollo app](https://frollo.com.au/frollo-app/).
- **Fortune City** is the most direct finance/game precedent: recording expenses grows a city. Its strength is a clear cause-and-effect fantasy; its risk is rewarding logging volume, which can make more spending feel like more progress. [Google Play listing](https://play.google.com/store/apps/details?id=com.fourdesire.fortunecity).

### DragonMode’s opportunity

Most finance apps optimize clarity but feel administrative. Most game-like finance apps attach points to entries but do not build a high-trust reconciliation system. DragonMode can own the intersection:

> **A financial tracker where the enjoyable action is turning uncertainty into a trusted map.**

That means the most rewarding moment is not “you spent less.” It is “the ledger now makes sense.”

## Universal capture and import design

### Input promise

The product promise should be:

> “Paste, share, or import what your bank gave you. DragonMode will organize a draft, explain what it thinks, and ask only when the answer matters.”

Recommended capture methods, in build order:

1. **Universal paste:** one text area accepting copied bank rows, emails, tab-separated tables, comma-separated rows, and one-off natural entries such as “Coffee 8.50 today from Daily Gold.”
2. **CSV import:** automatic delimiter/encoding/header/date/sign detection with a preview and reusable mapping per institution.
3. **OFX/QFX import:** preferred where available because structured IDs and account information improve trust.
4. **QIF import:** supported as a legacy format with extra review because field quality varies.
5. **Mobile share sheet:** “Share to DragonMode” from a bank download, Files, email attachment, or selected text.
6. **Statement PDF/text extraction:** later, local/on-device where feasible, always staged as low-confidence candidates. Never imply perfect OCR.
7. **CDR/Open Banking:** a future phase only through an appropriate Australian CDR pathway and privacy/security review.

YNAB recommends structured OFX/QFX ahead of CSV and supports multiple file types, but its file import is not available across all mobile surfaces. A truly mobile-first importer is therefore a meaningful DragonMode differentiator. [YNAB file import](https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo).

### The import pipeline

Every input should pass through a reversible staging pipeline:

1. **Preserve source:** store a local source hash, import batch ID, source name, imported time, and the unmodified raw row/text.
2. **Parse candidates:** date, amount, currency, direction, description, account hint, status, balance, reference, and structured transaction ID.
3. **Normalize carefully:** Unicode, whitespace, sign conventions, decimal separators, dates, time zones, debit/credit columns, and merchant text. Preserve the original beside the cleaned value.
4. **Resolve account:** use a remembered mapping where confidence is high; otherwise ask once for the batch.
5. **Classify transaction lifecycle:** pending, posted, removed/reversed, refund, transfer, or ordinary movement.
6. **Generate fingerprints:** stable provider ID when available; otherwise source hash plus occurrence-aware account/date/amount/reference fingerprints.
7. **Find relationships:** pending→posted replacement, refund→purchase, transfer pair, recurring series, or possible duplicate cluster.
8. **Suggest merchant/category:** apply transparent rules with a confidence level; do not bury original statement text.
9. **Reconcile:** if opening/closing balance or statement balance exists, show whether accepted candidates explain the change.
10. **Review:** auto-accept only high-confidence, non-destructive results; group medium-confidence questions; keep low-confidence rows in a clear inbox.
11. **Commit atomically:** one action adds the accepted batch and resulting account/chamber changes.
12. **Undo:** one action restores the exact pre-import state while preserving an audit note that the batch was undone.

### Confidence tiers

- **High confidence:** stable transaction ID already seen → skip as already imported; clear pending→posted link → replace pending; exact bank/account mapping → preselect; known merchant rule → apply visibly.
- **Medium confidence:** same amount/date and similar merchant; plausible transfer pair; ambiguous date order; likely recurring series; category suggestion. Show a grouped review card.
- **Low confidence:** missing amount/date, OCR ambiguity, balance row mistaken for a movement, foreign currency without rate, account unknown, or conflicting signs. Never commit silently.

The user should always be able to see **why** a decision was proposed.

### Duplicate sanity checks

Duplicate handling needs three distinct concepts:

1. **Already imported source row** — same stable ID/fingerprint from the same account and occurrence. Safe to skip automatically, while reporting the skip.
2. **Pending/posted replacement** — two lifecycle versions of the same movement. Merge/replace while keeping lineage.
3. **Possible real-world duplicate** — two charges that might both have occurred. Never auto-delete based only on merchant, amount, and date.

For the theme-park-pass example, the review should show two side-by-side cards and ask:

- **Both happened** — keep both and remember this pair is legitimate.
- **One is an echo** — choose the surviving movement; retain an audit link to the suppressed candidate.
- **They are pending/posted** — merge lifecycle versions.
- **Not sure yet** — keep both out of trusted totals or retain both with a visible “needs review” state, depending on account-reconciliation impact.

Important matching signals:

- same account;
- provider/stable ID and source occurrence;
- authorized date versus posted date;
- exact or near amount;
- normalized and original merchant;
- reference/memo/location;
- pending status;
- import batch overlap;
- whether both rows are required to reconcile the closing balance;
- whether a user previously marked the pair as legitimate.

Plaid’s official transaction model is a useful future reference: pending transactions may disappear and be replaced by a new posted transaction, and posted details can change. Its troubleshooting guidance explicitly warns that “duplicate” data may be accurate because the user was genuinely charged twice. [Transaction states](https://plaid.com/docs/transactions/transactions-data/) and [duplicate troubleshooting](https://plaid.com/docs/transactions/troubleshooting/).

### Trust surfaces

DragonMode should make data trust visible through:

- **Last confirmed balance** and date per account;
- **Imported through** date and source per account;
- **Ledger status:** Reconciled, Approximate, Needs review, or Stale;
- **Review Inbox:** a limited number of grouped decisions, not an endless raw list;
- **Import receipt:** added, matched, replaced, skipped, held for review, and balance difference;
- **One-tap undo** for the full batch;
- **Raw/original text** available from transaction detail;
- **Rule history:** “DragonMode renamed/categorized this because…”;
- **Estimate badge:** clearly separate estimated interest/dividends from posted transactions and confirmed balances.

## The healthy retention architecture

### Research principles

Gamification can improve motivation and adoption of personal-finance apps, but the quality of the motivational design matters. Research grounded in self-determination theory emphasizes autonomy, competence, and relatedness; superficial points/badges can lose effect after novelty wears off. Sources: [“Making finance fun”](https://www.sciencedirect.com/science/article/pii/S0265232321000235), [gamification and intrinsic motivation meta-analysis](https://link.springer.com/article/10.1007/s11423-023-10337-7), and [engagement systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376078/).

For DragonMode:

- **Autonomy:** every quest can be snoozed, dismissed, reduced, or replaced; story and seasons can be disabled; no one “correct” financial goal.
- **Competence:** show that the user made the ledger clearer, learned one concept, or checked an assumption—not that they became richer.
- **Relatedness:** dragon, pets, and companions remember choices and welcome returns, but never suffer because the user missed a visit.
- **Meaning:** game progress should correspond to a real stewardship action or an understood piece of information.

### Core loop

1. **Invitation:** “The Hoard Check is ready; it usually takes two minutes.”
2. **Arrival:** show one calm safety sentence before numbers.
3. **Automatic work:** parse new input, calculate estimated idle growth, update upcoming obligations, and group uncertainties.
4. **One meaningful choice:** review one possible echo, confirm one balance, categorize a cluster, or confirm “nothing changed.”
5. **Feedback:** show the practical effect—reconciled account, clearer Free Gold, updated projection, or verified recurring charge.
6. **Delight:** story beat, pet interaction, relic reveal progress, skin fragment, or map change.
7. **Contextual learning:** one 20–60 second Lore Card related to what just happened.
8. **Clean exit:** “The hoard is mapped through 20 July. Nothing else needs you.”

The clean exit is essential. Session length should not be a success KPI.

### Daily rhythm

Daily should be optional and tiny:

- idle estimate since the last confirmed snapshot;
- one glanceable safety state;
- up to one important review card;
- one pet/dragon interaction;
- a short story line or ambient change;
- a fixed, capped “return” reward after a meaningful check—not merely opening the app.

If there is no new financial information, the app should say so and finish. Do not manufacture chores.

### Weekly rhythm

Weekly should be the main habit:

- import or paste new movements;
- reconcile accounts or confirm approximate balances;
- review a maximum of three grouped uncertainties;
- see upcoming 14-day obligations and expected income;
- receive a weekly Living Atlas chapter;
- choose one “Keeper’s Focus” for the next week;
- unlock one collection/reveal opportunity;
- receive one contextual calculator or Lore Card.

### Pay-cycle rhythm

When income arrives or is manually confirmed:

- detect the arrival without assuming it is salary;
- update the next-payday projection;
- show what is already committed before the next checkpoint;
- let the user choose a story intention: protect, prepare, repay, enjoy, or decide later;
- never automatically move money or frame one choice as morally superior.

### Monthly rhythm

- “Close the Chronicle” review with reconciliation coverage, net cash flow, recurring changes, worth ratings, debt/savings estimates, and a gentle note about uncertainty;
- choose or refresh one scenario, rather than forcing a full budget rebuild;
- unlock an evergreen season chapter and cosmetic;
- archive the month as a permanent illustrated page;
- provide catch-up for missed weekly chapters.

### No punitive streaks

Use **return history**, **weekly coverage**, or **constellation completion** instead of a breakable daily streak. A missed day should leave space, not erase progress. Finch is a useful precedent because it describes consistency as gentle, offers repairs, allows goals to be paused/snoozed, and lets users opt out of seasonal events. [Finch new-user guide](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide), [goal controls](https://help.finchcare.com/hc/en-us/articles/37779940291213-Creating-and-Completing-Goals), [season overview](https://help.finchcare.com/hc/en-us/articles/37780438941965-Seasonal-Event-Overview).

## What to borrow from idle games

Idle games keep attention through visible accumulation, layered upgrades, collections, milestones, offline progress, and a satisfying return summary. Melvor Idle, for example, calculates what happened while the app was closed and presents a return summary; Cookie Clicker layers permanent upgrades, achievements, mini-games, collections, and a pet dragon. [Melvor offline progression](https://wiki.melvoridle.com/index.php?title=Beginners_Guide) and [Cookie Clicker](https://store.steampowered.com/app/1454400/Cookie_Clicker/).

Useful translations:

| Game pattern | DragonMode translation | Guardrail |
|---|---|---|
| Offline accumulation | Estimated interest/dividend “dreaming” since the last confirmed snapshot | Never change real balances; label assumptions and date range |
| Return summary | “While you were away” source breakdown and next promo/maturity event | No countdown pressure; no reward tied to wealth |
| Layered upgrades | Lair rooms, ambient effects, story tools, collection pages | Cosmetic only; never lock core finance functions |
| Permanent prestige | Relics and Chronicle pages for stewardship milestones | Never reset financial data or earned progress |
| Completion log | Lore, relic, skin, character-memory, and story collections | No social comparison; accessible archive |
| Milestone bursts | Reconcile a month, review first recurring item, finish first Lore set | Reward actions/clarity, not dollar thresholds alone |
| Seasonal variants | Rotating art, stories, companion dialogue, event quests | Archive and catch-up; no permanent FOMO |

### Idle Vault accuracy requirements

The existing system is a good prototype but should evolve from “current balance projected backward” toward a source-aware estimate.

Support these account-rate fields:

- base rate/APY;
- promotional/introductory rate;
- promotion start and end;
- bonus rate and its conditions (deposit amount, balance growth, transaction count, no withdrawals, age requirement, etc.);
- rate tiers and balance caps;
- interest payment frequency and expected next payment date;
- compounding method and day-count basis where known;
- term-deposit start, maturity, fixed rate, interest-at-maturity versus periodic interest, early withdrawal notice/penalty notes, and rollover preference;
- fees that reduce the estimate;
- “unknown” rather than assumed data.

Calculation behavior:

- use confirmed balance snapshots or daily transaction-derived balances over the elapsed interval where possible;
- split the interval at promotion boundaries and rate-change dates;
- show base interest, promotional uplift, and any unearned/uncertain bonus separately;
- never treat estimated interest as spendable until a real transaction is imported or recorded;
- compare estimate with the next posted interest transaction and let the user tune the account settings;
- cap the period and state the cap;
- avoid detailed dividend “accrual” unless holding dates, eligibility, payment information, and distributions are known; otherwise use a clearly labelled annual-yield illustration.

Moneysmart explains that compound interest earns interest on prior interest, that some term deposits use simple interest, and that savings accounts often include bonus or honeymoon conditions. It also warns that term deposits may require notice/penalties for early withdrawal and can automatically roll over at maturity. [Compound interest](https://moneysmart.gov.au/saving/compound-interest), [savings accounts](https://moneysmart.gov.au/banking/savings-accounts), [term deposits](https://moneysmart.gov.au/investments-paying-interest/term-deposits).

### Idle rewards should not scale with wealth

Keep the financial estimate and game reward separate:

- **Estimated growth:** the real-number illustration based on entered balances/rates.
- **Keeper reward:** a fixed reward for reviewing the estimate or confirming the account settings, capped per day/week.

Suggested rule: one Return Ember for a meaningful check-in, a second for reconciling or resolving an uncertainty, and a weekly Key for completing the weekly Chronicle. A user with $20 and a user with $200,000 can earn the same cosmetic progress from the same stewardship action.

## Ethical gacha and collection design

The target emotion is **anticipation and discovery**, not wagering.

### Recommended system: Relic Constellations

- Players earn **Lore Keys** from reconciliation, grouped-review completion, learning, and weekly reflections.
- A key reveals one cosmetic **Relic Memory**: dragon adornment, lair detail, character keepsake, story illustration, card border, ambient sound, or colourway.
- Nothing affects financial calculations, advice, feature access, or money movement.
- No key, currency, or random reveal can be purchased with real money.
- No ads grant pulls.
- Reveal rules and probabilities are always visible, even if stores do not require disclosure for earned-only items.
- A guaranteed-new-item counter is shown before the reveal.
- Duplicate protection prioritizes unseen items within the active set.
- After a set is complete, repeats turn into a deterministic crafting currency or user-selected recolour.
- Pull/reveal history is visible and exportable with the rest of the local vault.
- No near-miss animation, slot reels, casino sounds, paid ten-pulls, urgency pop-ups, or “limited offer” pricing.

### Suggested fairness rules

- 70% common, 22% uncommon, 7% rare, 1% mythic is a possible cosmetic distribution, but the exact values matter less than the guarantees.
- Every 5th reveal: guaranteed unseen item from the chosen set.
- Every 12th reveal: user chooses one of three unseen items.
- Mythic pity: no later than reveal 30, with the counter carrying across seasons.
- Completed sets become selectable in an evergreen archive.
- Seasonal sets enter the archive after a delay; none are permanently missable.
- Users may choose “Surprise me,” a target set, or fully deterministic “Craft next item.”

Genshin Impact’s guarantee system demonstrates how visible carry-over/guarantee status can reduce uncertainty, but DragonMode should go further with earned-only pulls, duplicate protection, and deterministic alternatives. [HoYoverse guarantee explanation](https://support.hoyoverse.com/hc/en-us/articles/50333940684953-How-does-the-Wish-guarantee-system-work).

### Why paid random rewards should be excluded

Loot-box spending has documented associations with problem gambling, and a systematic review found that limited-time availability and free giveaways can strengthen problematic relationships. [Systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8264989/) and [meta-analysis record](https://figshare.utas.edu.au/articles/journal_contribution/Meta-analysis_of_the_relationship_between_problem_gambling_excessive_gaming_and_loot_box_spending/22996898).

There are also product-policy and classification consequences:

- Apple requires odds disclosure for randomized virtual items offered for purchase. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Australia applies a minimum M classification to games with paid in-game purchases linked to chance, while simulated gambling is R18+. [Australian Classification](https://www.classification.gov.au/about-us/media-and-news/news/new-classifications-for-gambling-content-video-games).
- Google Play has special rules for randomized loyalty rewards and sensitive financial data. [Developer policy](https://support.google.com/googleplay/android-developer/answer/17190352) and [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).

The simplest, safest product rule is: **sell the app or a known subscription benefit if needed; never sell chance.**

## Story system

### Three narrative layers

1. **Evergreen main campaign — The Living Atlas**
   A permanent authored story unlocked by stewardship milestones. Progress is never time-limited and never depends on wealth.

2. **Personal Chronicle**
   Short procedural scenes generated from trusted events: first reconciled account, a possible echo resolved, a promotion ending, an irregular income arrival, a debt-plan update, a wish decision, or a return after absence. These scenes use facts without prescribing choices.

3. **Seasons — Sky Cycles**
   Eight-to-twelve-week themed arcs with art, ambient changes, optional quests, and cosmetic sets. The story remains available in an archive after the live period.

### Main campaign proposal

**Act I — The Vault Wakes**

1. The Sleeping Door — choose keeper, dragon, tone, and data mode.
2. Count the Treasure — add/import the first account and explain confirmed versus approximate balances.
3. Echoes in the Ledger — resolve the first duplicate/pending-posted pair; teach that two identical charges may both be real.
4. The Procession of Claimants — identify recurring costs and choose which deserve reminders.
5. Wake the Scrying Pool — show cash flow and uncertainty ranges.
6. The Chain in the Deep — compare debt paths without selecting one for the user.
7. The Sleeping Wish — make an informed purchase/saving/rest decision.
8. The Star Vault — learn how estimated interest differs from posted interest.
9. The Storm Map — reconcile a difficult month without losing progress.
10. The Keeper’s Constellation — open the evergreen collection and choose the next personal story focus.

### Seasonal event examples

- **Festival of Echoes:** import, duplicates, refunds, and transfers; culminates in restoring a broken archive mirror.
- **Tribute Moon:** recurring charges, annualized cost, usage, trials, and price changes; no assumption that cancellation is good.
- **Deep Vault Bloom:** savings interest, promotions, emergency buffers, term-deposit maturity, and compound-growth illustrations.
- **The Gentle Chainbreak:** debt education, repayment comparisons, minimum-payment effects, and support resources.
- **Quiet Skies:** a catch-up/rest season with no daily tasks and extra archive access.

### Character roles

Use the existing cast as stable educational voices:

- **Bramble:** records, provenance, reconciliation, and permanent memories;
- **Mara:** financial pressure, next-seven-days safety, debt, and support resources;
- **Sol:** long-range projections, uncertainty, savings growth, and term dates;
- **Pip:** variable/irregular income and pay-cycle chapters;
- **Asha:** goals, tools, subscriptions, and concrete next actions;
- **Kael:** scenarios, changing paths, and trade-offs;
- **Moss:** emotional safety, celebration, rest, and kind return messages.

Story choices should change dialogue, companions, artwork, and later callbacks—not financial outputs. When financial facts change, the story should acknowledge the change without implying causation it cannot prove.

## Education and auto-filled calculators

### Education model

Education should appear at the moment of relevance, in three depths:

- **One sentence:** a tooltip or result explanation.
- **One minute:** a Lore Card with a visual, plain-language example, and “show this with my numbers.”
- **Deep dive:** assumptions, formula, official source, edge cases, and what the calculator does not include.

Every card needs:

- fantasy title plus plain-language title;
- neutral factual explanation;
- the user’s relevant pre-filled values;
- editable assumptions;
- a model/estimate warning;
- official source and last-reviewed date;
- “This does not move money” and “This is not a recommendation” where relevant.

### Calculator backlog

1. **Idle interest since last confirmation** — balance snapshots, APY, compounding, promo boundaries.
2. **Next interest payment** — current settings, payment cadence, confirmed balance window.
3. **Promotion cliff** — promo end date, base rate afterward, optional user-entered future rate, difference over selected time.
4. **Savings goal path** — current linked/declared progress, target/date, rate, chosen contribution cadence.
5. **Emergency-buffer runway / Hibernation** — guarded funds and user-chosen essential/comfortable/current cost; no universal “correct” target.
6. **Term-deposit maturity** — principal, fixed rate, simple/compound method, payment timing, maturity, and optional early-withdrawal note.
7. **Credit-card minimum versus fixed payment** — balance, APR, minimum rule, fees if known, and no-further-spend assumption.
8. **Debt strategy comparison** — minimum, smallest-balance-first, highest-interest-first, custom, and extra-payment scenarios; compare time, estimated interest, and first victory.
9. **Wish impact** — Free Gold, buffer/runway change, linked goal delay, and credit-cost illustration if the user explicitly selects credit.
10. **Recurring-cost annualizer** — cadence, next charge, price history, trial/promotion end, and logged cost per use.
11. **Cash-flow runway to checkpoint** — actual cleared/pending balances, expected income reliability, known bills, and uncertainty range.
12. **Loan repayment** — principal, rate, term, fees, payment frequency, and optional rate-change scenario.
13. **Compound-interest explorer** — pre-filled current account values, with an educational comparison of rate, time, and contribution changes.
14. **Investment fee drag illustration** — only user-entered fee/rate assumptions; never recommend a product or allocation.

Moneysmart provides useful Australian precedents and assumptions for savings goals, compound interest, credit cards, loans, mortgages, and budgeting. Its calculators repeatedly state that they are models rather than predictions. [Moneysmart calculator hub](https://moneysmart.gov.au/), [savings-goals calculator](https://moneysmart.gov.au/saving/savings-goals-calculator), [credit-card calculator](https://moneysmart.gov.au/credit-cards/credit-card-calculator), and [calculator disclaimer](https://moneysmart.gov.au/about-us/disclaimer).

### Educational topics

- transaction account versus savings account;
- base, bonus, and honeymoon/promotional interest;
- simple versus compound interest;
- interest payment frequency versus compounding;
- rate tiers, caps, conditions, and fees;
- term deposits, maturity, notice, early-withdrawal penalties, and rollover;
- Australian Financial Claims Scheme coverage and the per-account-holder/per-ADI concept;
- cleared, pending, posted, reversed, refunded, and duplicated movements;
- transfers versus income/spending;
- committed money, sinking funds, emergency buffers, and cash-flow checkpoints;
- subscription annualization, trials, price changes, and cost per logged use;
- minimum debt repayments, smallest-balance and highest-interest approaches;
- fixed versus variable rates and scenario uncertainty;
- diversification, volatility, fees, yield, distributions, and why estimates are not guarantees;
- nominal versus real value and inflation;
- irregular income and reliability ranges;
- how to seek free financial counselling or urgent help when appropriate.

APRA states that the Financial Claims Scheme generally covers eligible Australian-dollar deposits up to $250,000 per account holder per ADI, with multiple brands potentially operating under one banking licence. This should be taught factually with a link to APRA’s current checker, not converted into a product recommendation. [APRA FCS overview](https://www.apra.gov.au/financial-claims-scheme-protecting-depositors-and-policyholders) and [covered ADIs](https://www.apra.gov.au/financial-claims-scheme/banks-building-societies-and-credit-unions/list-authorised-deposit-taking).

## “Not financial advice” boundary

A footer alone is not a product boundary. ASIC explains that factual information normally has no recommendation or opinion element, but even factual information may constitute financial product advice if its presentation is intended—or could reasonably appear intended—to influence a decision about a financial product. Digital advice can also create licensing obligations. [ASIC factual information/advice distinction](https://asic.gov.au/for-finance-professionals/afs-licensees/limited-afs-licensees/what-can-limited-afs-licensees-do/) and [RG 255 digital advice](https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-255-providing-digital-financial-product-advice-to-retail-clients/).

Product rules to reduce risk:

- describe and calculate; do not select a product, provider, fund, security, debt refinance, or repayment strategy for the user;
- say “Here is what this assumption changes,” not “You should do this”;
- present multiple user-chosen scenarios neutrally;
- show source data, formulas, assumptions, uncertainty, exclusions, and last-updated dates;
- never rank financial products using the user’s personal situation without legal/regulatory review;
- do not make investment allocation, tax, credit, or superannuation recommendations;
- make “estimate” visually persistent, not buried in fine print;
- separate game rewards from outcomes that could pressure a financial decision;
- link crisis/support resources when a user indicates hardship, without using fear or urgency as retention;
- obtain Australian financial-services legal review before moving from factual tracking/education into personalized recommendations.

Recommended calculator language:

> “This is an editable illustration based on the records and assumptions shown below. It is not a prediction or recommendation, and it does not account for every fee, tax, rate change, eligibility rule, or personal circumstance.”

## Privacy and future bank connectivity

For the near term, local statement import is aligned with the existing local-first promise. It should still include:

- on-device parsing by default;
- explicit disclosure before any content is sent off-device;
- no model training on financial data;
- encrypted device storage where platform capabilities allow;
- clear export, delete, reset, and backup consequences;
- data minimization and no advertising SDKs that observe financial screens;
- redaction in diagnostics and crash reports;
- a threat model for local files, clipboard contents, notifications, screenshots, backups, and logs.

If CDR/Open Banking is later added in Australia, do not ask users for bank passwords. The Australian Government’s CDR system is consent-based and data is shared with accredited providers; accredited recipients have strict privacy/security obligations. [How CDR works](https://www.cdr.gov.au/how-it-works), [provider obligations](https://www.cdr.gov.au/for-providers), and [OAIC privacy/security](https://www.oaic.gov.au/consumer-data-right/information-for-consumers/consumer-data-right-privacy-and-security).

## Recommended roadmap

### Phase 0 — Trust foundation

- import-batch and provenance model;
- universal paste;
- CSV import with mapping preview;
- OFX/QFX, then QIF;
- confidence tiers and grouped review queue;
- occurrence-aware fingerprints;
- pending→posted and transfer matching;
- duplicate sanity-check flow;
- statement reconciliation and last-confirmed balance;
- atomic commit and batch undo;
- no progression rewards for financial value.

### Phase 1 — The two-minute Hoard Check

- daily/weekly/pay-cycle check-in state machine;
- at most one daily and three weekly review decisions;
- calm safety summary and explicit “all clear” exit;
- fixed/capped return rewards;
- reconciliation coverage and import freshness;
- story hooks for trusted events;
- expose and apply lair/dragon skins.

### Phase 2 — Accurate estimates and contextual education

- balance snapshots for interest windows;
- bonus/tiered rates and promotion conditions;
- term deposits/maturity;
- estimate-versus-posted reconciliation;
- calculator framework with visible assumptions;
- Lore Card library with official sources and review dates;
- debt, savings, subscription, runway, and wish calculators.

### Phase 3 — Story and earned collection

- evergreen Act I;
- Personal Chronicle event templates;
- Relic Constellations;
- transparent earned-only reveal rules, duplicate protection, pity, history, and deterministic craft alternative;
- first archived season, Festival of Echoes;
- catch-up and no-FOMO policies.

### Phase 4 — Optional connectivity

- CDR pathway discovery with legal/privacy/security review;
- accredited intermediary or recipient model if appropriate;
- consent dashboard, deletion/de-identification obligations, sync lifecycle, and outage handling;
- connected data remains staged/reviewable rather than silently rewriting the ledger.

## Metrics and experiments

Measure whether DragonMode creates a **trusted, repeatable healthy check-in**, not whether it maximizes time spent.

Primary metrics:

- time from first input to first reconciled/confirmed account;
- import completion rate and median import-review time;
- percentage of imported rows accepted without later correction;
- false-positive duplicate suppression rate (target: effectively zero auto-deletions);
- percentage of possible duplicates resolved as “both happened”;
- weekly trusted-ledger coverage;
- review queue completion without abandonment;
- weekly return rate and pay-cycle return rate;
- calculator completion and assumption-inspection rate;
- story/season opt-in and disable rates;
- user-reported “I understand where I stand” and “the app did not judge me” scores;
- notification opt-out, uninstall-after-warning, and import-undo rates as safety indicators.

Do not optimize for:

- raw daily opens;
- longest session;
- number of transactions logged;
- most money saved/paid/invested as a universal comparison;
- pulls per user;
- notification clicks without a useful completed action;
- social wealth leaderboards.

Suggested experiments:

1. Review inbox versus raw transaction list: completion and correction rates.
2. One weekly chapter versus daily fragments: return without notification fatigue.
3. Fixed return reward versus interest-proportional shards: perceived fairness across balance ranges.
4. Guaranteed cosmetic choice every fifth reveal versus fully random: collection enjoyment and regret.
5. “All clear—leave” screen versus another suggested task: trust, return, and session satisfaction.
6. Original bank text always visible versus hidden behind cleaned merchant: correction time and confidence.
7. Three grouped questions versus ten individual questions: completion and overwhelm.

## Product principles to preserve

1. **Trust before delight.** If the totals are not credible, the fantasy collapses.
2. **Kindness is functional.** Shame increases avoidance; supportive clarity is part of the intervention.
3. **Reward stewardship, not wealth.** Never let balances determine status, character health, or collection pace.
4. **Uncertainty is a state, not an error.** Approximate, needs review, and unknown are legitimate outputs.
5. **Both can be true.** Identical transactions may both be real; the app asks rather than erases.
6. **No paid chance.** Sell known value, never random outcomes.
7. **No permanent FOMO.** Seasons are celebrations with archives and catch-up.
8. **No broken streaks.** Progress pauses; it does not shatter.
9. **Calculators expose assumptions.** Pre-fill aggressively, but make every important input editable and inspectable.
10. **A good session ends.** The app tells the user when nothing else needs them.

## Selected source index

### Finance products and import

- [YNAB file-based import](https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo)
- [YNAB matching and unmatching](https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i)
- [YNAB API occurrence-aware import IDs](https://api.ynab.com/v1)
- [Monarch manual import](https://help.monarch.com/hc/en-us/articles/4409682789908-Import-Transaction-Data-Manually-from-Banks-or-Other-Finance-Apps)
- [Monarch transaction rules](https://help.monarch.com/hc/en-us/articles/360048393372-Creating-transaction-rules)
- [Copilot dashboard and review queue](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview)
- [Rocket Money](https://www.rocketmoney.com/)
- [PocketSmith bank files](https://learn.pocketsmith.com/article/484-bank-files)
- [Quicken Simplifi Spending Plan](https://support.simplifi.quicken.com/en/articles/4212702-understanding-your-spending-plan)
- [Empower dashboard](https://support-personalwealth.empower.com/hc/en-us/articles/201169740-Dashboard-Overview)
- [Frollo app](https://frollo.com.au/frollo-app/)

### Transaction lifecycle, privacy, and regulation

- [Plaid transaction states](https://plaid.com/docs/transactions/transactions-data/)
- [Plaid duplicate troubleshooting](https://plaid.com/docs/transactions/troubleshooting/)
- [Australian Consumer Data Right](https://www.cdr.gov.au/how-it-works)
- [OAIC CDR privacy and security](https://www.oaic.gov.au/consumer-data-right/information-for-consumers/consumer-data-right-privacy-and-security)
- [ASIC factual information versus advice](https://asic.gov.au/for-finance-professionals/afs-licensees/limited-afs-licensees/what-can-limited-afs-licensees-do/)
- [ASIC digital advice RG 255](https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-255-providing-digital-financial-product-advice-to-retail-clients/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Australian gambling-like game classifications](https://www.classification.gov.au/about-us/media-and-news/news/new-classifications-for-gambling-content-video-games)

### Australian education

- [Moneysmart calculator hub](https://moneysmart.gov.au/)
- [Compound interest](https://moneysmart.gov.au/saving/compound-interest)
- [Savings accounts](https://moneysmart.gov.au/banking/savings-accounts)
- [Term deposits](https://moneysmart.gov.au/investments-paying-interest/term-deposits)
- [Savings goals calculator](https://moneysmart.gov.au/saving/savings-goals-calculator)
- [Credit-card calculator](https://moneysmart.gov.au/credit-cards/credit-card-calculator)
- [Debt repayment approaches](https://moneysmart.gov.au/credit-cards/pay-off-your-credit-card)
- [APRA Financial Claims Scheme](https://www.apra.gov.au/financial-claims-scheme-protecting-depositors-and-policyholders)

### Game and motivation patterns

- [Fortune City](https://play.google.com/store/apps/details?id=com.fourdesire.fortunecity)
- [Finch daily quests](https://help.finchcare.com/hc/en-us/articles/37943131828749-Daily-Quests)
- [Finch seasonal events](https://help.finchcare.com/hc/en-us/articles/37780438941965-Seasonal-Event-Overview)
- [Habitica](https://habitica.com/static/home)
- [Melvor Idle](https://wiki.melvoridle.com/index.php?title=Beginners_Guide)
- [Cookie Clicker](https://store.steampowered.com/app/1454400/Cookie_Clicker/)
- [Fortnite Battle Pass](https://www.epicgames.com/help/c-202300000001636/c-202300000001721/what-is-the-battle-pass-where-can-i-learn-more-a202300000013265)
- [HoYoverse Wish guarantee](https://support.hoyoverse.com/hc/en-us/articles/50333940684953-How-does-the-Wish-guarantee-system-work)

### Behavioral research

- [The Ostrich in Us](https://www.nber.org/papers/w23945)
- [Financial shame spirals](https://www.sciencedirect.com/science/article/pii/S0749597821000662)
- [Making finance fun](https://www.sciencedirect.com/science/article/pii/S0265232321000235)
- [Gamification and intrinsic motivation meta-analysis](https://link.springer.com/article/10.1007/s11423-023-10337-7)
- [Gamification engagement systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376078/)
- [Loot-box systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC8264989/)
