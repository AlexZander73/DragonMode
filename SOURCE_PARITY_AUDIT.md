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

The optional Living Atlas campaign is implemented as a functional content
system, not a static mock-up. It records dated financial snapshots, compares
total assets less mapped debt over a user-selected interval, and opens rising,
steady, or sheltered routes. Ten authored, permanent Act I chapters are joined
by Personal Chronicle pages triggered only by confirmed or user-resolved
events. Story records its content ID, version, locale, trigger and local fact
references, supplies a plain accessibility summary and fallback, and can be
replayed, skipped, or disabled without blocking finance tools. Daily, weekly,
and pay-cycle rhythms are supported. Internal transfers remain excluded from
story cash-flow context, and setbacks never remove levels, XP, relics,
cosmetics, story history, or pet bonds.

The Living Atlas includes an illustrated expedition map, six selectable
fantasy keeper characters, reusable transparent character cutouts, three
direction-specific full-bleed environments, and a separate Idle Vault. Idle
Vault uses confirmed balance snapshots and cleared movements, splits at rate
and promotion boundaries, excludes unknown bonuses, compares posted interest
separately, and labels dividend yield as a non-spendable illustration. It never
modifies accounts, investment units, debt, transactions, tax records, XP, or
collection currency. Legacy Star Shards migrate one-for-one to cosmetic
Stardust but no new game currency scales with wealth.

Trusted Ledger capture now stages natural one-line entries, pasted bank rows,
CSV, OFX/QFX, and QIF before any state change. It preserves original rows,
source identity, occurrence, confidence, lifecycle lineage, mapping settings,
receipts, and exact undo. Similar movements are grouped for human review but
never silently deleted based on merchant/date/amount alone. Repeated sources,
pending-to-posted movements, reused IDs, manual matches, refunds, and paired
owned-account transfers have domain coverage.

The two-minute Hoard Check, thirteen-source Lore calculator library, declared
versus linked goal progress, independently configurable private reminders, and
earned-only Relic Constellations are also implemented. The collection shows
odds and guarantee counters, offers direct crafting, retains reveal history,
keeps seasons obtainable through an archive, and has no paid path or financial
effect. Owned dragon colours and Lair themes can be previewed before applying
and optionally rotated.

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

These are outside the completed July trust-and-engagement initiative:

- Future CDR/Open Banking connectivity still requires a separate legal,
  privacy, security, consent, and accreditation/intermediary decision. The
  current release intentionally requests no bank credentials.
- Wishes use the shared Wish Vault scene; per-wish photo import is not present.
- Debt comparison currently offers the implemented smallest-first,
  highest-interest-first, and minimum-payment paths; drag-reordering can be
  added later if real user demand justifies the extra control.
- Projection history does not yet offer an arbitrary custom date range.
- English is the only authored content locale even though currency, number, and
  date formatting are locale-aware.
- Automated accessibility contracts, notification routing, import fixtures,
  schema-v7 migration, backup round trips, unsigned iOS builds, and Simulator
  fresh-install/relaunch checks are now in the release gate. Physical-device
  VoiceOver, permission delivery, redacted provider-file, signed TestFlight,
  Android, and tablet certification remain release QA responsibilities.

## Optional inputs that would improve fidelity further

No new material is required to continue. The most useful optional inputs would
be higher-resolution original concept art, a preferred dragon age/personality,
and a decision on whether future art should lean brighter and toy-like or more
cinematic and painterly. The current canonical direction is bright cinematic
fantasy with readable game UI.
