# Dragon Hoard Finance App
## Codex-Ready Mobile MVP Product, UX, Visual, Narrative, and Technical Specification

## 1. Final app name

# **Dragon Mode**

**Primary tagline:** *Protect your hoard. Rest easier.*

Dragon Mode is the final product name. It intentionally connects to Goblin Mode while establishing a distinct financial fantasy: the user enters “Dragon Mode” to understand, protect, organize, and grow their hoard without shame or panic.

Keep the app name in one constants/configuration file, but all MVP UI, metadata, sample copy, package names, and documentation should use **Dragon Mode**.

---

# 2. Product vision

Dragon Mode is a visual-first, fantasy-finance mobile app in which the user is the keeper of a dragon and its hoard. Their real finances become a bright, colorful fantasy world containing treasury chambers, quests, recurring claimants, treasure streams, debts represented as chains, savings represented as protected vaults, and investments represented as sleeping treasure that grows over time.

The product must be useful enough to become a genuine financial-management tool while feeling approachable enough that users who normally avoid finance apps are willing to return.

The experience should never feel like a banking dashboard with fantasy wallpaper placed over it. The game language, visuals, animation, character reactions, educational content, and interaction design must all translate financial concepts into the fantasy.

The primary emotional promise is:

> “Your hoard can be understood. You are not in trouble for being imperfect. We will take one useful step at a time.”

The app is not about maximizing wealth at the cost of life. It is about helping the user:

- understand where their money is;
- see what is already committed;
- notice subscriptions, fees, and unusual charges;
- plan purchases without shame;
- build buffers and longer-term security;
- track debts and investments;
- learn financial concepts in small, friendly pieces;
- feel rewarded for returning and paying attention;
- retain hope even when finances worsen.

The dragon is not a health meter that becomes sick when the user is poor. The dragon represents stewardship, awareness, and progress. A low-income user who is actively engaging should feel just as successful as a wealthier user.

---

# 3. Absolute product priorities

## 3.1 Visual first

Visual quality is the primary product goal.

Every major feature should be understood visually before the user reads a paragraph. The interface should use:

- large illustrated hero areas;
- distinct color-coded sections;
- expressive dragon poses;
- treasure, crystal, vault, chain, relic, and map metaphors;
- bold game-style panels;
- large tappable controls;
- motion and celebration;
- compact text;
- progressive disclosure for detail.

The approved reference image establishes the direction:

- bright, colorful, energetic game UI;
- bold navy foundations;
- saturated section colors;
- cream content cards for readability;
- beveled or layered panels;
- strong icons;
- large headings;
- character art integrated directly into utility screens;
- high contrast without becoming visually noisy;
- playful console-game menu energy without copying any specific game, logo, icon, layout, or proprietary visual element.

The UI must not become a generic dark fantasy dashboard. It should feel fun, contemporary, and inviting.

## 3.2 Mobile app MVP only

The MVP target is a mobile app built as a static HTML/CSS/JavaScript application wrapped with Capacitor.

During MVP implementation:

- optimize only for phone portrait layouts;
- prioritize iPhone and Android phone viewport sizes;
- do not build a desktop dashboard;
- do not build a responsive public website;
- do not build tablet-specific layouts;
- do not build a backend;
- do not add live bank integrations;
- do not build platform-specific native UI;
- do not create multiple navigation paradigms.

The architecture should remain platform-agnostic enough that the same static app can later be hosted as a web app, but no effort should be spent polishing that experience during MVP.

## 3.3 Friendly, educational, and non-punishing

The app may warn the user, but it must never scold them.

Never use:

- “You failed.”
- “Bad spending.”
- “You broke your streak.”
- “You are behind.”
- “Your dragon is starving.”
- “You wasted money.”
- destructive red full-screen panic states for normal overspending;
- wealth comparisons against other users.

Prefer:

- “This month changed course.”
- “The hoard is tighter than expected, but there are options.”
- “One claimant deserves another look.”
- “A smaller quest may be enough today.”
- “Nothing here is irreversible.”
- “Your dragon is still with you.”
- “Let us protect what remains and plan the next step.”

Red is reserved for concrete, time-sensitive risk such as a payment that may overdraw an account, a suspected duplicate, an unexpected price rise, or a payment due before expected income.

---

# 4. Technical direction

## 4.1 Stack

Build the MVP as:

- static HTML;
- modern CSS;
- vanilla JavaScript or TypeScript;
- Capacitor wrapper;
- local-first data persistence;
- no server requirement;
- no account requirement;
- no cloud dependency.

A lightweight component approach is acceptable, but avoid a heavy framework unless it materially speeds development. The final output should remain inspectable, easy to modify, and hostable as static files.

Suggested structure:

```text
/
  index.html
  /src
    app.js
    router.js
    state.js
    storage.js
    calculations.js
    seed-data.js
    constants.js
    /screens
    /components
    /services
    /styles
  /assets
    /images
    /icons
    /audio
  capacitor.config.ts
```

## 4.2 Local data

Use IndexedDB for structured app data. A small library may be used if it avoids significant boilerplate, but the data model must remain simple and exportable.

Provide:

- automatic local save;
- manual JSON export;
- manual JSON import;
- reset-demo-data action;
- seeded demo mode;
- clear indication that MVP data is stored on device;
- graceful handling of schema migration.

Do not place important financial data only in localStorage.

## 4.3 Architecture principle

Separate:

1. financial data;
2. derived financial calculations;
3. quest rules;
4. narrative/story rules;
5. presentation state;
6. cosmetic progression.

This allows later replacement of manual data with imported or connected financial sources without rebuilding the interface.

---

# 5. Core data model

The MVP should support the following entities.

## User profile

- id
- displayName
- preferredCurrency
- locale
- payday cadence
- onboardingComplete
- selectedDragon
- selectedLairTheme
- reducedMotion
- soundEnabled
- notificationPreferences
- tutorialChapter
- createdAt
- updatedAt

## Account

- id
- name
- type: cash, transaction, savings, credit, loan, investment, asset
- institutionName
- currentBalance
- availableBalance
- creditLimit
- interestRate
- includedInHoard
- chamberId
- icon
- color
- archived

## Transaction

- id
- accountId
- date
- merchant
- amount
- direction: income or expense
- categoryId
- recurringSeriesId
- note
- status: pending or cleared
- unusualFlag
- duplicateFlag
- worthRating
- createdManually

## Category / Treasury chamber

- id
- name
- fantasyName
- practicalName
- icon
- color
- monthlyTarget
- type: essential, flexible, savings, investment, debt, recurring, goal
- sortOrder

Default chambers:

- The Hearth — essentials and everyday living
- Deep Vault — emergency savings
- Workshop — projects, tools, learning, business
- The Roost — fun, comfort, hobbies, lifestyle
- Long Sleep — investments and retirement
- Tribute Hall — bills and subscriptions
- Wish Vault — planned future purchases

## Recurring claimant / subscription

- id
- merchant
- displayName
- amount
- cadence
- nextChargeDate
- categoryId
- active
- trialEndDate
- priceHistory
- usageTrackingMode
- usageCountCurrentPeriod
- lastUsedAt
- typicalUseFrequency
- userValueRating
- cancellationNotes
- reminderDays
- detectedOrManual

## Subscription usage event

- id
- subscriptionId
- usedAt
- quantity
- source: manual, shortcut, timer, inferred
- note

## Goal

- id
- name
- targetAmount
- currentAmount
- targetDate
- chamberId
- priority
- status
- visualRelicId

## Purchase rest / wish

- id
- name
- price
- image
- dateAdded
- restUntil
- targetFundingSource
- impactSummary
- decision: pending, purchased, released, extended
- finalWorthRating

## Debt claim

- id
- accountId
- principal
- interestRate
- minimumPayment
- paymentCadence
- nextPaymentDate
- strategyOrder
- targetExtraPayment

## Investment position

For MVP this may be manually tracked:

- id
- name
- type
- value
- contributions
- costBasis
- feeRate
- riskLabel
- lastUpdatedAt

## Quest

- id
- type
- title
- description
- reason
- difficulty
- estimatedMinutes
- rewardXP
- rewardCosmetic
- relatedEntityId
- generatedAt
- expiresAt
- completedAt
- dismissedAt
- snoozedUntil

## Story state

- chapterId
- sceneId
- unlockedScenes
- choiceFlags
- lastPresentedAt

## Progression

- xp
- level
- title
- unlockedRelics
- unlockedDragonCosmetics
- unlockedLairCosmetics
- milestoneHistory

## Pet

Potential add-on data model, not required for first implementation:

- id
- species
- name
- visualStage
- careCadence
- lastInteraction
- mood
- unlockedCosmetics

---

# 6. Navigation and global interaction

Use a persistent five-tab bottom navigation:

1. **Lair**
2. **Hoard**
3. **Quests**
4. **Scrying**
5. **Treasury**

The approved screen references occasionally use the same labels differently. Standardize them consistently in the built app.

Recommended mapping:

- Lair: home, dragon status, immediate events
- Hoard: accounts, chambers, balances, transactions
- Quests: generated actions, goals, Dragon’s Rest, story tasks
- Scrying: analytics and projections
- Treasury: subscriptions, debts, investments, income, settings

Screens such as Dragon’s Legacy may be opened from the profile/level badge or Lair rather than occupying a permanent tab.

All tabs should preserve scroll position.

Global top-bar behavior:

- screen icon;
- title;
- optional one-line subtitle;
- notification bell where relevant;
- profile/dragon badge;
- no hamburger menu unless a secondary drawer is genuinely necessary.

---

# 7. Screen 1: Lair — Home

## Purpose

The Lair is the emotional and practical center of the app. It should answer:

- Is my hoard safe?
- What is my usable money?
- What is already committed?
- Is anything happening soon?
- Does something require attention?
- Can I close the app and rest?

## Visual structure

Top to bottom:

1. colored screen header;
2. safety-status banner;
3. large dragon illustration in the current lair;
4. total hoard value;
5. four compact summary cards;
6. upcoming events;
7. one primary recommendation or “all clear” state;
8. bottom navigation.

The dragon art must occupy meaningful space. It is not a tiny mascot in a corner.

## Summary metrics

Show:

- Available
- Committed
- Guarded
- Invested

Definitions must be accessible by tapping each metric.

**Available:** liquid money visible now.

**Committed:** money needed for known bills and planned obligations before the next chosen checkpoint.

**Guarded:** savings and emergency funds intentionally protected.

**Invested:** long-term investment value.

The app should additionally calculate **Free Gold**, even if it appears in a secondary card:

> Available money minus committed near-term costs and user-defined minimum buffer.

## Safety states

### Deep Rest

Everything expected is covered, no unusual activity.

### Content

Normal activity, no action required.

### Watchful

A price change, due bill, low buffer, or unusual transaction deserves awareness.

### Guarding

A likely duplicate, potential overdraft, missed income, or urgent bill requires action.

The dragon changes pose, expression, small effects, and banner color. The dragon never appears injured or abandoned.

## Upcoming events

Examples:

- subscription renewal;
- electricity bill;
- payday;
- debt payment;
- goal checkpoint;
- trial ending;
- annual fee;
- expected invoice.

Each item opens a detail sheet.

## Home-screen educational behavior

Only teach one concept at a time. Example:

> “Committed Gold is money still in your account that already has a job.”

Include “Got it” and “Learn more.” Do not force a lesson before the user can use the app.

---

# 8. Screen 2: Hoard — Treasury Chambers

## Purpose

The Hoard screen organizes all money into understandable purposes.

It is not merely an account list. It should visually answer where the treasure lives and what role it serves.

## Main layout

- total hoard value;
- horizontal filters: Chambers, Accounts, Transactions;
- large colored chamber cards;
- amount and percentage per chamber;
- expandable details;
- add or reorganize treasure button.

## Chamber behavior

Each chamber card shows:

- icon;
- fantasy name;
- plain-language subtitle;
- current amount;
- target or expected amount;
- trend arrow;
- status;
- tap affordance.

On open, show:

- included accounts;
- recent transactions;
- monthly inflow/outflow;
- goal status;
- educational explanation;
- edit chamber.

## Transactions

MVP should allow:

- manual transaction entry;
- editing;
- categorization;
- search;
- filter by date, account, category, recurring status;
- mark as subscription;
- mark unusual;
- add note;
- rate “Worth the Gold?” later.

## Visual principle

Chambers should feel like colored selections on a game menu, not spreadsheet rows. The underlying detail may use compact lists, but each chamber needs a strong identity.

---

# 9. Screen 3: Quest Board

## Purpose

The Quest Board turns financial maintenance into a small number of manageable, useful actions.

The app must not dump every possible task on the user.

## Quest categories

- **All**
- **Guard** — prevent loss, review anomalies, catch fees
- **Grow** — savings, investments, debt reduction, income
- **Learn** — short educational quests
- **Tend** — organize transactions, update accounts, confirm details

## Quest generation

Generate no more than three prominently recommended quests at once. Additional quests can appear in a secondary list.

Possible triggers:

- suspected unusual charge;
- subscription unused beyond threshold;
- subscription price increase;
- trial nearing renewal;
- uncategorized purchases;
- low emergency buffer;
- missed expected income;
- goal within reach;
- debt milestone;
- upcoming annual bill;
- spending category changed materially;
- projection no longer matches plan;
- stale manually tracked investment value.

## Quest card anatomy

- illustrated item or icon;
- title;
- one-sentence reason;
- estimated time;
- XP or cosmetic reward;
- progress where applicable;
- large “Go” button;
- snooze;
- dismiss with reason.

## Non-punishing behavior

Ignored quests do not become failures. They may reappear later if still relevant.

Do not create daily streak pressure.

Completion should trigger:

- brief animation;
- XP increase;
- dragon reaction;
- optional one-sentence education;
- next recommended action only when appropriate.

## Example subscription quest

**Unused Claimant**

> “You have not logged a use of Crunchyroll in 45 days. It renews in five days.”

Actions:

- I used it recently
- Log a use
- Review subscription
- Remind me later
- Keep without reminders

The app must not assume the subscription is unused merely because no usage was logged. Wording should be precise:

> “No use has been logged recently.”

If an external usage source is added in the future, it can distinguish inferred usage from manual tracking.

---

# 10. Screen 4: Tribute Hall — Subscriptions and recurring costs

## Purpose

The Tribute Hall makes recurring charges visible, understandable, and reviewable without treating all subscriptions as bad.

## Main list

Each claimant card shows:

- service icon;
- name;
- current amount;
- cadence;
- next charge;
- last logged use;
- price-change indicator;
- status;
- tap to open.

Header shows:

- total monthly tribute;
- annualized total;
- number of active claimants;
- renewals in next seven days.

## Subscription details

Show:

- current price;
- annual cost;
- price history;
- next billing date;
- category;
- payment account;
- trial information;
- usage history;
- estimated cost per use;
- user’s value rating;
- notes;
- cancellation instructions;
- reminder settings.

## Usage tracking system

This is an important MVP feature.

Users need a very low-friction way to record use. Support:

### Manual quick log

A prominent “Used today” button on the subscription detail card.

### Adjustable quantity

For things like gym visits, classes, cloud renders, deliveries, or cinema passes.

### Home-screen shortcut

Optional shortcut card for frequently tracked subscriptions.

### Notification action

A scheduled friendly check-in may ask:

> “Did you use your gym membership this week?”

The user can answer directly where Capacitor notification actions permit it. Otherwise, tapping opens the quick-log sheet.

### Usage cadence

Users choose:

- track every use;
- weekly “used or not” check;
- monthly review only;
- do not track usage.

### Cost-per-use

Calculate:

> amount charged in current evaluation period / logged uses in the same period.

Clearly label it as based on logged usage.

### Quest thresholds

Allow default and custom rules:

- no logged use for 14 days;
- no logged use for 30 days;
- no logged use since last renewal;
- cost per logged use exceeds chosen amount;
- price increased;
- trial ends soon.

The user can disable these quests per subscription.

## Subscription education

Small optional cards can explain:

- annualized cost;
- trial conversion;
- overlapping services;
- price increases;
- sunk-cost thinking;
- why low usage does not automatically mean cancellation is right.

---

# 11. Screen 5: Scrying Pool — Analytics

## Purpose

The Scrying Pool helps users understand patterns without requiring financial expertise.

## Tabs

- Overview
- Spending
- Income
- Trends

## Overview

Show:

- monthly inflow;
- monthly outflow;
- net change;
- category donut;
- top categories;
- meaningful insights;
- hibernation estimate;
- recent changes.

## Insights

Insights should be plain, specific, and neutral.

Good examples:

- “Dining spending is 18% higher than your recent three-month average.”
- “Most of the increase came from two weekend purchases.”
- “Your recurring costs rose by $8 this month.”
- “You marked 82% of Roost spending as worth the gold.”
- “Income was lower, but essential costs remained covered.”

Avoid vague AI-style statements.

## Worth the Gold

The app should periodically invite the user to rate selected purchases:

- Absolutely
- Mostly
- Neutral
- Probably not
- Regret it

Do not ask after every purchase.

Use this to distinguish high-value discretionary spending from low-satisfaction spending.

Possible insight:

> “Your hobby purchases are expensive but consistently rated worthwhile. Small convenience purchases are more often regretted.”

This feature is educational, not moralizing.

## Hibernation estimate

Calculate three modes:

- Essential
- Comfortable
- Current lifestyle

Formula must be inspectable in a details sheet. It is an estimate, not financial advice.

Example:

> “At your current liquid reserves and comfortable monthly cost, the hoard could sustain the lair for approximately 4.6 months.”

---

# 12. Screen 6: Flight Path — Projections

## Purpose

Flight Path shows where the user may be heading and allows calm scenario comparison.

## Time ranges

- next payday;
- one month;
- three months;
- six months;
- one year;
- custom.

## Scenario paths

- Current Flight
- Cautious
- Treasure Hunt
- Resting

### Current Flight

Uses recent income and spending assumptions.

### Cautious

Reduces selected flexible expenses.

### Treasure Hunt

Adds a user-defined income increase.

### Resting

Models reduced income or time away from work.

## Projection visualization

Use a clear line chart with:

- projected range;
- key milestones;
- bill events;
- goal events;
- uncertainty explanation;
- tap points for detail.

Do not suggest false precision. Prefer ranges.

## Scenario editor

Users can change:

- expected income;
- essential spending;
- flexible spending;
- subscription changes;
- debt payments;
- savings contributions;
- investment contributions;
- one-off purchases.

## Educational role

This screen should teach cause and effect:

> “Cancelling this subscription changes the one-year projection by $180, but it does not materially change your hibernation period.”

> “An extra $50 per week reaches the Deep Vault target approximately six weeks earlier.”

---

# 13. Screen 7: Dragon’s Rest — Wish Vault

## Purpose

Dragon’s Rest creates a satisfying pause between desire and purchase without forbidding the purchase.

## Add a wish

User enters:

- item;
- price;
- image;
- category;
- desired purchase date;
- rest period;
- funding source;
- why they want it.

## Rest options

- one night;
- three days;
- one week;
- until payday;
- custom.

## Impact card

Show:

- whether it fits within Free Gold;
- which goal it delays;
- effect on hibernation;
- debt impact if purchased on credit;
- how long it would take to save;
- whether a similar purchase was previously rated worthwhile.

## End-of-rest choices

- Claim Treasure
- Rest Longer
- Save Toward It
- Release

Purchasing is a valid successful outcome if it is informed.

## Visual behavior

The wished-for item is shown in a dramatic treasure frame. The dragon rests nearby. A timer should feel ceremonial, not restrictive.

## Quest and story integration

Completing a rest period may unlock:

- patience XP;
- a short dragon reaction;
- a story scene;
- a relic after a major thoughtful purchase;
- no reward difference based solely on buying or not buying.

The reward is for making a considered choice.

---

# 14. Screen 8: The Dragon — Status

## Purpose

The Dragon Status screen explains why the dragon is in its current state and strengthens the emotional bond.

## Main content

- large dragon illustration;
- current state;
- one-line interpretation;
- reasons;
- recommended response;
- cosmetic access;
- recent reactions.

## State reasons

Examples:

- expense increased;
- bill higher than normal;
- subscription returns soon;
- unusual charge;
- buffer improved;
- goal reached;
- debt reduced;
- no action needed.

## Tone

The dragon is alert, curious, calm, proud, playful, or sleepy. Never sick because the user has less money.

When finances slide backward:

> “The path narrowed, but it did not close.”

> “The dragon has guarded harder seasons before.”

> “We protect the next seven days first. The distant mountain can wait.”

Offer one small stabilizing quest rather than a list of failures.

## Customization

Potentially unlock:

- scale colors;
- horns;
- armour;
- scarves;
- sleeping nests;
- lair banners;
- treasure effects;
- idle animations.

Cosmetics should primarily reflect engagement and milestones, not spending money in the real world.

---

# 15. Screen 9: Debt Chamber — Claims on the Hoard

## Purpose

Debt is shown as a manageable claim against part of the hoard, not a moral failure.

## Overview

Show:

- total debt;
- monthly minimum payments;
- average interest;
- payoff projection;
- next victory;
- chains visually weakening as progress occurs.

## Debt cards

Each card shows:

- debt name;
- balance;
- interest rate;
- minimum payment;
- next due date;
- progress;
- open details.

## Strategies

Allow comparison of:

- minimum payments;
- smallest balance first;
- highest interest first;
- custom order;
- extra payment amount.

Do not present one strategy as universally correct.

## Next Victory

Always provide a reachable milestone:

- next $100 paid;
- balance below a round number;
- one card cleared;
- interest under a threshold;
- first on-time month;
- first extra payment.

## Regression behavior

If debt rises, do not erase previous relics, XP, or titles.

Show:

> “A new claim was added to the hoard. Your past victories still count.”

Then offer:

- understand what changed;
- update the plan;
- temporarily reduce the goal;
- create one stabilizing quest.

---

# 16. Screen 10: Dragon’s Legacy — Progression

## Purpose

Progression turns real financial care into a long-running visual journey.

## Level design

XP comes from stewardship actions:

- reviewing;
- categorizing;
- learning;
- completing useful quests;
- building buffers;
- logging subscription use;
- making considered purchase decisions;
- reaching goals;
- paying debt;
- updating plans after setbacks.

XP must not be awarded simply for possessing more money.

## Level rewards

- titles;
- relics;
- dragon cosmetics;
- lair upgrades;
- new story scenes;
- visual effects;
- pet unlocks;
- new map regions.

## Relics

Relics commemorate meaningful moments:

- first buffer;
- first subscription reviewed;
- first debt cleared;
- first projection;
- first month of complete tracking;
- thoughtful major purchase;
- recovery after a difficult month;
- long-term contribution milestone.

Relics are permanent. They are never removed when balances later fall.

## Story milestones

Every few levels, trigger a visual-novel-style scene with:

- illustrated background;
- dragon portrait;
- one or two supporting fantasy characters if desired;
- concise dialogue;
- a user choice;
- celebratory reveal;
- no branching complexity required for MVP.

---

# 17. Narrative tutorial

## Tutorial goal

Teach the app through a story rather than a sequence of sterile popups.

The user should be able to skip, replay, or move quickly.

## Premise

The user inherits a neglected sky-vault and awakens a young guardian dragon. The vault is not empty, but its chambers are disorganized, claimants arrive without explanation, old chains cross the deeper rooms, and the Scrying Pool has gone dark.

The dragon does not know the user’s financial situation. Together they map the hoard.

## Chapter 1: The Awakening

- choose dragon appearance;
- choose user name or keeper title;
- learn that the dragon reflects stewardship, not wealth;
- create or select demo financial data.

## Chapter 2: Count the Treasure

- add the first account;
- explain Available, Committed, Guarded, and Invested;
- reveal the main Lair screen.

## Chapter 3: Open the Chambers

- assign money or transactions to the Hearth, Roost, Deep Vault, and other chambers;
- complete the first categorization quest.

## Chapter 4: The First Claimant

- add or discover a subscription;
- choose how to track its usage;
- log first use;
- explain annual cost and renewal.

## Chapter 5: Wake the Scrying Pool

- view first monthly summary;
- teach that projections are estimates;
- reveal hibernation.

## Chapter 6: The Sleeping Wish

- add a desired purchase;
- choose a rest period;
- explain informed spending.

## Chapter 7: The Chain in the Deep

Only shown if the user adds debt. Teach claims without shame.

## Chapter 8: The First Relic

Reward onboarding completion with a permanent relic and first lair customization.

## Tutorial writing principles

- scenes under 45 seconds;
- dialogue skippable;
- no childish baby talk;
- fantasy language accompanied by plain meaning;
- never block core app access;
- choices may personalize tone but do not need complex branching.

---

# 18. Pets add-on

Pets are a future enhancement, not required for the core MVP.

They can support different healthy check-in cadences without punishing the user.

Examples:

- daily sprite that enjoys a quick interaction;
- weekly pet that brings a summary scroll;
- monthly guardian that appears for the Hoard Review.

Important constraints:

- pets never become ill from missed app visits;
- no irreversible neglect;
- no guilt notifications;
- returning users receive a warm reunion;
- pet progression can pause but never regress.

Possible pet functions:

- subscription usage reminder;
- weekly transaction review;
- monthly reflection;
- goal celebration;
- educational tip delivery.

---

# 19. Notification philosophy

Notifications should be sparse and valuable.

Allowed categories:

- bill due soon;
- trial ending;
- subscription price increased;
- purchase rest completed;
- user-requested subscription usage check;
- expected income missing;
- suspected duplicate;
- weekly or monthly review;
- story chapter unlocked.

Do not send generic daily engagement notifications by default.

Good copy:

> “A claimant returns in three days. Review the tribute?”

> “Your resting wish is ready for a decision.”

> “No gym use has been logged this week. Log one, skip, or pause these checks.”

> “The hoard review is ready. It usually takes two minutes.”

---

# 20. Education system

Education should be contextual.

Create short “Lore Cards” that explain:

- committed money;
- emergency buffers;
- annualized subscription cost;
- cost per use;
- credit interest;
- minimum payments;
- diversification;
- investment fees;
- projection uncertainty;
- needs versus priorities;
- income volatility;
- sinking funds.

Each Lore Card includes:

- fantasy title;
- plain-language explanation;
- one visual;
- one example;
- optional “show me in my hoard” action.

Avoid presenting personalized investing, tax, legal, or credit instructions as professional advice.

---

# 21. Visual system

## Foundation

- deep navy and near-black for structural backgrounds;
- bright blue for Lair and calm safety;
- green for Hoard and growth;
- purple for Quests and magic;
- red/magenta for Tribute Hall and claimants;
- cyan for Scrying;
- pink for Dragon’s Rest;
- orange/gold for Debt Chamber;
- royal violet for Legacy.

Green should be used as one accent among many, not as a global tint.

## Cards

Two main card styles:

1. dark saturated game panels for summaries and hero sections;
2. warm cream cards for dense lists and readable task content.

## Typography

Use a highly readable rounded or geometric sans-serif for body text. A fantasy display face may be used only for major titles, provided it remains legible.

## Icons

Use a consistent custom icon family inspired by:

- shield;
- coin;
- crystal;
- vault;
- flame;
- scroll;
- telescope or orb;
- chain;
- crown;
- key;
- chest;
- dragon eye.

Do not use icons or silhouettes traceable to an existing game franchise.

## Motion

Recommended:

- panel entrance snaps;
- coin counters;
- dragon idle motion;
- quest stamp;
- crystal burst;
- chain crack;
- map path draw;
- relic reveal;
- soft card bounce;
- tab highlight sweep.

Respect reduced-motion settings.

## Sound

Optional and off or subtle by default:

- soft coin;
- page flip;
- crystal chime;
- dragon purr or breath;
- chain break;
- relic flourish.

No casino sounds, slot-machine rhythms, or manipulative reward loops.

---

# 22. Accessibility

Required:

- sufficient text contrast;
- text scaling;
- semantic labels;
- screen-reader descriptions for visual states;
- color never used as sole status indicator;
- reduced motion;
- mute controls;
- minimum 44px tap targets;
- large-number formatting;
- currency and locale support;
- plain-language mode for fantasy terminology;
- charts with accessible data summaries.

Every fantasy label should have a practical subtitle or accessible name.

Example:

> “Deep Vault — Emergency savings”

---

# 23. MVP implementation phases

## Phase 1: Visual shell

- Capacitor project;
- mobile portrait layout;
- five-tab navigation;
- all ten reference screens represented;
- reusable panel/card components;
- seeded demo data;
- no calculations beyond display.

## Phase 2: Core financial data

- accounts;
- balances;
- transactions;
- chambers;
- local persistence;
- import/export;
- calculated Available, Committed, Guarded, Invested, and Free Gold.

## Phase 3: Recurring costs and usage

- manual subscriptions;
- renewal dates;
- usage logging;
- cost per logged use;
- price history;
- usage-based quest rules;
- reminders.

## Phase 4: Quests and analytics

- quest engine;
- categorization quests;
- anomaly flags;
- spending summaries;
- hibernation;
- Worth the Gold;
- basic projections.

## Phase 5: Gamification and story

- XP and levels;
- relics;
- dragon states;
- visual-novel tutorial;
- milestone scenes;
- cosmetic unlock framework.

## Phase 6: polish

- animation;
- sound;
- accessibility;
- onboarding skip/replay;
- empty states;
- error states;
- reduced-motion mode;
- installable builds.

---

# 24. Explicit MVP exclusions

Do not implement these during the first MVP:

- bank API connections;
- open banking;
- automatic merchant account login;
- investment trading;
- financial-product recommendations;
- tax filing;
- credit-score integration;
- multiplayer;
- shared household synchronization;
- cloud accounts;
- desktop dashboard;
- tablet redesign;
- public marketing website;
- complex branching story;
- live AI assistant;
- monetization;
- pet system beyond optional placeholder;
- marketplace;
- social leaderboards.

Build hooks and clean models where reasonable, but do not let future scope delay the mobile visual experience.

---

# 25. Seeded demo content

The app should launch into a compelling demo state for development and screenshots.

Use fictional values and services. Do not use real brand logos in production assets unless legally appropriate. Replace reference-image examples with fictional claimant names such as:

- Streamkeep
- Songbird Plus
- CloudQuill
- EmberGym
- Scrollbox
- Moonlit Cinema

Seed:

- six treasury chambers;
- five subscriptions;
- three debts;
- fifteen transactions;
- four quests;
- one Wish Vault item;
- three projections;
- level 8 progression;
- five relics;
- one price increase;
- one unused-subscription example;
- one unusual charge;
- one upcoming payday.

---

# 26. Acceptance criteria

The MVP is successful when:

1. It launches as a working Capacitor mobile app.
2. It visually resembles the approved bright, colorful game-style reference.
3. All ten concept areas exist and are navigable.
4. Users can manually create and edit financial data.
5. Data persists locally.
6. Users can add subscriptions and log usage.
7. Lack of logged usage can generate a precisely worded review quest.
8. Users can see core analytics and hibernation.
9. Users can create a rested purchase.
10. Users can complete quests and gain permanent progression.
11. A story tutorial guides first use.
12. Negative financial movement produces supportive, actionable copy rather than punishment.
13. The app remains readable and accessible despite the decorative interface.
14. No desktop or public-site work distracts from the app MVP.
15. All domain logic is separated sufficiently for future bank imports or static-web deployment.

---

# 27. Final product statement

**Dragon Mode** is a visual-first fantasy finance app that turns accounts, expenses, subscriptions, purchases, debts, savings, investments, analytics, and projections into a colorful dragon-hoard adventure.

The user does not come to the app to be judged. They come to understand the hoard, protect what matters, make informed choices, and grow a permanent visual legacy. The dragon rests when the hoard is safe, becomes watchful when something deserves attention, and never abandons the user when the path becomes difficult.

The mobile Capacitor app is the only MVP target. Build the full visual experience first, support it with useful local financial tools, and preserve a clean static architecture for possible web deployment later.
