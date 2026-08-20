// the thank-you page calls this after Stripe redirects back. verifies the payment
// with Stripe server-side, then writes the order record. idempotent.
const { fromStripeSession, readOrder } = require('./_order');
const { itemNeeds } = require('./_suppliers');

module.exports = async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!stripeKey || !blobToken) return res.status(503).json({ error: 'not-configured' });

  const sid = String(req.query.sid || '');
  if (!/^cs_(live|test)_[a-zA-Z0-9]+$/.test(sid)) return res.status(400).json({ error: 'bad-session' });

  const r = await fromStripeSession(sid, { stripeKey, blobToken });
  if (!r.ok) return res.status(r.code || 502).json({ error: r.error, detail: r.detail });

  // does this order still owe us artwork? the thank-you page uses this to ask for it
  let needsArt = false;
  const found = await readOrder(r.id, blobToken);
  if (found) {
    const o = found.order;
    const wantsLabels = (o.items || []).some((i) => itemNeeds(i).includes('labels'));
    needsArt = wantsLabels && !(o.design && (o.design.id || o.design.path));
  }
  return res.status(200).json({ ok: true, id: r.id, existing: !!r.existing, needsArt });
};
