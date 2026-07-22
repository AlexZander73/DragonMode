# Common finance asset pack — 2026-07-22

DragonMode now has a brand-neutral library of 128 common finance icons. The library is split into eight 4 × 4 atlases so it stays sharp at mobile sizes while remaining economical to load.

## Contents

| Sheet | Coverage | Items |
| --- | --- | ---: |
| `subscriptions-core-atlas-v1.png` | Digital, media, communication, and app subscriptions | 16 |
| `subscriptions-household-atlas-v1.png` | Utilities, insurance, transport, care, delivery, and memberships | 16 |
| `purchases-essential-atlas-v1.png` | Food, transport, health, clothing, household, and pet purchases | 16 |
| `purchases-lifestyle-atlas-v1.png` | Technology, entertainment, hobbies, travel, gifts, and major purchases | 16 |
| `income-earned-atlas-v1.png` | Wages, shifts, projects, businesses, creator work, and benefits | 16 |
| `income-passive-atlas-v1.png` | Interest, dividends, support, grants, gifts, refunds, and inheritance | 16 |
| `investments-core-atlas-v1.png` | Cash, deposits, bonds, funds, shares, property, and retirement | 16 |
| `investments-specialised-atlas-v1.png` | International, thematic, alternative, and specialised investments | 16 |

All production files and the key registry are in [`public/art/icon-packs/common-finance/`](../public/art/icon-packs/common-finance/). The canonical ordering is [`manifest.json`](../public/art/icon-packs/common-finance/manifest.json).

## Sprite addressing

Every atlas is 1254 × 1254 with four columns and four rows. An item's array index determines its sprite position:

```ts
const column = index % 4;
const row = Math.floor(index / 4);
const step = 100 / 3;
const backgroundPosition = `${column * step}% ${row * step}%`;
```

```css
.common-finance-icon {
  width: 48px;
  height: 48px;
  display: inline-block;
  background-repeat: no-repeat;
  background-size: 400% 400%;
}
```

The image should remain decorative. The visible label and accessible name should come from the manifest rather than text embedded in the art.

## ImageGen mode and shared final prompt

- Tool mode: built-in OpenAI ImageGen.
- Style reference: `public/art/reference-parity/ui-icon-atlas-v1.png`.
- Generation strategy: one independent ImageGen call per atlas.
- Validation: every final sheet was viewed at original resolution and checked for cell count, order, gutter integrity, ambiguity, brands, and embedded text.

The following shared prompt foundation was used for all eight calls:

> Use case: stylized-concept. Asset type: production game UI icon atlas for DragonMode. Image 1 is the mandatory visual style, plaque construction, lighting, scale, and grid reference. Match Image 1 closely: polished friendly 2D fantasy mobile-game item icons, dark navy inset square plaques, thin warm-gold rounded frames, crisp silhouettes, jewel-tone highlights, identical scale and camera angle. Use a perfectly straight orthographic 4 × 4 grid, sixteen equal square cells, thin pure-black gutters, one centred isolated symbol per cell, generous padding, and nothing crossing a cell boundary. No words, letters, numbers, labels, logos, trademarks, brands, people, background outside the plaques, or watermark. Exactly sixteen cells, no merged cells, no extra icons. Every symbol must be distinct and immediately readable at 48 px.

Each call then supplied one of these exact ordered subject sets, read left-to-right by row:

### Subscriptions — core

1. Video streaming, music streaming, gaming membership, audiobook service.
2. Digital news, cloud storage, password manager, device security.
3. Mobile phone plan, home internet, productivity software, creative software.
4. AI assistant, fitness app, meditation app, dating membership.

### Subscriptions — household

1. Electricity, household gas, water utility, home or renter insurance.
2. Vehicle insurance, health insurance, gym membership, transit pass.
3. Parking subscription, child care, pet care plan, meal kit.
4. Grocery delivery, professional membership, recurring charity, education or course membership.

### Purchases — essential

1. Groceries, cafe or coffee, restaurant meal, takeaway.
2. Fuel, public transit fare, taxi or rideshare, pharmacy.
3. Doctor or dental, clothing, shoes, toiletries.
4. Household supplies, repairs or maintenance, furniture or homewares, pet supplies.

### Purchases — lifestyle

1. Electronics, phone or computer, games, books.
2. Cinema/theatre/concert, hobbies or crafts, sports or outdoors, flights or travel.
3. Hotel, gift, charity, beauty or hair.
4. Bar or alcohol, theme park or event, vehicle purchase, home improvement.

### Income — earned

1. Salary or wages, hourly or shift pay, overtime, bonus.
2. Commission, tips, freelance work, contract or project pay.
3. Business sales, side gig, consulting, royalties.
4. Creator or advertising revenue, rental income, reimbursement, government benefit.

### Income — passive and one-off

1. Interest, dividends, capital gain, pension or retirement income.
2. Annuity, tax refund, insurance payout, scholarship or grant.
3. Child support, partner support, family gift, inheritance.
4. Cash gift, sale of belongings, cashback or rewards, purchase refund.

### Investments — core

1. Cash holding, high-interest savings, term deposit, government bond.
2. Corporate bond, bond fund, broad-market ETF, index fund.
3. Mutual fund, individual stock, dividend stock, property fund or REIT.
4. Residential property, commercial property, retirement or superannuation, managed portfolio.

### Investments — specialised

1. International shares, emerging markets, small-cap fund, sector or thematic fund.
2. Sustainable fund, commodities, gold or precious metals, cryptocurrency.
3. Venture or startup investment, private equity, collectibles, education fund.
4. Health savings, employee stock plan, options or derivatives, other investment.

## Product guidance

- Use these as recognisable category cues, never as evidence that DragonMode has connected to a provider.
- Keep all names editable; an icon is a suggestion, not a classification decision.
- Do not infer an investment's suitability, risk, or expected return from its icon.
- Avoid showing a brand name or logo even when a merchant or subscription name matches a well-known service.
- For imports, suggest an icon only after the user's category or cleanup rule is known, and always allow replacement.
