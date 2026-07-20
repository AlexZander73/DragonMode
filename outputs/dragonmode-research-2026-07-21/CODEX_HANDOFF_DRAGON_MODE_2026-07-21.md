# Codex handoff — DragonMode completed build brief

> **Implementation status — completed 21 July 2026:** This document is retained as the source implementation brief. Its trust, Hoard Check, Idle Vault, Lore, story, collection, notification, skin, migration, and quality-gate work is now represented in the application and domain tests. See `IMPLEMENTATION_COMPLETION_2026-07-21.md` for the verified result and remaining release-only checks.

**Handoff date:** 21 July 2026
**Repository:** `/Users/azuredreams/Development/DragonMode`
**Purpose:** Historical implementation brief and traceability record for the completed DragonMode product phase.
**Research companion:** `DRAGON_MODE_PRODUCT_RESEARCH_2026-07-21.md`
**Important:** The detailed phases below describe the pre-implementation plan. They are retained for acceptance criteria and design rationale; the completion status above and `IMPLEMENTATION_COMPLETION_2026-07-21.md` are authoritative for current work.

## Product outcome

Turn the current visual-first fantasy finance MVP into a high-trust, enjoyable tracking habit where:

- a user can paste, share, or import financial data in almost any common bank-export form;
- DragonMode performs parsing, normalization, matching, categorization, and calculation work automatically;
- uncertain or destructive choices are staged for calm review;
- identical transactions are never silently removed merely because amount/date/merchant match;
- the user can reconcile accounts and undo an import;
- daily, weekly, pay-cycle, story, idle, seasonal, and collection systems reward stewardship and understanding;
- estimated interest/dividends remain estimates and never alter real balances;
- cosmetic progress does not scale with wealth;
- education and calculators are pre-filled from the user’s records and clearly presented as editable illustrations, not advice.

## Non-negotiable constraints

1. Preserve the current local-first release mode and no-account requirement.
2. Do not add bank credentials, screen scraping, trades, payments, product recommendations, or automatic money movement.
3. Do not silently delete, merge, overwrite, or replace financial records.
4. Do not reward larger balances, more spending, more debt, or financial-product decisions.
5. Do not use punitive streaks, pet harm, lost XP, lost relics, or permanently missable content.
6. Do not sell random rewards. No paid pulls, paid keys, loot boxes, ads-for-pulls, or casino presentation.
7. Keep fantasy terms paired with plain-language labels and accessible names.
8. Preserve reduced-motion, sound, haptics, font-scale, currency, locale, and plain-language behavior.
9. Calculators must show inputs, assumptions, exclusions, and estimate status. They must not imply a recommendation.
10. Any future CDR/Open Banking work requires a separate legal, privacy, security, and accreditation/intermediary decision.

## Historical pre-implementation baseline

### Existing before this initiative

- `app/data.ts` contains accounts, transactions, subscriptions, debts, wishes, goals, investments, pets, journey state, financial snapshots, idle rewards, XP, relics, cosmetics, base/promotional APY, and promotion dates.
- `app/ledger.ts` reconciles transactions across accounts/chambers and syncs investment-account balances.
- `app/calculations.ts` contains cash flow, categories, hibernation, subscription usage, quest generation, XP, debt strategies, projections, and search.
- `app/journey.ts` contains financial snapshots, income-source inference, idle estimates, and daily/weekly/pay-cycle story generation.
- `app/page.tsx` includes Lair, Hoard, Quests, Goals, Analytics, Tribute Hall, Investments, Flight Path, Wish Vault, Dragon, Debt, Legacy, Pets, Journey, Idle Vault, settings, onboarding, and record-editing flows.
- `app/storage.ts` persists local state in IndexedDB and normalizes migrations.
- JSON import/export exists in Settings.
- Current transaction duplicate/unusual state is user-set; there is no automatic import candidate engine.

### Historical gaps closed by this implementation

1. **Idle reward currency scales with estimated earnings.**
   In `app/journey.ts`, Star Shards are derived from estimated interest/dividends. Replace this relationship: financial estimates may scale with entered balances, but game progression must be fixed/capped by stewardship actions.

2. **Interest uses the current balance across the entire away interval.**
   This can be materially inaccurate when balances changed during the period. Introduce balance snapshots/daily derived balances and rate-period segments.

3. **Dividend estimate is a simple current-value × yield × time illustration.**
   Keep it clearly labelled as an illustration unless holding dates, eligibility, and distribution data are known. Do not call it accrued or earned cash.

4. **Goal progress can be increased manually and grant XP without linked money movement.**
   Keep manual progress as “declared/mapped,” introduce “linked/verified,” and prevent repeat XP farming from the same event/date.

5. **Progression milestones do not currently prevent duplicate XP awards.**
   Make reward events idempotent: the same event ID must not grant XP/currency twice.

6. **Story content is shallow/repeating.**
   The current three variants per direction are a good tone prototype, not a durable content engine.

7. **Source parity notes are stale in places.**
   Some documented gaps have since been implemented. Update documentation only after the feature work is verified.

## Historical build order used

Do not start with gacha or more screens. Build in this order:

1. import provenance and staging foundation;
2. universal paste and CSV;
3. matching, duplicates, transfers, reconciliation, and undo;
4. two-minute Hoard Check and reward fairness;
5. Idle Vault accuracy and account-rate depth;
6. calculator/Lore framework;
7. story engine and evergreen Act I;
8. earned Relic Constellations collection;
9. first archived season;
10. optional OFX/QFX/QIF refinements and future connectivity discovery.

# Phase 0 — Trusted capture and import

## 0.1 New domain concepts

Add domain entities/types for:

### Import batch

- id;
- source kind: paste, csv, ofx, qfx, qif, json-backup, shared-file, statement-text;
- source display name;
- source account hint;
- created/imported time;
- source hash;
- parser version;
- locale/date/sign settings used;
- raw row count;
- candidate count;
- added/matched/replaced/skipped/held counts;
- reconciliation result;
- status: staged, committed, undone, abandoned;
- pre-commit snapshot/reference sufficient for atomic undo;
- user-visible receipt.

### Imported candidate

- id and batch ID;
- raw source row/text;
- raw source row number;
- structured source transaction ID/reference if available;
- parsed and normalized date/authorized date/posted date;
- amount, currency, direction, status;
- original description and normalized merchant;
- account mapping;
- category suggestion;
- confidence per field and overall;
- lifecycle relationship: pending→posted, refund, reversal;
- transfer candidate relationship;
- duplicate cluster ID and reason signals;
- proposed action: add, match, replace pending, skip exact source, hold, ignore;
- user resolution and timestamp;
- committed transaction ID if accepted.

### Transaction provenance

Extend transactions with:

- origin: manual, import, connected, generated adjustment;
- import batch ID and candidate ID;
- original description/raw row reference;
- source transaction ID;
- source fingerprint and occurrence index;
- authorized date versus posted date;
- confidence/review state;
- match/replacement lineage;
- reconciliation ID;
- rule IDs applied.

### Balance confirmation / reconciliation

- account ID;
- statement/import batch ID;
- period start/end;
- opening balance if known;
- closing/statement balance;
- calculated movement delta;
- expected closing balance;
- difference/tolerance;
- included/excluded candidate IDs;
- status: reconciled, approximate, unresolved;
- confirmed time;
- note.

### Rules

Support transparent, editable rules for:

- original description/merchant match;
- rename merchant;
- set category;
- mark recurring/subscription;
- mark transfer counterpart/account;
- split transaction template later;
- include/exclude from cash flow/reporting;
- account/institution scope;
- rule priority and last-used timestamp.

## 0.2 Universal paste

Add a primary “Paste or import” action from Hoard and the first-run Setup Trail.

The same input should accept:

- one natural entry;
- several plain-text lines;
- tabular clipboard data;
- comma/semicolon/tab-separated values;
- copied bank transaction lines;
- a statement excerpt.

Behavior:

1. Parse into a preview without changing state.
2. Detect likely delimiter, header, date order, sign convention, and columns.
3. Show the exact interpreted fields for the first several rows.
4. Ask one batch-level question when possible, not one question per row.
5. Let the user correct mapping and save it as a named institution template.
6. Preserve the original input locally for audit/undo.
7. Commit only from the staged review.

Do not promise natural-language AI accuracy. Use “DragonMode found…” and confidence states.

## 0.3 CSV importer

Requirements:

- UTF-8 and common BOM/encoding handling;
- comma, semicolon, and tab delimiters;
- one amount column or debit/credit columns;
- several common date formats with explicit confirmation when ambiguous;
- parentheses and minus signs;
- separate currency column when present;
- header/no-header flows;
- skip totals/balance rows by rule, but show skipped rows in the receipt;
- duplicate header/footers across concatenated statement downloads;
- institution mapping templates stored locally;
- batch overlap detection;
- no destructive “replace date range” default.

## 0.4 OFX/QFX/QIF

After CSV is stable:

- prioritize OFX/QFX because structured IDs improve matching;
- use source FITID/reference where present;
- preserve account and currency metadata;
- treat missing/reused IDs defensively;
- add QIF with lower default confidence and extra sign/date review;
- retain the same staging, receipt, reconciliation, and undo UX.

## 0.5 Duplicate and matching engine

### Auto-safe actions

Only auto-skip or auto-replace when evidence is strong and reversible:

- same account + stable source ID/fingerprint + same occurrence already committed → skip as already imported;
- explicit pending ID/link to posted movement → replace pending while retaining lineage;
- exact prior candidate from the same batch/source hash → skip row duplicate and report it.

### Never auto-delete based only on

- same date;
- same amount;
- same merchant;
- same note;
- any combination of those fields without stable lifecycle/provenance evidence.

### Candidate cluster UI

For possible duplicates, show side-by-side:

- account;
- original and cleaned merchant;
- amount;
- authorized/posted date;
- status;
- source/batch;
- reference/memo;
- effect on statement reconciliation;
- reason DragonMode grouped them.

Actions:

- **Both happened**;
- **One is an echo** (choose survivor);
- **Pending became posted**;
- **Not sure yet**;
- **Never group this pattern** where safe;
- **Remember this merchant/reference distinction**.

Use an occurrence index so two real same-day/same-amount items remain distinct.

### Required test fixture

Include at least:

- two theme-park passes for two people, same merchant/date/amount/account — both retained;
- one manual movement matched to one import movement;
- pending restaurant authorization replaced by posted amount including tip;
- hotel/fuel authorization hold that disappears;
- identical file imported twice;
- overlapping files;
- two accounts with the same charge;
- refund with same absolute amount;
- same merchant/amount on recurring months;
- transfer represented on both accounts;
- bank changing merchant/date formatting after posting.

## 0.6 Transfers

- Detect likely transfer pairs only when opposite directions, amounts/currencies, dates, and mapped accounts support the relationship.
- Ask the user to confirm first-time account pairs.
- Remember confirmed pair rules.
- One logical transfer should update both account registers without counting as spending or income.
- Importing the second side later must match rather than duplicate the transfer.

## 0.7 Reconciliation

Every account should display:

- current mapped balance;
- last confirmed balance and date;
- imported-through date;
- ledger status: Reconciled, Approximate, Needs review, Stale;
- unresolved difference if any.

If statement opening/closing balance is available:

- calculate whether accepted movements explain the difference;
- show held candidates that could resolve it;
- never create a hidden plug adjustment;
- allow an explicitly labelled user adjustment with note/provenance only when the user chooses;
- keep the result in reconciliation history.

## 0.8 Atomic commit and undo

- A staged batch changes nothing until committed.
- Commit accepted candidates, lifecycle replacements, transfer links, account/chamber changes, quests, and provenance atomically.
- Generate a receipt.
- “Undo import” restores the exact pre-batch financial state.
- Preserve a non-financial audit record that the batch was undone.
- Re-importing the same file must explain why rows are skipped/matched.

## Phase 0 acceptance criteria

- The theme-park test retains both real charges.
- Re-importing the same file adds zero new movements and reports every skip.
- Pending→posted does not double-count.
- A transfer imported from two accounts counts once as a logical transfer and zero in income/spending.
- Ambiguous date/sign mapping cannot commit without confirmation.
- Every committed imported transaction can open its original source/provenance.
- Every batch has a receipt and can be undone.
- Reconciliation difference is visible and never silently plugged.
- No import action grants XP/cosmetic currency based on number or value of transactions.

# Phase 1 — Two-minute Hoard Check

## 1.1 Check-in state machine

Create a session summary that determines whether the user needs:

- nothing;
- one urgent/high-value review;
- a weekly grouped review;
- a pay-cycle reflection;
- a monthly Chronicle close.

Order:

1. warm return/idle summary;
2. safety state and “mapped through” date;
3. maximum one daily review card;
4. optional pet/dragon interaction;
5. optional story fragment;
6. clean exit.

If nothing needs review, show:

> “The hoard is mapped through [date]. Nothing else needs you.”

Do not generate filler dailies.

## 1.2 Daily/weekly/pay-cycle/monthly

### Daily

- optional;
- estimated idle growth since last confirmed snapshot;
- at most one important uncertainty;
- one ambient/pet interaction;
- fixed/capped return reward only after a meaningful check.

### Weekly (primary loop)

- import/paste opportunity;
- reconciliation coverage;
- maximum three grouped uncertainties;
- next 14 days of bills and expected income;
- Keeper’s Focus choice;
- one Living Atlas chapter;
- one Lore Key;
- one relevant Lore Card/calculator suggestion.

### Pay-cycle

- detect/confirm expected income;
- show committed amount until next checkpoint;
- let the user choose protect/prepare/repay/enjoy/decide later as a story intention;
- no automatic allocation or value judgement.

### Monthly

- Chronicle close;
- reconciliation coverage and unresolved items;
- cash flow and recurring-cost change;
- goal/debt/savings illustrations;
- one scenario refresh;
- permanent illustrated archive page;
- catch-up for missed story content.

## 1.3 Reward fairness

Replace interest-proportional Star Shards.

Suggested earned currencies:

- **Return Embers:** fixed, capped reward for a meaningful check-in;
- **Lore Keys:** weekly/reconciliation/learning milestones that open cosmetic memories;
- **Stardust:** duplicates after collection protection, used deterministically.

Example earning policy:

- meaningful daily check: 1 Ember, max 1/day;
- resolve one important uncertainty: 1 Ember, max 1/day;
- weekly review: 1 Lore Key, max 1/week;
- monthly Chronicle: 1 Lore Key plus fixed cosmetic/story reward;
- completing a Lore topic: fixed one-time reward;
- no currency for opening alone, balance size, transaction count, spending, debt size, or choosing a product/strategy.

All reward events need unique event IDs and idempotency.

## 1.4 Return history, not streaks

- Show a constellation/calendar of check-ins without “broken” states.
- Track rolling weekly coverage or “weeks mapped,” not consecutive daily perfection.
- Absence pauses progress.
- Returning gives a warm recap and catch-up path.
- No streak-repair sales or loss-framed notifications.

## Phase 1 acceptance criteria

- A no-change day can finish in under 30 seconds.
- A normal weekly review can finish in about two minutes.
- No session presents more than one daily or three weekly review decisions.
- Missing any number of days removes nothing.
- A user with a small balance earns cosmetic progress at the same rate as a user with a large balance for the same actions.
- Reward event replay/re-render cannot double-award.

# Phase 2 — Idle Vault and account-rate depth

## 2.1 Data model additions

For deposit accounts, support optional:

- base APY/rate;
- promotional APY/rate, start, end;
- bonus APY/rate;
- bonus conditions and whether currently met/unknown;
- balance tiers and caps;
- interest calculation/compounding frequency;
- interest payment frequency;
- next expected interest date;
- rate-effective history;
- fees;
- day-count basis if known;
- user/source confirmation date;
- confidence/unknown state.

For term deposits:

- principal/opening balance;
- start and maturity dates;
- fixed rate;
- simple/compound;
- interest payment at maturity or periodic;
- early withdrawal notice days;
- early withdrawal penalty note;
- rollover preference/unknown;
- maturity reminder.

For investments:

- distinguish confirmed unit price, market reference price, and manually entered value;
- cost basis, fee rate, risk label as originally specified;
- distribution/yield illustration assumptions;
- never treat the trailing yield illustration as a confirmed future payment.

## 2.2 Calculation behavior

- Store balance snapshots on confirmation/import/reconciliation.
- Derive daily balances from trusted transactions between snapshots when possible.
- Split calculations at rate changes, promotion start/end, tier crossings, and known balance changes.
- Show base amount, promotional uplift, and uncertain bonus separately.
- Use “estimated since [date]” and source-specific rows.
- Reconcile the estimate when a real interest transaction posts.
- Never add estimates to account balances, cash flow, tax data, debt, or transactions.
- Keep the current one-year cap unless deliberately changed and always show it.

## 2.3 Idle return presentation

Return panel:

- time away;
- each account/source;
- estimated base interest;
- estimated promo uplift;
- bonus eligibility unknown/earned/missed;
- dividend-yield illustration separated from cash interest;
- assumptions and last-confirmed balance/date;
- next promotion/maturity/payment event;
- “Review rates” action;
- fixed Keeper reward unrelated to total.

## Phase 2 acceptance criteria

- Promotion end halfway through an away period uses two rates.
- A balance change halfway through the period does not use the final balance retroactively.
- Unknown bonus conditions are not assumed earned.
- Term-deposit simple-interest and periodic compound examples are distinct.
- Real imported interest can be compared with, but never duplicates, the estimate.
- Dividend illustration never appears as spendable cash.

# Phase 3 — Education and calculators

## 3.1 Reusable calculator framework

Every calculator must provide:

- pre-filled inputs from state;
- source/confirmation date per input;
- editable overrides scoped to the scenario;
- visible assumptions;
- formula/explanation view;
- low/base/high or alternate scenarios where appropriate;
- exclusions;
- model/estimate warning;
- official source link and content-review date;
- no state mutation unless the user explicitly saves assumptions;
- no recommendation language.

## 3.2 First calculators

Build in this order:

1. next-checkpoint cash flow;
2. idle/next interest and promotion cliff;
3. savings goal path;
4. hibernation/emergency runway;
5. credit-card minimum versus fixed payment;
6. debt strategy comparison;
7. term-deposit maturity;
8. recurring annualized/cost-per-use;
9. Wish impact;
10. compound-interest explorer;
11. loan repayment and rate-change scenario;
12. investment fee-drag illustration.

## 3.3 Auto-fill policy

- Fill 99% of available values from accounts, debts, subscriptions, goals, transactions, and profile assumptions.
- Show where each value came from.
- Use unknown instead of generic defaults for material financial inputs.
- If a default is educational rather than user-sourced, label it clearly and do not save silently.
- Let the user switch account/debt/goal without re-entering fields.
- Offer “Use latest statement,” “Use last confirmed,” and “Enter a scenario” where relevant.

## 3.4 Lore Cards

Each card includes:

- fantasy title;
- plain title;
- 1–3 sentence explanation;
- one visual/example;
- “show with my numbers” action;
- source and last-reviewed date;
- related calculator;
- never one prescribed action.

Initial Lore sets:

- Trusted Ledger;
- Savings and Interest;
- Term Deposits;
- Debt and Repayment;
- Bills and Subscriptions;
- Goals and Buffers;
- Projections and Uncertainty;
- Investments, Fees, and Distributions;
- Financial Support and Counselling.

## 3.5 Advice boundary

Use wording such as:

> “This is an editable illustration based on the records and assumptions shown. It is not a prediction or recommendation.”

Avoid:

- “best account/fund/strategy for you”;
- “you should choose”;
- personalized product/provider ranking;
- buy/sell/hold/switch language;
- tax, credit, superannuation, or investment recommendations.

Add a compliance/content review checkpoint before release.

# Phase 4 — Story expansion

## 4.1 Narrative architecture

Implement three layers:

### Evergreen Living Atlas campaign

Authored, permanent, milestone-unlocked, replayable. Never time-limited.

### Personal Chronicle

Short templates driven by trusted events, not raw unverified numbers. Each scene records the facts it used and must degrade gracefully if facts later change.

### Sky Cycle seasons

Eight-to-twelve-week optional themes. Live presentation rotates, but chapters and cosmetics enter an archive/catch-up path.

## 4.2 Evergreen Act I

Build these chapters:

1. **The Sleeping Door** — keeper/dragon/data-mode choices.
2. **Count the Treasure** — first account/import; confirmed versus approximate.
3. **Echoes in the Ledger** — first duplicate/pending-posted review.
4. **Procession of Claimants** — recurring costs and reminder choices.
5. **Wake the Scrying Pool** — cash flow and uncertainty.
6. **The Chain in the Deep** — neutral debt comparison.
7. **The Sleeping Wish** — considered choice, any outcome valid.
8. **The Star Vault** — estimated versus posted interest.
9. **The Storm Map** — difficult month/reconciliation; progress remains.
10. **The Keeper’s Constellation** — collection reveal and next focus.

## 4.3 Personal Chronicle triggers

Use verified or user-confirmed events:

- first import;
- first reconciled account/month;
- legitimate same-price pair confirmed;
- pending→posted resolved;
- refund resolved;
- first recurring-cost review;
- price/trial/promotion change;
- first verified interest payment compared with estimate;
- irregular income arrival or missed expectation;
- goal created/paused/changed/completed;
- debt-plan comparison or payment;
- Wish claimed/saved/released/extended;
- return after 7/30/90+ days;
- all-clear week;
- unresolved/storm week.

Do not generate causal claims such as “your net worth rose because…” unless the data directly supports them.

## 4.4 Character ownership

- Bramble: imports, provenance, reconciliation, memories.
- Mara: pressure, next-seven-days safety, debt, support.
- Sol: projections, rates, term dates, long horizons.
- Pip: irregular income and pay cycles.
- Asha: goals, recurring costs, small concrete actions.
- Kael: scenarios and changing paths.
- Moss: emotional safety, return, celebration, rest.

## 4.5 Choice effects

Choices may alter:

- later dialogue callbacks;
- preferred companion;
- artwork and ambient effects;
- order of optional Lore Cards;
- cosmetic set target;
- story tone.

Choices must not:

- change financial numbers;
- automatically select a debt/investment/savings product or strategy;
- lock core features;
- remove access or progress.

## 4.6 Content system

- Separate authored copy from business calculations.
- Add content IDs, version, locale, triggers, required facts, fallback copy, choices, callbacks, accessibility summary, source links for educational claims, and review date.
- Prevent the same scene variant from repeating too soon.
- Let users replay, skip, disable, or switch to plain summary.
- Never block finance tasks behind story completion.

# Phase 5 — Relic Constellations (ethical gacha)

## 5.1 Collection contents

Cosmetic only:

- dragon colours/adornments;
- lair backgrounds, banners, lights, nests, weather, ambient effects;
- companion keepsakes;
- story illustrations;
- card frames and icon treatments;
- optional soundscapes;
- Chronicle page decorations.

Do not attach calculation advantages, interest multipliers, financial rewards, or core feature access.

## 5.2 Currency

- Lore Keys: earned, never purchased.
- Stardust: duplicate conversion/crafting, never purchased.
- Existing Star Shards may be migrated to a fixed legacy cosmetic balance, but stop generating them from interest amount.

## 5.3 Reveal modes

Offer all three:

1. **Surprise reveal** — transparent random cosmetic.
2. **Target a set** — random within a chosen collection.
3. **Craft next item** — fully deterministic alternative using accumulated Stardust/Keys.

## 5.4 Fairness

- Show probabilities before reveal.
- Store full local reveal history.
- Show guaranteed-new and mythic counters.
- Carry counters across seasons.
- Prioritize unseen items.
- Every 5th reveal guarantees unseen from target set.
- Every 12th lets the user choose one of three unseen items.
- Mythic guaranteed by reveal 30 (or a similarly explicit fixed ceiling).
- After a set is complete, duplicates become deterministic crafting currency.
- No near-miss visuals or false rarity cues.

## 5.5 Season policy

- Live season set may be featured, not permanently exclusive.
- After the live window, content enters an archive after a disclosed delay.
- Catch-up path uses ordinary earned currency.
- No expiring paid currency, countdown sales, or missed-day penalties.
- Users can disable seasonal banners and still use the app fully.

## 5.6 First season: Festival of Echoes

Theme: a mirror archive is repeating records and confusing pending/posted memories.

Chapters:

1. A Second Footstep;
2. The Mirror Ledger;
3. Two Tickets at Moonfair (the legitimate identical-charge lesson);
4. The Vanishing Hold;
5. The River Between Vaults (transfers);
6. Ink That Remembers (provenance);
7. The Balanced Bell (reconciliation);
8. The Restored Archive.

Event quests are normal useful tasks:

- import a file;
- inspect original statement text;
- resolve a grouped candidate;
- confirm both identical movements;
- reconcile an account;
- read one Trusted Ledger Lore Card.

Every quest is optional, dismissible, replayable through the archive, and not required for finance features.

## Phase 5 acceptance criteria

- No purchase path reaches randomized content.
- A user can select a deterministic collection path.
- Reveal odds, guarantee counters, and history are visible.
- Duplicate protection works.
- Season content remains obtainable later.
- No cosmetic affects financial outcomes.
- Missing the entire season harms nothing.

# Phase 6 — Notifications and skins

## Notifications

Add separately configurable categories for:

- import/reconciliation reminder;
- expected-income review;
- suspected duplicate/important uncertainty;
- story chapter;
- weekly/monthly review;
- promotion/maturity date;
- existing claimant, wish, pet, and price-change categories.

Defaults:

- no generic daily engagement notification;
- high-value/user-requested only;
- quiet hours and cadence;
- every notification opens directly to the useful action;
- no guilt, countdown pressure, pet distress, or reward loss.

## Skins

- Expose current selected dragon colour and lair theme.
- Preview before applying.
- Apply consistently to Lair, story, idle, collection, and key navigation accents without reducing readability.
- Keep dense financial cards stable and accessible.
- Allow random rotation from owned skins if desired.
- Cosmetics remain available after financial setbacks.

# Tests and quality gates

## Financial correctness

- Ledger totals reconcile after create/edit/delete/import/undo.
- Transfers never count as income/spending.
- Pending→posted replacement is correct.
- Duplicate cluster actions are reversible.
- Import repeated twice is idempotent.
- Reward events are idempotent.
- Interest splits correctly across balance/rate/promo boundaries.
- Estimate never changes real balances.
- Debt calculators handle zero rate, zero extra payment, minimum below interest, and payoff caps.
- Calculator formulas and assumptions are visible and tested.

## Data migration

- Existing schema v7 local vaults migrate without losing records, story, pets, relics, settings, or estimates.
- Existing Star Shards migration is disclosed and preserves perceived earned value.
- New optional fields default to unknown, not invented values.
- Undo/migration/backups are tested on iOS, Android, and web/PWA targets.

## Accessibility

- All import confidence/ledger states use text and icons, not colour alone.
- Duplicate comparison works with screen readers and large text.
- Charts have text summaries.
- Reveal animations respect reduced motion and can be skipped.
- Fantasy terms have plain-language equivalents.
- Minimum tap targets and focus order remain correct.

## Privacy/security

- Imported source data remains local in release mode.
- No financial data appears in logs, analytics, crash metadata, notification bodies, or screenshots without explicit design review.
- Clipboard contents are read only after a user action and are not retained beyond the staged source policy.
- Files are parsed defensively with size/count limits.
- Export/delete/reset cover new import, reconciliation, rule, and collection data.
- Privacy summary and store declarations are updated after behavior is final.

## Product success metrics

Instrument locally or privacy-safely only after a separate analytics decision.

Track:

- time to first confirmed/reconciled account;
- import completion and undo;
- later corrections to auto-decisions;
- false duplicate suppressions (target zero);
- “both happened” resolutions;
- weekly ledger coverage;
- weekly and pay-cycle returns;
- review abandonment;
- calculator assumption viewing;
- story/season opt-in and disable;
- user-reported understanding, trust, and lack of judgement.

Do not optimize session duration, transaction count, notification clicks, balance growth, pulls, or wealth rankings.

# Concrete first implementation slice

The first shippable slice should contain only:

1. import batch/provenance types and migration;
2. universal paste and CSV preview;
3. date/sign/account mapping;
4. exact source re-import skip;
5. possible duplicate cluster with **Both happened / One is an echo / Not sure**;
6. atomic commit, receipt, and undo;
7. last-confirmed balance and reconciliation status;
8. one Hoard Check summary;
9. fixed reward for completing the check;
10. tests for duplicate theme-park passes, repeated file, pending→posted, and transfers.

Do not include the full story season or Relic Constellations in this first slice. Add one Festival of Echoes teaser scene only after the financial flow is correct.

# Definition of done for the broader initiative

The initiative is complete when a user can:

1. paste or import their bank data on a phone without pre-formatting it;
2. understand exactly what DragonMode interpreted;
3. keep two legitimate identical charges;
4. safely match/merge only when evidence supports it;
5. reconcile and undo;
6. finish a useful daily glance in under 30 seconds and a normal weekly review in about two minutes;
7. receive a fair idle estimate across promotions/rate periods without balance mutation;
8. open an auto-filled calculator and inspect every assumption;
9. progress an evergreen story and cosmetic collection through stewardship, not wealth;
10. miss days or seasons without losing anything;
11. see clear factual-information/estimate boundaries throughout;
12. leave the app feeling informed, supported, and unjudged.
