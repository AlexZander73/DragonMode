# DragonMode visual asset generation — 2026-07-22

This document records the coordinated ImageGen asset pass used to bring the live application closer to the supplied portrait references. The reference screenshots were used as composition anchors; existing DragonMode artwork was used only where it helped preserve the established character language.

## Generation mode and rules

- Tool mode: built-in OpenAI ImageGen.
- Output type: production PNG assets copied into `public/art/reference-parity/`.
- UI rule: generated images contain no labels, numbers, controls, charts, logos, or financial claims. All functional information remains live, selectable HTML.
- Composition rule: focal characters and treasure sit away from the text-safe zone used by each component.
- Style rule: polished 2D fantasy mobile-game key art, crisp silhouettes, jewel-tone lighting, navy/gold framing, friendly rather than threatening characters.

## Shared prompt foundation

> Create production-ready 2D fantasy mobile-game artwork for DragonMode, a kind manual financial tracker. Match the supplied reference composition and density: crisp illustrated forms, deep navy shadows, jewel-tone highlights, warm gold trim, readable at phone size, and friendly premium game art. No typography, numbers, logos, charts, buttons, interface controls, watermarks, or photorealism. Preserve a clean dark safe zone for live HTML where requested.

## Final prompt set and outputs

### Lair hero

Output: `public/art/reference-parity/lair-hero-v1.png` (1536 × 1024)

> Bright sky-castle courtyard with an enormous friendly emerald dragon curled asleep on a hoard of gold. Purple and cyan crystals, blue-and-gold banners, airy towers, sunlit atmosphere. The dragon should dominate the lower centre like the Lair reference while leaving the upper corners calm enough for cropping. Landscape banner, no UI.

### Hoard banner

Output: `public/art/reference-parity/hoard-banner-v1.png` (1536 × 1024)

> Dark emerald treasury vault. Ornate open navy-and-gold chest on the right filled with coins, a parchment scroll, cyan and purple crystals, and a small shield medallion. Keep the left third dark and uncluttered for live total text. Landscape banner, no UI.

### Illustrated UI icon atlas

Output: `public/art/reference-parity/ui-icon-atlas-v1.png` (1254 × 1254)

> Exact four-by-four atlas of sixteen square fantasy UI plaques, equal cells and thin gutters. Every cell uses the same dark navy inset plaque, warm gold edge, crisp mobile-game rendering, centred isolated symbol, and no text. Row 1: gold coin stack; parchment ledger; blue guardian shield; purple crystal. Row 2: flame; fortified vault door; crafting hammer; pink heart gem. Row 3: green sprout; tribute scroll; cyan wish star; broken chain with lock. Row 4: purple quest spellbook; blue scrying orb; gold crown; paw medallion. Straight grid, no perspective, no extra objects crossing cell boundaries.

### Tribute guardian

Output: `public/art/reference-parity/tribute-guardian-v1.png` (1536 × 1024)

> Dark ruby and violet tribute hall with a friendly red-orange young dragon on the right, pointing toward a glowing amber alert crystal. A small pile of coins and ornate gothic arches support the scene. Preserve a dark uncluttered left half for live subscription text. Landscape banner, no UI.

### Hibernation dragon

Output: `public/art/reference-parity/hibernation-dragon-v1.png` (1536 × 1024)

> Deep blue moonlit cavern with a cobalt and violet dragon sleeping peacefully on gold in the lower-right. Subtle cyan crystal glow and a calm, protective mood. Preserve a spacious dark left half for live estimate text. Landscape banner, no UI.

### Dragon status portrait

Output: `public/art/reference-parity/dragon-status-v1.png` (1024 × 1536)

> Full upright emerald-and-gold guardian dragon in a bright sky-castle courtyard, confident but friendly, wings open enough to read as a silhouette. Portrait mobile key art with head and torso kept inside a safe central crop. Blue sky, distant towers, jewel crystals, no UI.

### Flight guide

Output: `public/art/reference-parity/flight-guide-v1.png` (1536 × 1024)

> Friendly elderly flight-path wizard in a blue-and-gold robe on the left of a twilight observatory, holding a scroll and crystal-tipped staff. Telescope, floating castle lights, and a calm deep-blue sky. Preserve the right half as a dark text-safe zone. No chart, words, numbers, or UI.

### Wish vault

Output: `public/art/reference-parity/wish-vault-v1.png` (1536 × 1024)

> Magenta and violet crystal vault displaying a premium mechanical keyboard inside an ornate rose-gold reliquary at centre-right. A small friendly pink dragon rests at lower-left. Rich glowing crystals and polished fantasy treasure lighting; no price, brand, words, or UI.

### Debt victory chamber

Output: `public/art/reference-parity/debt-victory-v1.png` (1536 × 1024)

> Dark stone debt chamber with a massive black chain, ornate purple-and-gold padlock, and glowing golden sword breaking a chain link on the right. Hopeful victory light rather than menace. Preserve a dark empty left side for live totals and progress. No text or UI.

### Legacy treasure hall

Output: `public/art/reference-parity/legacy-treasure-v1.png` (1536 × 1024)

> Deep purple legacy hall with an ornate open treasure chest on the right containing a crown, hourglass, compass, gold key, green amulet, purple crystal, and coins. Preserve the left third as a dark text-safe zone. Warm gold edge lighting, permanent-milestone mood, no UI.

## Live integration map

- Header plaques, bottom navigation, Lair metrics, chamber cards, empty chamber previews, and quest artefacts use the single 4 × 4 atlas through CSS background positions.
- The Lair, Hoard, Scrying, Tribute Hall, Flight Path, Dragon's Rest, Dragon Status, Debt Chamber, and Dragon's Legacy use the new coordinated scenes.
- Root headers restore the compact angled colour block and illustrated plaque seen in the references.
- The navigation remains fixed to the physical bottom edge, with 62 px normal and 50 px compact compositions.
- Compact parity is explicitly tuned at 307 × 512; normal phone QA uses 430 × 932.
- Financial, educational, tutorial, story, import, planning, and accessibility features remain functional HTML above the decorative art.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run test` — 48 domain/import tests, production build, 2 rendered-shell tests, and 7 release-contract tests passed.
- Browser QA completed at 430 × 932 and 307 × 512 across the supplied reference routes.
- Browser console: zero errors during the visual route pass.
- The populated wish flow was also exercised; a zero-cost preference edge case that previously produced `Infinity days` now falls back to recorded monthly outflow or shows that the estimate is not ready.
