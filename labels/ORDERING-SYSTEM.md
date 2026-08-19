# sealed & co. — ordering system design (Aug 19 2026)

NOTE: labels/SUPPLIERS.md and labels/ORDERING-PLAN.md from the prior session were not found
on this machine, in the repo, or in any local session transcript. This doc uses Leo's
Aug 19 summary as source of truth. When those files resurface, reconcile: exact supplier
quotes, chosen sticker dimensions, and tier names.

## 1. AUDIT — why today's checkout can't run this business

What exists: 4 fixed SKUs (catalog inline in api/checkout.js), localStorage cart,
Stripe Checkout (card) or Formspree email (e-transfer). After payment: a redirect banner,
a Stripe receipt, and a dashboard row. That's all.

Concrete gaps:
1. THE DESIGN DOESN'T EXIST IN THE SYSTEM. No upload, no constraints, no storage, no
   design id. The single object this business revolves around has nowhere to live.
2. NO ORDER RECORDS. Stripe's payment list is the only artifact. Nothing tracks
   paid → cans ordered → labels ordered → received → labelled → boxed → handed off.
3. NO ACTIONABLE NOTIFICATION. Nothing assembles "here's what to order from which
   supplier, with the art file" — Leo would reconstruct every order from the dashboard.
4. NO CUSTOMER/DESIGN LINK. Order #2 can't find order #1's art. Reorders = re-upload.
5. PRICING CAN'T EXPRESS THE MODEL. Flat SKUs can't say unapplied vs pre-applied,
   rush, or per-can label cost.
6. COPY DEBT. Site says "200 pack", "printed cans", "label design included" — the new
   model is 250-can runs with stickers applied in-house.
7. E-TRANSFER IS OFF THE BOOKS. A Formspree email, no record, no art.
8. REFUND POLICY DOESN'T CARVE OUT CUSTOM GOODS. "14-day unopened returns" is untenable
   for printed labels.

## 2. SCENARIOS

Data every order needs: order id · contact (email/phone/business) · items {sku, tier,
qty, colour, designId} · art versions + review state · delivery address · amounts +
payment channel · state timeline · promise dates · flags (rush, delayed).

### A. First order: machine + 250 cans + custom design
Customer: picks tier, uploads art (or defers), pays, sees thanks banner + receipt,
then (future) status emails. Leo: reviews art vs dieline (24h SLA), orders cans + labels,
receives, applies, boxes, hands off. System: order record at payment, art stored under a
design id, order-sheet email to Leo with art link + address + colour.
Failure branches: art fails review → re-upload magic link, clock hasn't started;
paid-but-no-art → order sits in "art-missing" with nudge emails; supplier stockout → F.
MISSED IN THE PLAN: overage. Order ~10–15% extra labels (misapplies) and a small can
buffer (dents). Bake into COGS.

### B. Sticker-only reorder (design on file)
/reorder?d=DESIGN_ID → page shows their design + pack sizes → pay in 2 minutes.
Phase 1: Leo forwards to supplier with the customer's address. Phase 2: dropship API.
CHALLENGE: dropship means a SECOND supplier's file spec. Store a supplier-neutral master
(vector PDF or ≥300dpi PNG at final dieline size) from day 1 or every reorder stalls on
file conversion. A "small tweak" is NOT a reorder — it's a new design version (mini
review cycle), price it or it eats you.

### C. Unapplied vs pre-applied ("ready to pour")
CHALLENGE (the weakest part of the plan): hand-applying 250 labels straight on cylindrical
clear PET is 2–4 hours of tedium per order, and crooked labels are worse than none. At a
small price gap everyone picks pre-applied and Leo becomes the worst-paid labeller in
Toronto. Fix BOTH: buy a manual round-container label applicator jig (~$150–300, cuts it
to ~45 min and makes it straight) AND price the gap for real (+$150 minimum). Pre-applied
also scuffs in transit — pack with paper interleave.

### D. Bad artwork
Upload constraints stated inline: PNG/SVG/PDF, min resolution for print size, dieline
template downloadable. Client/server checks catch: wrong type, absurd size, low pixel
count. They can't catch: CMYK issues, bleed, taste, trademarks. So the REAL gate is a
manual "art review" state — first state after payment, 24h SLA. Fail → email with
specific problem + re-upload link (new version on same order).
CHALLENGE: the 1-week promise MUST run from ART APPROVAL, not payment. Say it at
checkout: "1 week from art approval." Otherwise every resubmit eats the promise.

### E. Design change after payment, before print
State machine answers "have labels been ordered?" If no → swap file, re-review, timeline
resets, free. If yes → change = discounted reprint at cost. Policy line in confirmation
email: "your art locks when it goes to print (usually within 1 business day of approval)."

### F. Labels delayed but cans arrived (or vice versa)
CHALLENGE: a promise that silently pauses isn't a promise. Two fixes:
1. OPS: hold 2–3 orders of BLANK cans at home. Cans are generic — buy ahead. Then only
   label lead time gates, and "1 week from art approval" is honest.
2. COMMS: "typically 1 week, guaranteed under 2" + proactive delay email + a free extra
   sticker pack as goodwill. Track expected-by dates + delayed flag per order.

### G. Rush order
Phase 1: rush is a REQUEST (checkbox/note), not a promise — Leo confirms feasibility
same-day and sends a rush-fee payment link (+$125 flat, 3–4 business days from art
approval). Self-serve guaranteed rush only in Phase 2 when the label API confirms capacity.

### H. Refund on custom goods
Machine: unchanged (30-day replacement, 14-day unopened return). Custom stickers/labelled
cans: full refund any time BEFORE labels go to print; after print, no refund EXCEPT
defects (misprint vs the approved proof) → free reprint. Store the approved version as
the adjudication artifact. Blank cans: 14-day unopened. This goes in policies + checkout.

## 3. SYSTEM DESIGN (existing stack: static site + Vercel functions + Stripe)

No platform migration. Shopify would buy uploads + orders at the cost of rebuilding the
site, monthly fees, and losing the e-transfer flow. Not necessary at this volume.

STORAGE: Vercel Blob (created: store_YtbZsEzY52kiL9Y7, token injected).
- Art: designs/pending/{designId}/{filename} → referenced by orders.
- Orders: orders/{ORDER_ID}.json — one JSON per order, timeline of states inside.
- No database until volume demands it. List-by-prefix is the "index".

ART UPLOAD: in the CART (before payment) when the cart contains a design-bearing item.
Required-by-default with an "email it after checkout" escape hatch (some owners won't
have their logo on their phone; don't lose the sale). Deferred art → order lands in
"art-missing" state with an upload link in the confirmation flow.
Constraints v1: .png .svg .pdf, ≤4MB (serverless relay limit; bigger files = the email
hatch; Phase 2 = signed client uploads for 100MB+). PNG width/height parsed server-side,
min 500px short side. Dieline check is MANUAL in review until sticker dimensions are
locked (open decision — from SUPPLIERS.md).

ORDER RECORD (JSON):
{ id, createdAt, channel: card|etransfer, stripeSessionId, customer{email,name,phone,
  business}, address, items[{sku,name,qty,colour,designId}], amounts{total,currency},
  design{id,url,filename,status}, state, timeline[{state,at,note}], flags{rush,delayed} }
States: paid → art-review → art-approved → supplies-ordered → received → labelled →
boxed → handed-off. (+ art-missing, awaiting-payment for e-transfer.)

ORDER CREATION: success-redirect confirm. success_url carries the session id; the thanks
page fires /api/confirm which verifies payment WITH STRIPE SERVER-SIDE (never trusts the
browser), writes the order JSON, and emails Leo the order sheet (via the existing
Formspree inbox — no new accounts). Idempotent by session id. A Stripe webhook does this
more robustly (survives closed tabs) — add it when dashboard access is back; the confirm
endpoint stays as backup. Closed-tab risk is acceptable interim: the payment still exists
in Stripe, nothing is lost but automation.

PRICING PROPOSAL (e-transfer base · card = ×1.03; label COGS $0.45 avg incl. overage;
applying labour inside the pre-applied gap). PENDING real quotes from SUPPLIERS.md:
- machine only .................... $1,400 · $1,442 (unchanged)
- cans — 250 pack, blank .......... $475 · $489
- sticker pack — 250 custom ....... $225 · $232   (reorder hero; COGS ~$115)
- peel & stick bundle (250+250) ... $650 · $670   (save $50 vs parts)
- ready to pour (pre-applied) ..... $800 · $824   (+$150 applying gap)
- basic package (machine + blank cans) $1,699 · $1,750 (unchanged, still saves vs parts)
- signature package (machine + ready-to-pour + design help) $2,399 · $2,471 (unchanged!)
- rush ............................ +$125 flat, on request
Nice property: both flagship prices survive; the mid-tier ladder gets filled in.

REORDERS: designId doubles as the reorder key. Handoff email includes
sealedandco.ca/?d=dsn_xxx#reorder → prefilled sticker-pack purchase. (Slice 4.)

PHASE 1 → PHASE 2 SUPPLIER SWAP: order-sheet email today; a suppliers.js module with
orderLabels(order)/orderCans(order) stubs so SinaLite (label runs to Leo) and
Printful/Prodigi (dropship reorders) are implementations, not rewrites. The data the
APIs need (art URL, dieline, qty, ship-to) is already in the order record.

## 4. BUILD SLICES

- SLICE 0 — model alignment (copy + tiers + policies): 250-can copy, new tier products
  on site + in checkout catalog, custom-goods refund carve-out, "1 week from art
  approval" promise. BLOCKED ON: Leo's tier-price sign-off + sticker dimensions. ~2h.
- SLICE 1 — take order #1 properly (BUILT Aug 19): art upload in cart → Blob;
  designId through Stripe metadata; /api/confirm writes order JSON + emails Leo the
  order sheet with art link; thanks page fires it. ~4h.
- SLICE 2 — e-transfer orders into the same records + art re-upload/deferred-art magic
  links + customer status page. ~2–3h.
- SLICE 3 — admin page (list orders, advance states, ADMIN_TOKEN) + status emails on
  state change. ~3h.
- SLICE 4 — reorder links + sticker-pack product live. ~2h.
- SLICE 5 (Phase 2) — SinaLite API ordering, Printful/Prodigi dropship, Stripe webhook
  hardening, client-side big-file uploads. ~1–2 days, gated on API credentials.

OPEN DECISIONS FOR LEO:
1. Sticker size/dieline for the 330ml tall can (front sticker vs full wrap) — from quotes.
2. Tier prices above: sign off or adjust.
3. Buy the label applicator jig (~$150–300) before order #1: strongly recommended.
4. Promise wording: "1 week from art approval, guaranteed under 2" — approve.
5. Accept .jpg uploads too? (Spec said PNG/SVG/PDF; half of small-biz logos are jpg.)
