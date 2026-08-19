// an e-transfer request from the cart. records a real order (awaiting-payment) and
// emails Leo the order sheet, so e-transfer orders live in the same place as card ones.
const { createEtransfer } = require('./_order');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return res.status(503).json({ error: 'not-configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !body.email || !body.name) return res.status(400).json({ error: 'missing-fields' });

  const r = await createEtransfer(body, { blobToken });
  if (!r.ok) return res.status(r.code || 502).json({ error: r.error });
  return res.status(200).json({ ok: true, id: r.id });
};
