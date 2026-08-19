# prompt for the ordering-system session (copy-paste into a new Claude Code session)

---

I'm Leo, and this repo is my business sealed & co. (sealedandco.ca) — we sell a can sealing
machine plus runs of clear 330ml tall cans that get custom-branded with the customer's own
label/sticker design. Toronto-based, just starting, no orders yet but suppliers are quoted
and the fulfilment model is decided.

Before doing anything, read these files — they are the source of truth from my last session:
- labels/SUPPLIERS.md — label supplier research, quote status (9 vendors emailed Aug 19 2026),
  pricing benchmarks, API landscape (SinaLite / Sticker it / Printful / Prodigi), product tiers.
- labels/ORDERING-PLAN.md — the decided fulfilment flow, ordering-system requirements, and
  open scenario questions.
- README.md — brand style rules (matcha counter style), site structure, deploy process.
- website/index.html and website/api/checkout.js — the current site and Stripe checkout.

The decided fulfilment flow: customer orders (machine + cans + their uploaded design) → cans
auto-ordered and shipped TO ME → labels ordered (eventually via supplier API) and shipped TO
ME → I apply labels → I box labelled cans with the machine → handoff to customer. Goal is
1 week order-to-handoff. Sticker-pack REORDERS (design already on file) are the exception and
can dropship direct to the customer.

Today's job is to redesign my ordering system. Work in this order:

1. AUDIT: read the current checkout flow end to end (index.html shop/cart + api/checkout.js +
   Stripe products) and tell me concretely why it can't support this business — where it's
   rigid, what data it doesn't capture, what happens after payment today.

2. MAP THE SCENARIOS before writing any code. Walk me through each of these as a flow
   (happy path + failure branches), and challenge my assumptions where they're weak:
   - First-time order: machine + 250 cans + custom design upload
   - Sticker-only reorder from an existing customer (design on file)
   - Cans + stickers unapplied vs pre-applied "ready to pour" tiers
   - Bad artwork submitted (low-res / wrong dimensions / doesn't fit the 330ml dieline)
   - Design change requested after payment but before labels print
   - Labels delayed but cans arrived (or vice versa) — does the 1-week promise pause?
   - Rush order request
   - Refund request on custom-printed goods
   For each: what the customer sees, what I have to do manually, what data the system needs.

3. DESIGN THE SYSTEM on my existing stack (static site + Vercel serverless + Stripe — don't
   propose a platform migration unless you can argue it's genuinely necessary):
   - Logo/art upload at checkout: file constraints (PNG/SVG/PDF, min resolution, dieline
     fit-check for the 330ml tall can), storage (keyed to order, retrievable for reorders),
     and where in the flow it happens (before payment? after, with a magic link?).
   - Pricing with label cost baked in: one clean price per tier, label COGS ~$0.30–0.60/can
     and my applying labour inside the margin. Propose the actual price points per tier.
   - Order records + states: paid → cans ordered → labels ordered → received → labelled →
     boxed → handed off. Simplest storage that works (Vercel KV? a JSON-per-order in Blob?
     something else?) — I don't want a heavy database if I can avoid it.
   - Reorder mechanism: magic link / design ID so sticker reorders are a 2-minute purchase.
   - Supplier ordering, phased: Phase 1 = Stripe webhook emails me the order + art so I order
     manually. Phase 2 = SinaLite API for label runs to me, Printful or Prodigi API for
     dropshipped sticker packs. Design Phase 1 so Phase 2 is a swap, not a rewrite.

4. PLAN THE BUILD: break it into shippable slices (each deployable on its own), starting with
   whatever unblocks taking order #1. Estimate effort per slice. Then we build slice 1.

Constraints and style: keep the site's live "Mix 2 · matcha counter" style rules from
README.md for any UI changes; never mention "200 cans" outside shop/product pages (say
"cans"); the site deploys via `vercel deploy --prod`. Stripe branding and copy rules are in
README.md too.

Challenge me where my plan is weak — I want the honest version, not the agreeable one.

---
