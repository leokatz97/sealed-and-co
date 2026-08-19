// the thank-you page calls this after Stripe redirects back. verifies the payment
// with Stripe server-side, then writes the order record. idempotent.
const { fromStripeSession } = require('./_order');

module.exports = async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!stripeKey || !blobToken) return res.status(503).json({ error: 'not-configured' });

  const sid = String(req.query.sid || '');
  if (!/^cs_(live|test)_[a-zA-Z0-9]+$/.test(sid)) return res.status(400).json({ error: 'bad-session' });

  const r = await fromStripeSession(sid, { stripeKey, blobToken });
  if (!r.ok) return res.status(r.code || 502).json({ error: r.error, detail: r.detail });
  return res.status(200).json({ ok: true, id: r.id, existing: !!r.existing });
};
