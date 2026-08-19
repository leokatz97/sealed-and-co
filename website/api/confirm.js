// called by the thank-you page after Stripe redirects back with a session id.
// verifies the payment WITH STRIPE (never trusts the browser), writes a permanent
// order record to Blob, and emails Leo the order sheet. idempotent per session.

const FORMSPREE = 'https://formspree.io/f/mwleqded';
const suppliers = require('./_suppliers');

async function stripeGet(path, key) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return r.json();
}

module.exports = async (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!key || !blobToken) return res.status(503).json({ error: 'not-configured' });

  const sid = String(req.query.sid || '');
  if (!/^cs_(live|test)_[a-zA-Z0-9]+$/.test(sid)) return res.status(400).json({ error: 'bad-session' });

  const orderId = 'SC-' + sid.slice(-8).toUpperCase();
  const orderPath = `orders/${orderId}.json`;

  // idempotency: if the record exists, we're done
  try {
    const l = await fetch(`https://blob.vercel-storage.com/?prefix=orders/${orderId}&limit=1`, {
      headers: { authorization: `Bearer ${blobToken}`, 'x-api-version': '7' },
    }).then((r) => r.json());
    if (l && l.blobs && l.blobs.length) return res.status(200).json({ ok: true, id: orderId, existing: true });
  } catch {}

  const s = await stripeGet(`checkout/sessions/${sid}`, key);
  if (!s || s.error) return res.status(502).json({ error: 'stripe', detail: s && s.error && s.error.message });
  if (s.payment_status !== 'paid') return res.status(409).json({ error: 'not-paid', status: s.payment_status });

  const li = await stripeGet(`checkout/sessions/${sid}/line_items?limit=20`, key);
  const items = ((li && li.data) || []).map((x) => ({
    sku: (x.price && x.price.id) || null,
    name: x.description, qty: x.quantity, amount: x.amount_total,
  }));

  const ship = s.shipping_details || s.collected_information && s.collected_information.shipping_details || null;
  const addr = ship && ship.address ? ship.address : (s.customer_details && s.customer_details.address) || {};
  const bizField = (s.custom_fields || []).find((f) => f.key === 'business_name');
  const designId = (s.metadata && s.metadata.design_id) || null;

  // pull the art's meta sidecar (dimensions, warnings) written at upload time
  let art = null;
  if (designId) {
    try {
      const l = await fetch(`https://blob.vercel-storage.com/?prefix=designs/pending/${designId}/&limit=10`, {
        headers: { authorization: `Bearer ${blobToken}`, 'x-api-version': '7' },
      }).then((r) => r.json());
      const blobs = (l && l.blobs) || [];
      const metaBlob = blobs.find((b) => b.pathname.endsWith('meta.json'));
      if (metaBlob) art = await fetch(metaBlob.url).then((r) => r.json()).catch(() => null);
      if (!art) {
        const f = blobs.find((b) => !b.pathname.endsWith('meta.json'));
        if (f) art = { url: f.url, filename: f.pathname.split('/').pop(), warnings: [] };
      }
    } catch {}
  }
  const colours = (s.metadata && s.metadata.machine_colour) || null;

  const order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    channel: 'card',
    stripeSessionId: sid,
    customer: {
      email: s.customer_details && s.customer_details.email,
      name: (ship && ship.name) || (s.customer_details && s.customer_details.name),
      phone: s.customer_details && s.customer_details.phone,
      business: bizField && bizField.text && bizField.text.value,
    },
    address: addr,
    items,
    colours,
    amounts: { total: s.amount_total, currency: s.currency },
    design: designId ? { id: designId, status: 'review', ...(art || {}) } : null,
    state: designId ? 'art-review' : 'paid',
    timeline: [{ state: 'paid', at: new Date().toISOString() }],
    flags: {},
  };

  try {
    const put = await fetch(`https://blob.vercel-storage.com/${orderPath}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${blobToken}`,
        'x-api-version': '7',
        'x-content-type': 'application/json',
      },
      body: JSON.stringify(order, null, 2),
    });
    if (!put.ok) return res.status(502).json({ error: 'store' });
  } catch { return res.status(502).json({ error: 'store' }); }

  // decide which supplier orders this needs (phase 1: recorded as manual to-dos)
  let tasks = [];
  try { tasks = await suppliers.dispatch(order, blobToken); } catch {}

  // order sheet to Leo's inbox (existing Formspree route)
  const lines = items.map((i) => `${i.qty}x ${i.name} - $${(i.amount / 100).toFixed(2)}`).join('\n');
  const sheet = [
    `ORDER ${orderId} (card, paid)`,
    `total: $${(s.amount_total / 100).toFixed(2)} ${String(s.currency).toUpperCase()}`,
    '', lines, '',
    `business: ${order.customer.business || '-'}`,
    `name: ${order.customer.name || '-'}`,
    `email: ${order.customer.email || '-'}`,
    `phone: ${order.customer.phone || '-'}`,
    `address: ${[addr.line1, addr.line2, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}`,
    colours ? `machine colour: ${colours}` : null,
    designId ? `design: ${designId} (ART REVIEW - approve before ordering labels)` : 'design: NONE UPLOADED - chase the customer for their art',
    art && art.url ? `art file: ${art.url}` : null,
    art && (art.width || art.vector) ? `art size: ${art.vector ? 'vector (scales fine)' : art.width + 'x' + art.height + 'px'}` : null,
    art && art.warnings && art.warnings.length ? `art flags: ${art.warnings.join(' | ')}` : null,
    '',
    `stripe: https://dashboard.stripe.com/payments (search ${sid.slice(-8)})`,
    '',
    'TO ORDER:',
    ...tasks.map((t) => `  [ ] ${t.label}${t.mode === 'dropship' ? '  (SHIP TO CUSTOMER)' : ''}${t.status === 'already-handled' ? '  (already handled)' : ''}`),
  ].filter((x) => x !== null).join('\n');

  try {
    const fd = new URLSearchParams();
    fd.set('_subject', `NEW ORDER ${orderId} - $${(s.amount_total / 100).toFixed(0)} - sealed & co.`);
    fd.set('order_sheet', sheet);
    fd.set('email', order.customer.email || 'orders@sealedandco.ca');
    await fetch(FORMSPREE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: fd.toString(),
    });
  } catch {}

  return res.status(200).json({ ok: true, id: orderId });
};
