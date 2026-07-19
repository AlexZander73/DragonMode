# Dragon Mode

**Protect your hoard. Rest easier.**

Dragon Mode is a visual-first fantasy finance mobile MVP. It turns accounts, spending, recurring costs, savings, projections, purchase decisions, debt, and financial maintenance into a bright dragon-hoard adventure without shame or punishment.

## Included MVP

- Ten navigable reference areas across one consistent five-tab mobile bar.
- Seeded demo hoard with chambers, accounts, transactions, claimants, debts, quests, a resting wish, progression, and relics.
- Full add/edit/delete flows for transactions, accounts, subscriptions, debts, and wishes.
- IndexedDB persistence with JSON import/export and demo reset.
- Subscription usage logging and cost-per-logged-use calculations.
- Quest completion with permanent XP progression.
- Analytics, hibernation estimate, and editable projection scenarios.
- Debt strategy comparison and next-victory milestones.
- Skippable story tutorial plus reduced-motion, sound, haptics, reminders, and plain-language settings.
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
npx tsc --noEmit
```

## Capacitor

```bash
npm run cap:sync
npx cap open ios
npx cap open android
```

The mobile app stores MVP data locally on the device and does not require an account, backend, or bank connection.
