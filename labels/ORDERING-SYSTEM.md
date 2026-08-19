# sealed & co. — ordering system design (Aug 19 2026)

RECONCILED Aug 19 2026 against the real labels/SUPPLIERS.md + labels/ORDERING-PLAN.md
(both now in the repo). Locked decisions: 2" x 2" FRONT sticker · .jpg accepted ·
tier prices approved. See "RECONCILIATION" below for what changed and what is still open.

## RECONCILIATION with SUPPLIERS.md / ORDERING-PLAN.md

CORRECTION - I WAS WRONG ABOUT THE APPLICATOR JIG. SUPPLIERS.md is explicit: "Spot stickers
apply by hand in seconds - no applicator machine needed (that was only ever needed for
full-wrap labels)." A 2x2 front sticker is a spot sticker. DO NOT buy the jig. Scratch
that line item and the $150-300.
  What survives: labelling is still real labour, ~10s a can plus setup, so roughly 45 min
  per 250-can order. The pre-applied premium stays justified, and +$150 sits inside
  SUPPLIERS.md's own guidance of +$0.50-0.75/can (= $125-190 at 250).

STICKER SPEC (locked): 2" x 2" finished front sticker.
  - dieline: 2.00" finished · 2.25" with 1/8" bleed · keep type inside 1.75" safe area
  - at 300dpi: 600px finished, 675px with bleed
  - upload gate now enforces: >=600px short side (hard), flags under 675px, rejects art
    wider/taller than 3:1, flags past 1.5:1
  - .jpg now accepted alongside png/svg/pdf (half of small-biz logos are jpg)

PRICING FLAG - THE STICKER PACK IS UNDERPRICED AGAINST YOUR OWN MATH. SUPPLIERS.md targets
$1.25-1.50/can for unapplied custom branding (2.5-4x markup on $0.26-0.60 label cost).
The approved $225/250 pack is $0.90/can, about 30% under that. At ~$110 COGS with white ink
and overage, $225 is a 51% margin; $295 is 63% and still under your own $1.25 floor.
RECOMMEND raising the sticker pack to $295 (card $304). Everything else is consistent.

BIGGEST OPEN QUESTION, and it changes cost AND which suppliers qualify: clear BOPP with
white ink, or the white BOPP circle look? SUPPLIERS.md: white-on-clear needs a white-ink
printer (+15-25%, and it cuts Custom Sticker Print out entirely), while a white BOPP spot
sticker needs no white ink and any CMYK shop can run it same-day and cheapest. "Front
sticker, 2x2" does not settle this. Decide before you compare the quotes.

ALSO CARRIED IN FROM SUPPLIERS.md:
  - material rule for wet cans: clear or white BOPP/vinyl, laminated, PERMANENT adhesive.
    Never paper. Test any POD supplier's adhesive on a sweating can (Prodigi's transparent
    stock is removable - a real risk for the dropship tier).
  - self-apply sticker packs must ship with an instruction card: apply to dry, room-temp
    cans BEFORE filling and chilling.
  - SinaLite roll orders skip human proofing, so the upload gate is the ONLY proof step
    before Phase 2 auto-ordering. That is why the dieline checks are now hard rules.
  - quote chase due ~Aug 22 (9 vendors emailed Aug 19).

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
Constraints v1 (LIVE): .png .jpg .svg .pdf, ≤4MB (serverless relay limit; bigger files =
the email hatch; Phase 2 = signed client uploads). PNG and JPEG dimensions parsed
server-side. Hard reject under 600px short side or past 3:1 aspect; flag under 675px
(bleed) and past 1.5:1 (off-square). Vector files skip the pixel check. Every upload also
writes designs/pending/{id}/meta.json with dimensions + flags, which the order sheet
email reports so art problems are visible before you order labels.

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

MODEL SIMPLIFIED (Leo, Aug 19 2026): we do NOT sell sticker packs. Customers choose
blank cans or branded cans; when they choose branded, the label cost + margin + applying
labour is baked into the can price. Every order therefore ships to Leo. No dropship tier,
no self-apply tier, no instruction card, no reorder-stickers-alone SKU. Pack size stays
200. Delivery promise: 5-7 business days (from ART APPROVAL on branded orders).

PRICING (LIVE as of Aug 19 2026; e-transfer base, card = x1.03):
- machine only ......................... $1,400 · $1,442
- cans - 200 pack, blank ............... $400 · $412
- cans - 200 pack, your branding ....... $775 · $798   NEW
- basic package (machine + blank cans) . $1,699 · $1,750   (saves $101 vs $1,800 of parts)
- signature (machine + branded + design) $2,399 · $2,471  ($2,475 of parts, saves $76)
Branded-can margin check, from SUPPLIERS.md's own numbers: 200 labels cost ~$90-130 with
white ink and 10-15% overage; branding at $375 over the blank price is $1.88/can, inside
SUPPLIERS.md's $1.75-2.25/can for applied branding. Applying 200 spot stickers is ~35-45
min by hand, no jig.
WATCH THIS: signature only still clears its own parts because it includes label DESIGN
work (we draw it for them) valued around $300. If design help is ever dropped from
signature, its parts fall to $2,175 and $2,399 becomes more expensive than buying the
pieces - the exact trap basic was in. Keep design in signature, or reprice it.

REORDERS: a reorder is another 200-can branded pack, not a sticker pack. designId is
still the key: the handoff email carries a link that pre-loads their design so the repeat
purchase is two minutes and the art never gets re-uploaded. Ships to Leo like any other
order. (Slice 4.)

PHASE 1 → PHASE 2 SUPPLIER SWAP: order-sheet email today; a suppliers.js module with
orderLabels(order)/orderCans(order) stubs so SinaLite (label runs to Leo) and
Printful/Prodigi (dropship reorders) are implementations, not rewrites. The data the
APIs need (art URL, dieline, qty, ship-to) is already in the order record.

## 4. BUILD STATUS (all slices shipped Aug 19 2026)

WHAT IS LIVE
- SLICE 0 model alignment: branded-can product, 5-7 business day promise, dropship tier
  removed, custom-goods refund carve-out in policies + FAQ + shop page, copy sweep.
- SLICE 1 order intake: design upload in the cart (png/jpg/svg/pdf, 4MB), 2x2 dieline
  validation, order records, order-sheet email with the art + a TO ORDER checklist.
- SLICE 2 print-ready files: api/_dieline.js turns a customer logo into a real print file.
  Two SVGs per design, both with true physical dimensions (2.25in with bleed at 300dpi):
    print-2x2.svg = art centred inside the 1.75in safe box, nothing else. send to printer.
    proof-2x2.svg = same art with bleed / cut / safe guides drawn on, for approval.
  Raster only (png/jpg); svg and pdf art already scales and goes as-is.
  HONEST LIMIT: SVG, not PDF. Most printers accept SVG and Leo can print-to-PDF from the
  proof. If the winning supplier insists on PDF/X, that is a one-file addition.
- SLICE 2b e-transfer parity: the cart's e-transfer request now creates a real order at
  state 'awaiting-payment' (api/etransfer.js). Formspree is kept as a backup notification.
- SLICE 3 order desk: /admin.html + api/orders.js behind ADMIN_TOKEN. Lists every order,
  shows the art with proof/print/original links and any flags, advances state with a note,
  and stamps dueBy (7 business days) when the art is approved. Advancing an e-transfer
  order to 'paid' is what fires its supplier tasks.
- SLICE 4 reorders: sealedandco.ca/?d=dsn_xxx loads their design from file and drops a
  branded pack in the cart. Verified: two clicks to repurchase, no re-upload.
- SLICE 5 webhook: api/webhook.js. It does NOT trust the payload; it takes the session id
  and re-fetches that session from Stripe with our own key, recording it only if Stripe
  says paid. So a forged call can at most trigger an idempotent re-check of a real payment.
  NEEDS LEO: add the endpoint in Stripe (see README) so orders record even if the buyer
  closes the tab.

STORAGE DECISION CHANGED MID-BUILD - worth remembering. The first version kept one JSON
per order and edited it. Testing four rapid state changes showed only two surviving:
Vercel Blob is eventually consistent, so read-modify-write silently loses updates. Orders
are now an immutable base record plus append-only event files
(orders/{id}/order.json + orders/{id}/ev/{ts}-{state}.json), folded on read. Appends can
never collide. Re-tested with five events in three seconds: all five kept.

STILL NOT BUILT (deliberately)
- Customer-facing status page and status emails on state change. Leo phones people at this
  volume; build it when order count makes that annoying.
- Deferred-art nudge emails (an order can sit in 'art-missing' with nobody chasing it).
- Rush order as a self-serve paid option (still a conversation + a manual payment link).
- Supplier APIs themselves: SinaLite needs a trade account, and the clear-vs-white-BOPP
  decision has to land first because it changes which suppliers qualify.

## 4. BUILD SLICES

- SLICE 0 — model alignment: DONE Aug 19 2026. Branded-can product live on site + in the
  catalog, 5-7 business day promise everywhere, dropship tier removed, dead payment links
  deleted. STILL TO DO in this slice: the custom-goods refund carve-out on the policies
  page (no refunds once labels print, defect reprints excepted).
- SLICE 1 — take order #1 properly (BUILT Aug 19): art upload in cart → Blob;
  designId through Stripe metadata; /api/confirm writes order JSON + emails Leo the
  order sheet with art link; thanks page fires it. ~4h.
- SLICE 2 — e-transfer orders into the same records + art re-upload/deferred-art magic
  links + customer status page. ~2–3h.
- SLICE 3 — admin page (list orders, advance states, ADMIN_TOKEN) + status emails on
  state change. ~3h.
- SLICE 4 — reorder links (branded-can repeat purchase, design pre-loaded). ~2h.
- SLICE 5 (Phase 2) — print-ready file step (logo onto the 2x2 dieline), SinaLite API
  label ordering, Stripe webhook hardening, client-side big-file uploads. ~1-2 days,
  gated on API credentials. Printful/Prodigi dropship is NO LONGER NEEDED.

OPEN DECISIONS FOR LEO:
1. Sticker size/dieline for the 330ml tall can (front sticker vs full wrap) — from quotes.
2. Tier prices above: sign off or adjust.
3. Buy the label applicator jig (~$150–300) before order #1: strongly recommended.
4. Promise wording: "1 week from art approval, guaranteed under 2" — approve.
5. DONE - .jpg accepted.
6. NEW: clear BOPP + white ink, or white BOPP circle? (see RECONCILIATION - blocks quotes)
7. NEW: raise the sticker pack to $295? (see PRICING FLAG)

## API READINESS (asked Aug 19 2026) — honest status

Verdict: the DATA and the SEAM are ready; no supplier API is connected yet, and one of the
three you asked about has no API to connect to.

READY (built and tested):
- api/_catalog.js — one source of truth for price, copy, and what each product NEEDS
  ('machine' / 'cans' / 'labels'). checkout.js prices from it; supplier routing reads it.
  Supplier orders never depend on guessing from a product name.
- api/_suppliers.js — dispatch layer with four adapters (label run, sticker dropship, cans,
  machine). Each has mode 'to-leo' or 'dropship' and a send() to fill in later.
- Idempotency: every task is CLAIMED in Blob (suppliers/{orderId}/{task}.json) before any
  call, so a retried webhook or a refreshed thank-you page cannot double-order. This is the
  thing that would otherwise cost real money the day automation goes on.
- Routing verified for all 6 order shapes, incl. the sticker-only reorder routing to
  dropship and machine-only NOT triggering a cans order.
- Art is stored at a public HTTPS URL and pre-validated against the 2x2 dieline, which is
  exactly the shape print APIs consume, and is SinaLite's precondition (no proofing).
- Order record already carries everything an API needs: items+sku, qty, machine colour,
  ship-to address, contact, art URL and dimensions.
- Phase 1 payoff already live: the order-sheet email now ends in a TO ORDER checklist,
  marking which lines ship to the customer instead of to Leo.

NOT READY, in the order it will bite:
1. No print-ready file step. Customers upload logos; SinaLite/Printful want a 2.25" bleed
   300dpi print file. Something must place the logo on the dieline. Options: a template PDF
   the customer fills, a server-side composite step, or Sticker it's "Glide" auto-proofer.
   THIS is the real blocker for label automation, not the API.
2. No Stripe webhook. Order creation currently rides the thank-you page redirect. Fine for
   manual ordering; not fine for spending money automatically. Add the webhook before
   flipping any adapter to ready.
3. No credentials: SinaLite needs a trade account; Printful/Prodigi need API keys.
4. Prodigi's transparent stock uses REMOVABLE adhesive (per SUPPLIERS.md). Test on a
   sweating can before any clear dropship goes live.
5. Adapters return status only; no retry/backoff or failure alert yet.

THE MACHINE / ALIBABA ANSWER — no, and probably never:
- Alibaba factories do not offer an ordering API. Orders are placed by message, PO, and
  Trade Assurance. The Alibaba open platform is for marketplace apps, not for placing
  custom orders with an arbitrary supplier. The adapter is therefore documented as manual
  by design, and it appears on the checklist instead.
- Bigger point: machine DROPSHIP contradicts the decided flow and your moat. Machines are
  supposed to arrive at Leo so they get boxed with the labelled cans and set up on the
  customer's counter. Direct-from-factory means weeks of transit, customs paperwork in the
  customer's name, no setup, and no way to catch a dented unit. Keep machines coming to you
  and hold stock; automate the LABEL loop, which is the part that repeats.
