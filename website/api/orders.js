// admin API: list orders, advance state, add a note. protected by ADMIN_TOKEN.
const { listOrders, readOrder, appendEvent, STATES } = require('./_order');
const suppliers = require('./_suppliers');

function ok(req) {
  const t = process.env.ADMIN_TOKEN;
  if (!t) return false;
  const given = req.query.k || (req.headers.authorization || '').replace(/^Bearer /, '');
  return typeof given === 'string' && given.length > 8 && given === t;
}

module.exports = async (req, res) => {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return res.status(503).json({ error: 'not-configured' });
  if (!ok(req)) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    const orders = await listOrders(blobToken);
    return res.status(200).json({ orders, states: STATES });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || !body.id) return res.status(400).json({ error: 'missing-id' });

    const found = await readOrder(String(body.id), blobToken);
    if (!found) return res.status(404).json({ error: 'not-found' });
    const order = found.order;
    const now = new Date().toISOString();
    const ev = { at: now };

    if (body.state) {
      if (!STATES.includes(body.state)) return res.status(400).json({ error: 'bad-state' });
      ev.state = body.state;
      if (body.note) ev.note = String(body.note).slice(0, 300);

      if (body.state === 'art-approved') {
        ev.artStatus = 'approved';
        // delivery promise: 5-7 business days from art approval
        const d = new Date(); let added = 0;
        while (added < 7) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) added++; }
        ev.dueBy = d.toISOString().slice(0, 10);
      }
      if (body.state === 'paid' && order.channel === 'etransfer') {
        ev.paidAt = now;
        try { ev.supplierTasks = await suppliers.dispatch(order, blobToken); } catch {}
      }
    } else if (body.note) {
      ev.note = String(body.note).slice(0, 300);
    } else if (!body.flag) {
      return res.status(400).json({ error: 'nothing-to-do' });
    }

    if (body.flag) ev.flags = { [String(body.flag).slice(0, 20)]: !!body.value };

    if (!(await appendEvent(order.id, ev, blobToken))) return res.status(502).json({ error: 'store' });
    return res.status(200).json({ ok: true, applied: ev });
  }

  return res.status(405).json({ error: 'method' });
};
