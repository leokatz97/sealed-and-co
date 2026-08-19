// art attached AFTER payment, for customers who checked out without a file.
// the order is found from the Stripe session id, so only someone holding that id
// (i.e. the buyer, fresh off checkout, or their emailed link) can attach to it.
const { receiveArt, readBody } = require('./_art');
const { readOrder, appendEvent } = require('./_order');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'not-configured' });

  const sid = String(req.query.sid || '');
  const oid = String(req.query.oid || '');
  let orderId = null;
  if (/^cs_(live|test)_[a-zA-Z0-9]+$/.test(sid)) orderId = 'SC-' + sid.slice(-8).toUpperCase();
  else if (/^SC-[A-Z0-9]{4,12}$/.test(oid)) orderId = oid;
  if (!orderId) return res.status(400).json({ error: 'bad-order' });

  const found = await readOrder(orderId, token);
  if (!found) return res.status(404).json({ error: 'not-found' });
  if (found.order.state === 'handed-off' || found.order.state === 'cancelled') {
    return res.status(409).json({ error: 'closed', message: 'that order is already closed - contact us and we will sort it out' });
  }

  const body = await readBody(req);
  const r = await receiveArt({ body, name: req.query.name, token });
  if (!r.ok) return res.status(r.code || 400).json({ error: r.error, message: r.message });

  const ok = await appendEvent(orderId, {
    state: 'art-review',
    note: 'design attached after checkout: ' + r.meta.filename,
    design: Object.assign({ id: r.designId, status: 'review' }, r.meta),
  }, token);
  if (!ok) return res.status(502).json({ error: 'store' });

  return res.status(200).json({ ok: true, orderId, designId: r.designId, warnings: r.meta.warnings, proofUrl: r.meta.proofUrl });
};
