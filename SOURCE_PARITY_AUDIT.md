# Dragon Mode source-parity audit

This document distinguishes the product specification from the inconsistent
307–308 × 512 concept screenshots.

## Design authority

Use the references for:

- section palettes and emotional tone;
- large environmental artwork and character scale;
- cream task/list surfaces inside saturated fantasy worlds;
- game-like headers, icons, controls, and progression language;
- the relative importance of each screen's information.

Do not reproduce:

- conflicting or missing bottom-navigation destinations;
- incorrect active-tab states;
- cropped content that only fits the small concept canvas;
- real brand marks or claimant names;
- decorative labels that contradict the product specification;
- controls that appear actionable but have no complete interaction.

The built app therefore uses one canonical five-tab navigation system and lets
its content scroll on real phone sizes.

## Current parity

The MVP currently includes all ten concept areas, local IndexedDB persistence,
manual account and transaction management, subscription usage and reminders,
quests, analytics, projections, Dragon's Rest, debts, investments, XP,
permanent relics, accessibility preferences, JSON import/export, and a native
Capacitor shell.

The companion add-on is also implemented. Cinder, Quill, and Luna use daily,
weekly, and monthly care rhythms respectively; care and bond state persist, and
missing a visit never removes progress or harms a companion. Financial progress
now advances permanent keeper levels and opens illustrated, choice-based story
scenes. Both celebration and setback stories resolve with specific, hopeful
next steps and can be revisited.

The optional Living Atlas campaign is implemented as a functional system, not
a static mock-up. It records dated financial snapshots, compares total assets
less mapped debt over a user-selected interval, and opens rising, steady, or
sheltered routes. Daily, weekly, and pay-cycle story rhythms are supported;
each generated visual-novel chapter offers a choice and a small, dismissible
real-world quest. Salary, contract, commission, business, interest, dividend,
gift, and other income streams have editable cadence and reliability. Internal
transfers are excluded from story cash-flow context. Setbacks can redirect the
road but never remove levels, XP, relics, cosmetics, story history, or pet
bonds.

The Living Atlas includes a twelve-point illustrated expedition map, six
selectable fantasy keeper characters, reusable transparent character cutouts,
three direction-specific full-bleed environments, and a separate Idle Vault.
Idle rewards estimate savings interest and investment dividends since the last
open, award display-only Star Shards, and never modify accounts, investment
units, debt, transactions, or tax records. Savings APY, compounding, promotion
dates, investment symbols, trailing dividend yields, and dividend cadence are
editable.

Optional market reference data is isolated behind a server-side Alpha Vantage
adapter. Only a validated saved symbol is sent to the provider. Refreshes are
throttled to a user-selected interval (24 hours to 14 days), default to
end-of-day data, and preserve the manual value on every provider or network
failure. The app never scrapes Google Finance, exposes the provider key, places
trades, or treats a quote as financial advice.

The July visual-integration pass also establishes one shared rule for every
referenced and unreferenced view: environmental art is full-bleed or dissolved
into the screen; bounded cream panels are reserved for dense financial data.
Empty vertical space on modern phones is filled with environmental texture,
overlapping character silhouettes, small rune/stat clusters, or continued
content—not extra generic boxes. The full character cast is also available as
transparent cutouts for reuse and restrained motion.

## Remaining product-spec gaps

These are functional depth gaps, not missing reference screens:

- Goals do not yet exist as a first-class create/edit entity separate from
  chamber targets and resting wishes.
- The eight tutorial chapters are narrative cards rather than guided tasks that
  require adding an account, categorising a movement, or logging claimant use.
- Tutorial naming, keeper-title, dragon-appearance, and story choices are not
  yet collected as interactive onboarding choices.
- The saved lair-theme field is not yet exposed as a visual customisation
  control.
- Wishes use the shared Wish Vault scene; per-wish photo import is not present.
- Debt “custom order” can be selected but debts cannot yet be reordered.
- Investment records do not yet expose fee rate, risk label, and cost basis as
  separate editable fields.
- Projection controls do not yet expose savings and investment contributions as
  independent scenario sliders, and there is no arbitrary custom date range.
- Lore coverage is representative rather than complete for every topic listed
  in the source document.
- Notification categories cover claimant, wish, price-change, and review flows;
  expected-income, duplicate-charge, and story-unlock schedules are not yet
  independently configurable.

## Optional inputs that would improve fidelity further

No new material is required to continue. The most useful optional inputs would
be higher-resolution original concept art, a preferred dragon age/personality,
and a decision on whether future art should lean brighter and toy-like or more
cinematic and painterly. The current canonical direction is bright cinematic
fantasy with readable game UI.
