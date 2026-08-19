// Stripe webhook. server to server, so an order is recorded even if the customer
// closes the tab before the redirect lands.
//
// security note: we never trust the webhook body. we take the session id from it and
// re-fetch that session from Stripe with our own key, and only record it if Stripe
// says payment_status is paid. a forged call can therefore do nothing except make us
// re-check a real payment, which is idempotent.
const { fromStripeSession } = require('./_order');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!stripeKey || !blobToken) return res.status(503).json({ error: 'not-configured' });

  let evt = req.body;
  if (typeof evt === 'string') { try { evt = JSON.parse(evt); } catch { evt = null; } }
  const type = evt && evt.type;
  const obj = (evt && evt.data && evt.data.object) || {};
  const sid = obj.id;

  if (type !== 'checkout.session.completed' || !/^cs_(live|test)_[a-zA-Z0-9]+$/.test(String(sid || ''))) {
    return res.status(200).json({ ignored: true, type: type || null });
  }

  const r = await fromStripeSession(sid, { stripeKey, blobToken });
  // always 200 so Stripe doesn't retry forever on our own bugs
  return res.status(200).json({ ok: r.ok, id: r.id || null, error: r.error || null });
};
