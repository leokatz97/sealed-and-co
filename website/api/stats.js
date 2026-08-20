// funnel counts for the order desk. counts by listing blob paths, so it never
// downloads the events themselves.
const BLOB = 'https://blob.vercel-storage.com';
const STEPS = ['product_viewed', 'add_to_cart', 'design_uploaded', 'checkout_started', 'order_placed'];

function ok(req) {
  const t = process.env.ADMIN_TOKEN;
  if (!t) return false;
  const given = req.query.k || (req.headers.authorization || '').replace(/^Bearer /, '');
  return typeof given === 'string' && given.length > 8 && given === t;
}

async function countPrefix(prefix, token) {
  let total = 0, cursor = null, guard = 0;
  do {
    const u = `${BLOB}/?prefix=${encodeURIComponent(prefix)}&limit=1000` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
    const d = await fetch(u, { headers: { authorization: `Bearer ${token}`, 'x-api-version': '7' } })
      .then((r) => r.json()).catch(() => null);
    if (!d) break;
    total += ((d.blobs) || []).length;
    cursor = d.hasMore ? d.cursor : null;
  } while (cursor && ++guard < 10);
  return total;
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'not-configured' });
  if (!ok(req)) return res.status(401).json({ error: 'unauthorized' });

  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const funnel = {};
  await Promise.all(STEPS.map(async (step) => {
    const counts = await Promise.all(dates.map((d) => countPrefix(`analytics/${d}/${step}/`, token)));
    funnel[step] = counts.reduce((a, b) => a + b, 0);
  }));

  return res.status(200).json({ days, funnel, steps: STEPS });
};
