// tiny first-party funnel counter. one empty blob per event, with the event name in
// the path, so counting is a prefix listing and never a read-modify-write.
// no cookies, no ids, no personal data - just how many people reached each step.

const BLOB = 'https://blob.vercel-storage.com';
const ALLOWED = new Set(['product_viewed', 'add_to_cart', 'design_uploaded', 'checkout_started', 'order_placed']);

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const name = body && body.name;
  if (!ALLOWED.has(name)) return res.status(204).end();

  const day = new Date().toISOString().slice(0, 10);
  const tag = String((body && body.tag) || 'all').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'all';
  const path = `analytics/${day}/${name}/${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.json`;

  try {
    await fetch(`${BLOB}/${path}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`, 'x-api-version': '7',
        'x-content-type': 'application/json', 'x-cache-control-max-age': '31536000',
      },
      body: '{}',
    });
  } catch {}
  return res.status(204).end();
};
