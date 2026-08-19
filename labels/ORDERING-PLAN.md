# ordering system — target flow & requirements

Captured Aug 19, 2026. The current checkout (website/api/checkout.js + Stripe) is NOT flexible
enough for the custom-label business. This file is the source of truth for what it must become.

## The fulfilment flow (decided)

Everything routes through Leo — no direct-to-customer label shipping for the core product:

1. Customer orders on sealedandco.ca: machine + cans + custom label design (uploads logo/art).
2. We auto-order the cans → shipped TO LEO.
3. We order the labels (eventually via supplier API) → also shipped TO LEO.
4. Leo applies labels to cans.
5. Leo boxes labelled cans WITH the sealing machine and hands off / ships to customer.

**Goal: 1 week from order to handoff.** Working backwards: supplier production 1–3 days +
ship-to-Leo 1–2 days + labelling/boxing 1 day + handoff. No slack for slow suppliers.

Exception tier: sticker-pack reorders can dropship direct to customer (Printful/Prodigi API or
a quick supplier order) — no cans involved.

## Requirements for the new ordering system

1. **Logo/art upload at checkout** — customer supplies their design when ordering.
   - Enforce constraints at upload time: file type (PNG/SVG/PDF), min resolution, fits the
     330ml-can dieline. This validation is REQUIRED before any API auto-ordering (SinaLite
     roll orders skip human proofing).
   - Store the file (Vercel Blob / S3) keyed to the order — needed for reorders.
2. **Label cost baked into pricing** — customer sees one price; label COGS (~$0.30–0.60/can)
   and apply-labour are inside the margin, not a surprise line item. Tier pricing:
   sticker-pack / cans+stickers unapplied / pre-applied ready-to-pour.
3. **Sticker reorders** — a customer with a design on file can reorder stickers alone in a few
   clicks (design ID or magic link from their original order). This is the repeat-revenue loop.
4. **Order state tracking** — an order now has stages (paid → cans ordered → labels ordered →
   received → labelled → boxed → handed off). Today Stripe checkout is fire-and-forget;
   we need at least a simple order record + status.
5. **Supplier ordering** — phased:
   - Phase 1 (now): Stripe webhook → email Leo the order + art attached; Leo orders manually
     from whichever supplier won the quote round.
   - Phase 2: SinaLite API (trade account) for labels-to-Leo; Printful/Prodigi API for
     dropshipped sticker packs. Architecture: Stripe webhook → Vercel function → supplier API.

## Open questions to map (scenarios)

- Customer art is bad (low-res, wrong shape, profanity/trademark issues) — who catches it,
  how do we message them, does the 1-week clock pause?
- Customer wants a design tweak after ordering / before labels print.
- Reorder but the supplier changed price or is slow — do we requote or eat it?
- Partial failure: cans arrive, labels delayed (or vice versa) — do we ship late or split?
- Rush orders — charge for it? which supplier can actually do same/next day (Ezzeprint)?
- Returns/refunds on custom-printed goods (policy: likely no returns on printed labels).
- Volume spike beyond Leo's labelling capacity — when does tier-3 outsource to a co-packer
  (18 Wheels Logistics, Amplify, Co-Pak — see labels/SUPPLIERS.md research trail)?

## Status log

- Aug 19, 2026 — supplier quote emails sent (9 vendors, see labels/SUPPLIERS.md). Awaiting
  replies; chase ~Aug 22. Ordering-system redesign not started; next session prompt in
  labels/NEXT-SESSION-PROMPT.md.
