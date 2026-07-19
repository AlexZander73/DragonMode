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

The July visual-integration pass also establishes one shared rule for every
referenced and unreferenced view: environmental art is full-bleed or dissolved
into the screen; bounded cream panels are reserved for dense financial data.

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
- Story milestones open concise scenes but do not yet present a persistent user
  choice or supporting-character dialogue.
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
