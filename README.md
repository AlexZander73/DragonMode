# Dragon Mode

**Protect your hoard. Rest easier.**

Dragon Mode is a visual-first fantasy finance mobile MVP. It turns accounts, spending, recurring costs, savings, projections, purchase decisions, debt, and financial maintenance into a bright dragon-hoard adventure without shame or punishment.

## Included MVP

- Ten navigable reference areas across one consistent five-tab mobile bar.
- Seeded demo hoard with chambers, accounts, transactions, claimants, debts, investments, quests, resting wishes, progression, and relics.
- Full add/edit/archive/delete flows for chambers, transactions, accounts, subscriptions, debts, wishes, and manually tracked investments.
- IndexedDB persistence with JSON import/export and demo reset.
- Billing-period subscription usage, weekly through annual cadences, reminders, price history, and cost-per-use calculations.
- Rules-driven unusual, duplicate, categorisation, subscription, buffer, debt, and projection quests with permanent XP progression.
- Live cash-flow analytics, hibernation modes, six-month trends, and editable multi-path projections.
- Debt strategy comparison and next-victory milestones.
- Eight-chapter skippable tutorial plus reduced-motion, Dynamic Type scaling, sound, haptics, actionable reminders, plain-language mode, currency, and locale settings.
- Branded install icons, launch screens, PWA metadata, and synced native iOS/Android projects.
- Cloudflare-compatible Sites build for private hosted previews.

## Navigation

The reference images contain a few inconsistent bottom bars. The implementation standardises Lair, Hoard, Quests, Scrying, and Treasury everywhere. See `NAVIGATION_NOTES.md` for the complete mapping.

## Local development

```bash
npm install
npm run dev
```

## Validation builds

```bash
npm run build
npm run mobile:build
npm test
npm run lint
npx tsc --noEmit
```

## Capacitor

```bash
npm run cap:sync
npx cap open ios
npx cap open android
```

The mobile app stores MVP data locally on the device and does not require an account, backend, or bank connection.
