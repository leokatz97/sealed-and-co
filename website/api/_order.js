// order records. one JSON per order in Blob, plus the order-sheet email to Leo.
// shared by /api/confirm (browser returns from Stripe), /api/webhook (server to
// server, survives a closed tab), and /api/etransfer.

const suppliers = require('./_suppliers');

const BLOB = 'https://blob.vercel-storage.com';
const FORMSPREE = 'https://formspree.io/f/mwleqded';

const STATES = ['awaiting-payment', 'paid', 'art-missing', 'art-review', 'art-approved',
  'supplies-ordered', 'received', 'labelled', 'boxed', 'handed-off', 'cancelled'];

function money(cents, cur) { return '$' + (cents / 100).toFixed(2) + ' ' + String(cur || 'cad').toUpperCase(); }

async function blobList(prefix, token, limit) {
  const r = await fetch(`${BLOB}/?prefix=${encodeURIComponent(prefix)}&limit=${limit || 100}`, {
    headers: { authorization: `Bearer ${token}`, 'x-api-version': '7' },
  });
  const d = await r.json().catch(() => ({}));
  return (d && d.blobs) || [];
}

async function blobPutJson(path, obj, token, cacheSeconds) {
  const r = await fetch(`${BLOB}/${path}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': String(cacheSeconds == null ? 0 : cacheSeconds),
    },
    body: JSON.stringify(obj, null, 2),
  });
  return r.ok;
}

// Blob is eventually consistent, so we never read-modify-write an order. the base
// record is written once and never touched; every change after that is its own small
// immutable event file. current state is the base folded over its events, which means
// two updates a second apart can't erase each other.

function fold(base, events) {
  const o = JSON.parse(JSON.stringify(base));
  o.timeline = Array.isArray(base.timeline) ? base.timeline.slice() : [];
  events.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach((e) => {
    if (e.state) { o.state = e.state; o.timeline.push({ state: e.state, at: e.at, note: e.note }); }
    else if (e.note) o.timeline.push({ state: o.state, at: e.at, note: e.note });
    if (e.dueBy) o.dueBy = e.dueBy;
    if (e.paidAt) o.paidAt = e.paidAt;
    if (e.design) o.design = Object.assign({}, o.design || {}, e.design);
    if (e.artStatus && o.design) { o.design.status = e.artStatus; if (e.artStatus === 'approved') o.artApprovedAt = e.at; }
    if (e.supplierTasks) o.supplierTasks = e.supplierTasks;
    if (e.flags) o.flags = Object.assign({}, o.flags || {}, e.flags);
  });
  return o;
}

async function fetchJson(url) {
  return fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

async function createOrder(order, token) {
  return blobPutJson(`orders/${order.id}/order.json`, order, token, 31536000);
}

async function appendEvent(orderId, event, token) {
  const at = event.at || new Date().toISOString();
  const stamp = String(Date.now()) + '-' + String(event.state || 'note').replace(/[^a-z-]/g, '');
  return blobPutJson(`orders/${orderId}/ev/${stamp}.json`, Object.assign({}, event, { at }), token, 31536000);
}

async function readOrder(orderId, token) {
  const blobs = await blobList(`orders/${orderId}/`, token, 200);
  const baseBlob = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!baseBlob) return null;
  const base = await fetchJson(baseBlob.url);
  if (!base) return null;
  const events = (await Promise.all(
    blobs.filter((b) => b.pathname.includes('/ev/')).map((b) => fetchJson(b.url))
  )).filter(Boolean);
  return { order: fold(base, events) };
}

async function listOrders(token) {
  const blobs = await blobList('orders/', token, 500);
  const byId = {};
  blobs.forEach((b) => {
    const m = b.pathname.match(/^orders\/([^/]+)\//);
    if (!m) return;
    (byId[m[1]] = byId[m[1]] || []).push(b);
  });
  const orders = await Promise.all(Object.keys(byId).map(async (id) => {
    const group = byId[id];
    const baseBlob = group.find((b) => b.pathname.endsWith('/order.json'));
    if (!baseBlob) return null;
    const base = await fetchJson(baseBlob.url);
    if (!base) return null;
    const events = (await Promise.all(
      group.filter((b) => b.pathname.includes('/ev/')).map((b) => fetchJson(b.url))
    )).filter(Boolean);
    return fold(base, events);
  }));
  return orders.filter(Boolean).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ---------- the art that goes with an order ----------
async function loadArt(designId, token) {
  if (!designId) return null;
  const blobs = await blobList(`designs/pending/${designId}/`, token, 10);
  const metaBlob = blobs.find((b) => b.pathname.endsWith('meta.json'));
  if (metaBlob) {
    const m = await fetch(metaBlob.url).then((r) => r.json()).catch(() => null);
    if (m) return m;
  }
  const f = blobs.find((b) => !b.pathname.endsWith('.json'));
  return f ? { url: f.url, filename: f.pathname.split('/').pop(), warnings: [] } : null;
}

// ---------- the email Leo actually works from ----------
function orderSheet(order, tasks) {
  const a = order.address || {};
  const art = (order.design || {});
  return [
    `ORDER ${order.id} (${order.channel}${order.channel === 'card' ? ', paid' : ', awaiting e-transfer'})`,
    `total: ${money(order.amounts.total, order.amounts.currency)}`,
    '',
    ...order.items.map((i) => `${i.qty}x ${i.name}${i.amount ? ' - ' + money(i.amount, order.amounts.currency) : ''}`),
    '',
    `business: ${order.customer.business || '-'}`,
    `name: ${order.customer.name || '-'}`,
    `email: ${order.customer.email || '-'}`,
    `phone: ${order.customer.phone || '-'}`,
    `address: ${[a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(', ') || '-'}`,
    order.colours ? `machine colour: ${order.colours}` : null,
    '',
    art.id ? `DESIGN ${art.id} - approve before ordering labels` : 'DESIGN: none uploaded - chase the customer for their art',
    art.url ? `  original: ${art.url}` : null,
    art.proofUrl ? `  proof (with cut lines): ${art.proofUrl}` : null,
    art.printUrl ? `  PRINT FILE (send this to the printer): ${art.printUrl}` : null,
    art.width ? `  size: ${art.width}x${art.height}px` : (art.vector ? '  size: vector (scales fine)' : null),
    art.warnings && art.warnings.length ? `  FLAGS: ${art.warnings.join(' | ')}` : null,
    '',
    'TO ORDER:',
    ...(tasks || []).map((t) => `  [ ] ${t.label}${t.status === 'already-handled' ? '  (already handled)' : ''}`),
    '',
    `admin: https://sealedandco.ca/admin.html`,
  ].filter((x) => x !== null).join('\n');
}

async function emailSheet(order, tasks) {
  try {
    const fd = new URLSearchParams();
    fd.set('_subject', `${order.channel === 'card' ? 'NEW ORDER' : 'E-TRANSFER ORDER'} ${order.id} - $${(order.amounts.total / 100).toFixed(0)} - sealed & co.`);
    fd.set('order_sheet', orderSheet(order, tasks));
    fd.set('email', order.customer.email || 'orders@sealedandco.ca');
    await fetch(FORMSPREE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: fd.toString(),
    });
  } catch {}
}

// ---------- create from a paid Stripe session (idempotent) ----------
async function fromStripeSession(sid, { stripeKey, blobToken }) {
  const orderId = 'SC-' + sid.slice(-8).toUpperCase();
  const existing = await readOrder(orderId, blobToken);
  if (existing) return { ok: true, id: orderId, existing: true };

  const get = (path) => fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  }).then((r) => r.json());

  const s = await get(`checkout/sessions/${sid}`);
  if (!s || s.error) return { ok: false, code: 502, error: 'stripe', detail: s && s.error && s.error.message };
  if (s.payment_status !== 'paid') return { ok: false, code: 409, error: 'not-paid', detail: s.payment_status };

  const li = await get(`checkout/sessions/${sid}/line_items?limit=20`);
  const items = ((li && li.data) || []).map((x) => ({
    sku: (x.price && x.price.id) || null, name: x.description, qty: x.quantity, amount: x.amount_total,
  }));

  const ship = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || null;
  const addr = (ship && ship.address) || (s.customer_details && s.customer_details.address) || {};
  const biz = (s.custom_fields || []).find((f) => f.key === 'business_name');
  const designId = (s.metadata && s.metadata.design_id) || null;
  const art = await loadArt(designId, blobToken);
  const now = new Date().toISOString();

  const order = {
    id: orderId, createdAt: now, channel: 'card', stripeSessionId: sid,
    customer: {
      email: s.customer_details && s.customer_details.email,
      name: (ship && ship.name) || (s.customer_details && s.customer_details.name),
      phone: s.customer_details && s.customer_details.phone,
      business: biz && biz.text && biz.text.value,
    },
    address: addr,
    items,
    colours: (s.metadata && s.metadata.machine_colour) || null,
    amounts: { total: s.amount_total, currency: s.currency },
    design: designId ? { id: designId, status: 'review', ...(art || {}) } : null,
    state: designId ? 'art-review' : 'paid',
    timeline: [{ state: 'paid', at: now, note: 'stripe card payment' }],
    flags: {},
  };

  if (!(await createOrder(order, blobToken))) return { ok: false, code: 502, error: 'store' };

  let tasks = [];
  try { tasks = await suppliers.dispatch(order, blobToken); } catch {}
  await emailSheet(order, tasks);
  return { ok: true, id: orderId, tasks };
}

// ---------- create from an e-transfer request (not yet paid) ----------
async function createEtransfer(body, { blobToken }) {
  const now = new Date().toISOString();
  const orderId = 'SC-ET' + Date.now().toString(36).toUpperCase().slice(-6);
  const art = await loadArt(body.designId, blobToken);
  const items = Array.isArray(body.items) ? body.items.slice(0, 10).map((i) => ({
    sku: i.sku || null, name: String(i.name || '').slice(0, 120),
    qty: Math.min(99, Math.max(1, parseInt(i.qty, 10) || 1)),
    amount: Math.max(0, parseInt(i.amount, 10) || 0),
  })) : [];

  const order = {
    id: orderId, createdAt: now, channel: 'etransfer',
    customer: {
      email: String(body.email || '').slice(0, 160),
      name: String(body.name || '').slice(0, 120),
      phone: String(body.phone || '').slice(0, 40),
      business: String(body.business || '').slice(0, 120),
    },
    address: {},
    items,
    colours: String(body.colours || '').slice(0, 120) || null,
    amounts: { total: Math.max(0, parseInt(body.total, 10) || 0), currency: 'cad' },
    design: body.designId ? { id: body.designId, status: 'review', ...(art || {}) } : null,
    state: 'awaiting-payment',
    timeline: [{ state: 'awaiting-payment', at: now, note: 'e-transfer requested from the cart' }],
    flags: {},
  };

  if (!(await createOrder(order, blobToken))) return { ok: false, code: 502, error: 'store' };
  // no supplier tasks until the money lands
  await emailSheet(order, [{ label: 'send e-transfer details, then confirm payment in /admin.html' }]);
  return { ok: true, id: orderId };
}

module.exports = { fromStripeSession, createEtransfer, listOrders, readOrder, appendEvent, loadArt, STATES };
