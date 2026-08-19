// supplier dispatch layer. PHASE 1: every task is recorded as "manual" and lands in
// Leo's order-sheet email as a checklist. PHASE 2: fill in the send() of each adapter
// (SinaLite for label runs, Printful/Prodigi for dropshipped sticker packs) and the
// rest of the system does not change.
//
// A task is claimed in Blob BEFORE any supplier call, so a retried webhook or a
// double-loaded thank-you page can never place the same order twice.

const BLOB = 'https://blob.vercel-storage.com';

const { CATALOG } = require('./_catalog');

// what an item needs: from the catalog when we know the sku, else inferred from the name
function itemNeeds(item) {
  const c = item && item.sku && CATALOG[item.sku];
  if (c && c.needs) return c.needs;
  const n = String((item && item.name) || '').toLowerCase();
  if (n.includes('sticker')) return ['labels'];
  if (n.includes('package') || n.includes('ready to pour') || n.includes('peel')) return ['machine', 'cans', 'labels'];
  if (n.includes('machine')) return ['machine'];
  if (n.includes('can')) return ['cans'];
  return [];
}

// ---------- adapters ----------
// Each: { id, label, mode, ready, send(order, task) }
// mode 'to-leo'   = ships to Leo, he applies/boxes
// mode 'dropship' = ships straight to the customer

const LABELS_SINALITE = {
  id: 'labels',
  label: 'order the 2x2 label run (clear/white BOPP, laminated, permanent adhesive)',
  mode: 'to-leo',
  ready: false, // Phase 2: liveapi.sinalite.com - needs trade account + print-ready PDF
  async send() { return { status: 'manual', why: 'sinalite api not connected' }; },
};

const STICKERS_DROPSHIP = {
  id: 'stickers-dropship',
  label: 'order sticker pack shipped DIRECT to the customer',
  mode: 'dropship',
  ready: false, // Phase 2: Printful (Toronto, kiss-cut white) or Prodigi (clear, TEST adhesive)
  async send() { return { status: 'manual', why: 'printful/prodigi api not connected' }; },
};

const CANS_SUPPLIER = {
  id: 'cans',
  label: 'order blank cans + lids to Leo (check the on-hand buffer first)',
  mode: 'to-leo',
  ready: false, // no API expected - email/portal PO
  async send() { return { status: 'manual', why: 'cans are ordered by email/portal' }; },
};

const MACHINE_SUPPLIER = {
  id: 'machine',
  label: 'order/allocate a sealing machine (colour noted on the order)',
  mode: 'to-leo',
  ready: false, // Alibaba factories have NO ordering API - PO by email/Trade Assurance
  async send() { return { status: 'manual', why: 'alibaba/factory orders are placed by hand' }; },
};

// ---------- what does this order need? ----------
function tasksFor(order) {
  const needs = new Set();
  (order.items || []).forEach((i) => itemNeeds(i).forEach((n) => needs.add(n)));

  // a labels-only order (sticker reorder, design already on file) is the one thing
  // that ships straight to the customer
  const stickerOnly = needs.has('labels') && !needs.has('cans') && !needs.has('machine');
  if (stickerOnly) return [STICKERS_DROPSHIP];

  const tasks = [];
  if (needs.has('labels') && order.design) tasks.push(LABELS_SINALITE);
  if (needs.has('cans')) tasks.push(CANS_SUPPLIER);
  if (needs.has('machine')) tasks.push(MACHINE_SUPPLIER);
  return tasks;
}

// ---------- claim-then-send, so nothing fires twice ----------
async function claim(orderId, taskId, token) {
  const path = `suppliers/${orderId}/${taskId}.json`;
  try {
    const l = await fetch(`${BLOB}/?prefix=${path}&limit=1`, {
      headers: { authorization: `Bearer ${token}`, 'x-api-version': '7' },
    }).then((r) => r.json());
    if (l && l.blobs && l.blobs.length) return { fresh: false };
  } catch {}
  return { fresh: true, path };
}

async function record(path, body, token) {
  await fetch(`${BLOB}/${path}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-content-type': 'application/json',
    },
    body: JSON.stringify(body, null, 2),
  }).catch(() => {});
}

async function dispatch(order, token) {
  const out = [];
  for (const t of tasksFor(order)) {
    const c = await claim(order.id, t.id, token);
    if (!c.fresh) { out.push({ id: t.id, label: t.label, mode: t.mode, status: 'already-handled' }); continue; }
    let result = { status: 'manual', why: 'phase 1' };
    if (t.ready) {
      try { result = await t.send(order, t); } catch (e) { result = { status: 'failed', why: String(e && e.message) }; }
    } else {
      result = await t.send(order, t);
    }
    const row = { id: t.id, label: t.label, mode: t.mode, ...result, at: new Date().toISOString() };
    await record(c.path, { order: order.id, ...row }, token);
    out.push(row);
  }
  return out;
}

module.exports = { dispatch, tasksFor, itemNeeds };
