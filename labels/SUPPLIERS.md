# custom labels — supplier research & status

> READ FIRST (added Aug 19 2026): this is the original research trail and the supplier
> table is still current. Two things in it are OUT OF DATE because the business model
> changed after it was written:
>   - the three "product tiers" (sticker pack / unapplied / pre-applied) are GONE. Cans are
>     either blank or branded; branded means we print AND apply, with the label cost, margin
>     and labour baked into the can price. There is no self-apply tier and no dropshipping.
>   - "customers must be able to reorder stickers alone" is now a reorder of branded cans
>     (design on file, one link), not a sticker-only product.
> The sticker is 2" x 2", a front sticker. Everything about materials, adhesive, white ink
> and the API landscape below still stands.

Research done Aug 19, 2026. Goal: per-order custom labels for our clear 330ml tall cans —
every customer order carries a different design, ~250 labels per run, repeat orders expected.
**Turnaround goal: 1 week door-to-door** (so supplier production must be 1–3 days).

## The two label looks (reference: Scarlet & Sam / Harrys cans photo)

1. **White circle spot sticker** ("Scarlet & Sam") — die-cut white BOPP circle, dark text.
   Needs NO white ink (the material is white). Any CMYK printer can do it. Cheapest look.
2. **Text "printed on the can"** ("Harrys") — clear BOPP label, white ink (or dark ink for
   light drinks — forest green #0B4924 on clear works and needs no white ink). White-on-clear
   requires a printer with white-ink capability, which filters the supplier list.

Wet-can survival = **material + laminate + adhesive**, not ink colour:
- Material: clear or white BOPP / vinyl. Never paper.
- Finish: gloss or matte laminate / UV coat.
- Adhesive: permanent. (Watch out: some POD suppliers use removable adhesive — test first.)
- Apply to dry, room-temp cans BEFORE filling/chilling. Include an instruction card in
  self-apply sticker packs.
- Spot stickers apply by hand in seconds — no applicator machine needed (that was only ever
  needed for full-wrap labels).

## Supplier shortlist — quote emails SENT Aug 19, 2026 (from personal email, not venn.ca)

Spec quoted to all: clear BOPP, laminated, ~2.5"x3" rect and/or 2.5" circle sized for 330ml
tall slim can, 250 qty, one design per run, roll or die-cut singles, CMYK + white-ink option +
white BOPP comparison, turnaround + Toronto shipping/pickup, repeat-run pricing.

| Supplier | Email | Location | Why | Notes |
|---|---|---|---|---|
| Custom Sticker Print | sales@customstickerprint.com | Markham | free pickup, next-day production, factory-direct | CMYK ONLY — no white ink. Quote tweaked accordingly |
| Ezzeprint | sales@ezzeprint.ca | Mississauga | same-day printing, pickup, rolls from 100, silver BOPP | white ink unconfirmed |
| SinaLite | support@sinalite.com | Markham | wholesale trade prices, white ink 5th colour, HAS API | needs trade account — register early |
| Jukebox Print | contact@jukeboxprint.com | Richmond BC (+Toronto presence) | 1-day printing, white ink confirmed, rolls from 125 | strong all-rounder |
| Summit Labels | hello@summitlabels.ca | Van/Cal/Ontario | craft-beverage specialist, HP Indigo, short runs | the "real beverage label" tier |
| Sira Print | info@siraprint.ca | North York (401 Magnetic Dr) | local pickup, white ink under colours, laminated, cheap | quote-based pricing |
| StickerYou | customerservice@stickeryou.com | Toronto (Liberty Village) | local benchmark; rolls ~$65/250 base (~$0.26/label) | 4-day production; confirm white-ink-only |
| Sticker Beaver | info@stickerbeaver.ca | Canada | 3-day processing, free shipping, budget | white ink unconfirmed |
| Copycave | support@copycave.com | Canada | clear BOPP specialist | benchmark |
| Little Rock Printing | (contact form only — littlerockprinting.com/contact-us, 403-269-7022) | Calgary | 1-day turnaround, min 25 labels, free shipping | NOT yet contacted — form/phone |

Non-Canadian benchmark: Sticker Mule (stickermule.com) — white-ink-on-clear confirmed, MOQ 50,
$9 sample pack of 10, free shipping, USD. NO ordering API (confirmed).

**NEXT STEP: chase quotes ~Aug 22 if no reply; compare on (1) price at 250, (2) production
days, (3) white ink yes/no, (4) pickup vs ship.**

## Pricing benchmarks (CAD, approximate — real numbers come from the quotes)

- Per label at 200–250 qty, clear BOPP: ~$0.26–0.60. White ink typically +15–25% (5th colour).
- 250-label run total: ~$65–150 depending on size/supplier.
- Business math: label cost ~$0.30–0.60/can → charge ~$1.25–1.50/can custom branding
  (unapplied) → 2.5–4x markup. Applied-for-you tier: +$0.50–0.75/can premium on top.

## Product tiers (decided direction)

1. **Sticker pack only** — customer applies. Ships flat, near-zero labour, high margin.
2. **Cans + stickers, unapplied** — bundle, self-apply. Middle price.
3. **Pre-applied "ready to pour"** — we apply before handoff, premium. Steer the clear
   white-ink look here (fussier to self-apply).
Customers must be able to REORDER stickers alone (design on file) — repeat revenue.

## API landscape (for auto-ordering — researched Aug 19, 2026)

Suppliers with real ordering APIs:
- **SinaLite** — pricing + order API (liveapi.sinalite.com, sandbox api.sinaliteuppy.com,
  signup: sinalite.com/en_us/api-signup). Covers roll labels incl. clear BOPP + white ink.
  Trade account required. WARNING: roll-label orders skip proofing → our checkout must
  validate artwork (dieline fit, resolution) before submitting.
- **Sticker it** (stickerit.co) — API built for exactly our model ("brands automating custom
  sticker/label fulfilment"). HP Indigo, 3–4 day lead, ships to Canada. "Glide" tool
  auto-proofs customer art. Not Canadian production → cross-border days + duties. Plan B /
  automation partner.
- **Printful** — full REST API + TORONTO fulfilment centre + white-label dropship direct to
  customer. Kiss-cut white stickers only (no clear, no rolls). Perfect for automating the
  sticker-pack tier.
- **Prodigi** — global POD API, HAS transparent stickers (waterproof clear vinyl), 24–48h
  fulfilment, white-label dropship. CAUTION: removable adhesive on transparent — must test on
  a sweating can. Verify which country fulfils Canadian orders.

No API: Sticker Mule (confirmed, most-requested feature), StickerYou, Jukebox, Summit, Sira,
Custom Sticker Print, Ezzeprint. For these: Order Desk middleware or Zapier/Make can
auto-generate order emails from Stripe webhooks.

## In-house printing (later, not now)

- **Ghost White Toner** (~$1K bundle: HP laser + white toner + clear adhesive sheets) — DIY
  white-on-clear, same-day, pennies/label. Trigger: outsourcing spend consistently >
  $300–400/month on white-on-clear.
- **Roland VersaStudio BN-20A** (~$9–11K USD, ~$125/mo lease at Absolute Toner) — eco-solvent
  CMYK+white print-AND-contour-cut on rolls. The "become the label printer" machine. Trigger:
  sustained volume; also unlocks selling label printing to our machine customers.
- **Cricut + white vinyl** (~$300) — zero-ink opaque white cut text. Good for samples and
  small orders; too much labour at 200+.
- Afinia/Primera desktop inkjets CANNOT print white — only relevant for the white-circle look.
