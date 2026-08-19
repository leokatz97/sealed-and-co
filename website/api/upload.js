// art upload before payment. see api/_art.js for the validation + storage.
const { receiveArt, readBody } = require('./_art');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'not-configured' });

  const body = await readBody(req);
  const r = await receiveArt({ body, name: req.query.name, token });
  if (!r.ok) return res.status(r.code || 400).json({ error: r.error, message: r.message });
  return res.status(200).json({
    designId: r.designId, url: r.meta.url, filename: r.meta.filename,
    warnings: r.meta.warnings, proofUrl: r.meta.proofUrl,
  });
};
