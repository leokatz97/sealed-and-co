// validates a customer's artwork against the 2x2in front-sticker dieline, stores it,
// builds the print + proof files, and writes a meta sidecar. shared by /api/upload
// (before payment) and /api/attach (after payment, when art was deferred).

const { buildPrintFiles } = require('./_dieline');

const EXT_OK = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};
const MAX_BYTES = 4 * 1024 * 1024;

// sticker spec: 2" x 2" finished, 2.25" with bleed, 300dpi
const MIN_PX = 600;        // 2" at 300dpi - hard floor
const BLEED_PX = 675;      // 2.25" at 300dpi - no bleed room below this
const RATIO_WARN = 1.5;    // off-square enough to mention
const RATIO_REJECT = 3;    // clearly not sticker art

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    const isSOF = (m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) ||
                  (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf);
    if (isSOF) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

async function blobPut(path, body, contentType, token) {
  const r = await fetch(`https://blob.vercel-storage.com/${path}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-content-type': contentType,
      'x-cache-control-max-age': '31536000',
    },
    body,
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, url: d.url, detail: d.error || r.status };
}


function readBody(req) {
  return new Promise((resolve, reject) => {
    if (Buffer.isBuffer(req.body)) return resolve(req.body);
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// returns { ok, code, error, message } or { ok: true, designId, meta }
async function receiveArt({ body, name, token }) {
  const clean = String(name || 'design').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const ext = (clean.split('.').pop() || '').toLowerCase();
  if (!EXT_OK[ext]) return { ok: false, code: 400, error: 'type', message: 'use a png, jpg, svg, or pdf file' };
  if (!body || body.length < 100) return { ok: false, code: 400, error: 'empty', message: 'that file looks empty - try again' };
  if (body.length > MAX_BYTES) return { ok: false, code: 413, error: 'size', message: 'that file is over 4mb - export it smaller, or email it to us and we will attach it' };

  const warnings = [];
  let dim = null;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    dim = ext === 'png' ? pngSize(body) : jpegSize(body);
    if (!dim || !dim.w || !dim.h) return { ok: false, code: 400, error: 'type', message: "that file didn't open as a real image - re-export and try again" };
    const short = Math.min(dim.w, dim.h);
    const ratio = Math.max(dim.w, dim.h) / short;
    if (short < MIN_PX) return { ok: false, code: 400, error: 'resolution', message: `that image is ${dim.w}x${dim.h}px. our sticker prints 2x2 inches, so we need at least ${MIN_PX}px on the short side to stay sharp.` };
    if (ratio > RATIO_REJECT) return { ok: false, code: 400, error: 'shape', message: `that art is ${dim.w}x${dim.h}px, far wider than it is tall. the sticker is 2x2 inches - send square-ish art, or crop it to the part you want on the can.` };
    if (short < BLEED_PX) warnings.push('tight for bleed (under 675px)');
    if (ratio > RATIO_WARN) warnings.push(`off-square (${dim.w}x${dim.h}) - we'll check it fits the 2x2 sticker`);
  }

  const designId = 'dsn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const stored = await blobPut(`designs/pending/${designId}/${clean}`, body, EXT_OK[ext], token);
  if (!stored.ok || !stored.url) return { ok: false, code: 502, error: 'store', message: 'we could not save that file - try again' };

  let printUrl = null, proofUrl = null;
  const pf = buildPrintFiles({ buffer: body, mime: EXT_OK[ext], width: dim && dim.w, height: dim && dim.h, filename: clean });
  if (pf) {
    const a = await blobPut(`designs/pending/${designId}/print-2x2.svg`, pf.print, 'image/svg+xml', token);
    const b = await blobPut(`designs/pending/${designId}/proof-2x2.svg`, pf.proof, 'image/svg+xml', token);
    printUrl = a.url || null; proofUrl = b.url || null;
  }

  const meta = {
    designId, filename: clean, url: stored.url, type: EXT_OK[ext], bytes: body.length,
    width: dim ? dim.w : null, height: dim ? dim.h : null, vector: !dim, warnings,
    sticker: '2x2in front sticker', printUrl, proofUrl,
    printSpec: pf ? pf.spec : null, uploadedAt: new Date().toISOString(),
  };
  await blobPut(`designs/pending/${designId}/meta.json`, JSON.stringify(meta, null, 2), 'application/json', token);
  return { ok: true, designId, meta };
}

module.exports = { receiveArt, readBody };
