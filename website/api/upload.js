// receives a design file (raw body), validates it, stores it in Vercel Blob under a
// new design id. 4MB cap (serverless relay limit) - bigger files use the
// "email it after checkout" path. returns { designId, url, filename }.

const EXT_OK = { png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf' };
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_PNG_SIDE = 500; // px - anything smaller can't print sharp at sticker size

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(req.body)) return resolve(req.body);
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function pngSize(buf) {
  // PNG header: bytes 16-23 hold width/height big-endian (inside IHDR)
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'not-configured' });

  const name = String(req.query.name || 'design').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!EXT_OK[ext]) return res.status(400).json({ error: 'type', message: 'use a png, svg, or pdf file' });

  const body = await readBody(req);
  if (!body || body.length < 100) return res.status(400).json({ error: 'empty', message: 'that file looks empty - try again' });
  if (body.length > MAX_BYTES) return res.status(413).json({ error: 'size', message: 'files over 4mb: choose "email it after checkout" instead' });

  if (ext === 'png') {
    const dim = pngSize(body);
    if (!dim) return res.status(400).json({ error: 'type', message: "that doesn't look like a real png - re-export and try again" });
    if (Math.min(dim.w, dim.h) < MIN_PNG_SIDE) {
      return res.status(400).json({ error: 'resolution', message: `that image is ${dim.w}x${dim.h}px - too small to print sharp. send at least ${MIN_PNG_SIDE}px on the short side (300dpi at print size).` });
    }
  }

  const designId = 'dsn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const path = `designs/pending/${designId}/${name}`;
  try {
    const r = await fetch(`https://blob.vercel-storage.com/${path}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': '7',
        'x-content-type': EXT_OK[ext],
        'x-cache-control-max-age': '31536000',
      },
      body,
    });
    const d = await r.json();
    if (!r.ok || !d.url) return res.status(502).json({ error: 'store', detail: (d && d.error) || r.status });
    return res.status(200).json({ designId, url: d.url, filename: name });
  } catch (e) {
    return res.status(502).json({ error: 'network' });
  }
};
