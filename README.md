# sealed & co. — business folder

Everything for the business lives here.

## What's where

- **website/** — the live site (sealedandco.ca). Edit `index.html`, then deploy.
- **website/img/** — every photo on the site.
- **website/api/_catalog.js** — THE source of truth for prices, product copy, and what each product needs from suppliers (machine / cans / labels). Edit prices here.
- **website/api/_suppliers.js** — supplier dispatch. Three adapters (label run, cans, machine) with claim-before-send so nothing is ever double-ordered. Phase 2 = fill in each send().
- **website/api/checkout.js** — card checkout engine; prices come from _catalog.js. Needs STRIPE_SECRET_KEY.
- **website/api/_dieline.js** — turns a customer logo into a print-ready 2x2in file + a proof with cut lines.
- **website/api/_order.js** — order records. Immutable base + append-only events (Blob is eventually consistent, so nothing is ever read-modify-written).
- **website/api/upload.js / confirm.js / webhook.js / etransfer.js / orders.js** — art upload, order creation from Stripe, the webhook, e-transfer orders, admin API.
- **website/admin.html** — the order desk. Open it, paste your admin key, work your orders.

## The order desk

https://sealedandco.ca/admin.html — paste your ADMIN_TOKEN once and the browser remembers it.
Every order shows an 8-step tracker with a progress bar: payment in → design received →
design approved → supplies ordered → everything here → labels applied → boxed → handed off.
Finished steps carry a tick and a timestamp; the current step tells you what to do next in
plain words. Orders without artwork (blank cans, machine only) show a shorter 5-step track.
One button marks the next step done. Approving the art stamps a due date 7 business days out.
Marking an e-transfer order paid is what releases its supplier to-dos.

## Where customers upload their design

Answering the artwork question is REQUIRED before add to cart — but it is never a file
requirement. On the branded-cans and signature pages the customer picks one of three:

1. **I have my logo** → upload it (checked against the 2x2in sticker).
2. **Pull it from my socials** → they type @handle or a URL; you fetch it and upload it from
   the order desk.
3. **Design it for me** → included in signature, a paid line item with branded cans.

Add to cart stays locked until one is answered. The shop page has no add-to-cart at all — it's
a catalogue, and every card goes to its product page where colour, artwork and quantity live.
The cart is review only. `/api/attach` still exists as a repair tool (wrong file, or you
uploading a fetched logo), just not as part of the buying flow.

## Funnel

The order desk shows the last 30 days: product views → added to cart → designs uploaded →
checkout started → orders placed, with the drop-off between each. It's our own counter
(`api/track.js` + `api/stats.js`), no cookies and nothing personal. Vercel's Web Analytics
script was 404ing, so it never recorded anything despite being switched on.

## Still to switch on (Leo, 2 minutes)

Stripe → Developers → Webhooks → Add endpoint → `https://sealedandco.ca/api/webhook`,
event `checkout.session.completed`. Without it, an order only records if the buyer's browser
comes back from Stripe. With it, orders record no matter what.

## More files
- **labels/ORDERING-SYSTEM.md** — the ordering-system audit, scenario map, system design, and build slices. Read this before touching the order flow.
- **brand/** — logo files (`wordmark.png`, `icon.png` — upload in Stripe → Settings → Branding) plus every design exploration: style-options (9 directions), style-variants, style-8b-remixes, inspo-templates (erewhon/alfred/chacha/forma), template1-blue, mix-erewhon-chacha (Mix 2 = the LIVE style), canada-options (leaf option 5 = live).
- **invoices/** — `invoice-template.html`, the branded invoice for e-transfer sales. Open, fill in, print to PDF.

## How to deploy the website

```bash
cd "/Users/leokatz/Desktop/Sealed and Co/website" && vercel deploy --prod
```

## The important links

- Live site: https://sealedandco.ca (also sealed-co-zeta.vercel.app)
- Stripe dashboard: https://dashboard.stripe.com
- Vercel dashboard: https://vercel.com (project: sealed-co)
- Domain: GoDaddy (sealedandco.ca, renews Aug 2027) — DNS is handled by Vercel
- Contact form + e-transfer requests: Formspree form `mwleqded` → emails the Formspree account (leokat97@gmail.com)

## Style: LIVE — "Mix 2 · matcha counter" (Aug 18 2026)

Cha Cha Matcha volume on Erewhon discipline. Built from `brand/mix-erewhon-chacha.html`.

- Page: warm white #FFFAF5 · cards white #FFFFFF · hairlines #F0E4D8
- Text + dark buttons: forest #0B4924 · filled panels: deep matcha #0E6B38
- Accents: baby pink #F8CFD9 (bar, primary buttons, active tab, featured card) · pale matcha #DCE9C9
- Hero panel: gradient #DCE9C9 -> #B9D394 -> #8DBF5A, dark green uppercase headline, pink button
- Fonts: Hanken Grotesk 800 uppercase (headings, buttons, chips, labels) · Inter (body) · Archivo letter-spaced caps (wordmark)
- Shapes: 10px corners, 1px hairlines, no thick borders, no hard shadows
- Logo: wordmark only, plus a small GREEN maple leaf (real flag shape) after the name in header + footer; favicon is a pink tile with a forest "S"
- Copy rule: never mention "200" cans outside the shop/product pages — say "cans" or "tall clear cans"
- Meta/SEO done: title "sealed & co. | can sealing machine + branded cans, toronto", full OG + Twitter cards, og:image = captain-lineup.jpg
- "Who it's for" collage: all 8 tiles have sticker tags (incl. weddings & events, brand launches, run clubs, markets & pop-ups)
- New reference photos live: steel-matcha (signature page), apero-ice (cans page + cart), leora-pink (why buy), lyon-trio + mine-cooler (collage). These are other brands' photos - replace with real sealed & co. shots over time
- Stripe branding to set in the dashboard: brand #0B4924, accent #F8CFD9

Other directions explored and NOT used: brand/style-options.html (9), style-variants.html,
style-8b-remixes.html, inspo-templates.html, template1-blue.html (an "Erewhon + denim"
version was deployed briefly, then reverted).

## Design inspo (saved Aug 18 2026)

- https://ship.erewhon.com — luxury restraint, letter-spaced caps, product-on-stone cards
- https://alfred.la — espresso brown + cream, giant caps in dark panels, italic serif wink
- https://chachamatcha.com — forest green + baby pink, script logo, chunky white caps
- https://formapilates.co — pure white, thin italic serif over photos, one button per screen
- Also: rhodeskin.com, rizzoshouseofparm.com, villagejuicery.com, pilotcoffeeroasters.com, drinkag1.com, sundays-company.ca
- Templates built from these: brand/inspo-templates.html · earlier explorations: brand/style-options.html (9), brand/style-variants.html, brand/style-8b-remixes.html (Leo loved 8B)

## Prices (one-time, CAD)

| product | e-transfer | card (3% baked in) |
|---|---|---|
| signature package (machine + branded cans + design help) | $2,399 | $2,471 |
| basic package (machine + blank cans) | $1,699 | $1,750 · save $101 vs parts |
| machine only | $1,400 | $1,442 |
| cans — 200 pack, blank | $400 | $412 |
| cans — 200 pack, your branding | $775 | $798 |

Prices live in `website/api/_catalog.js`. Edit them there, not in Stripe: checkout builds
prices inline, so Stripe's stored prices are ignored.

Model: cans are either blank or branded. We do NOT sell sticker packs — label cost, margin,
and applying labour are baked into the branded can price, and every order ships to Leo so he
applies the labels and boxes them with the machine. Delivery promise: 5-7 business days,
counted from art approval on branded orders.

## Done (Aug 18 2026)

- Policies page live (refunds, delivery, orders, payments, privacy) — footer link "policies"
- Delivery promise fixed: free GTA delivery + setup, ships Canada-wide
- Visitor analytics live (Vercel Web Analytics — see project → Analytics tab)

## Still to do

### Leo only (dashboard/accounts)
- Stripe branding: upload brand/ logos, set brand #0B4924 + accent #F8CFD9 (Settings → Branding)
- Stripe: payouts are still MANUAL — flip to daily or weekly in Payouts settings
- Stripe: turn on customer email receipts (Settings → Emails) + app push notifications
- Formspree: log in once at formspree.io to confirm where form emails land
- Instagram: grab @sealedandco, then link it on the site
- CRA: register business + HST number, then add HST back to checkout
- Business email on sealedandco.ca (Google Workspace ~$8/mo or improvmx.com forwarding)
- Lock supplier lead times for machines and cans
- Land one pilot cafe → testimonial + real photos

### Decisions to make (ordering system — see labels/ORDERING-SYSTEM.md)
- LOCKED: 2" x 2" front sticker (2.25" with bleed, 600px min at 300dpi). Tier prices approved. .jpg accepted.
- OPEN: clear BOPP + white ink, or white BOPP circle? Changes cost 15-25% and cuts some suppliers out. Blocks the quote comparison.
- DONE: sticker packs dropped. Branded cans $775/$798 with label cost baked in.
- DONE: delivery promise is 5-7 business days (from art approval on branded orders).
- No applicator jig needed (SUPPLIERS.md: spot stickers apply by hand)

### Other decisions
- Product name for the machine (shortlist: the seal bar · sealé · the stamp · the S1)
- FAQ: 3 open answers — machine size/plug, hot drinks yes/no, is label design included in signature
- Comparison table: approved concept = DIY import vs co-packer vs sealed & co. (say go)
- Real footer build: shop links + help links + email signup + legal line (say go)

### Done recently
- Mix 2 "matcha counter" design live · green maple leaf in header/footer · meta/SEO rewritten
- Stripe fully working: approved, bank connected (CIBC), multi-item card checkout tested live
- 5 new reference photos placed · all collage tiles stickered · "200" scrubbed from general copy
