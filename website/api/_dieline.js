// builds print-ready artwork for the 2x2" front sticker from a customer's logo.
// no image libraries: the logo is embedded as a data URI inside an SVG that carries
// real physical dimensions, so a printer opens it at exactly the right size.
//
//   bleed 2.25" (675px @300dpi) · trim 2.00" (600px) · safe 1.75" (525px)
// the logo is scaled to fit the SAFE box, so nothing important can be trimmed off.

const DPI = 300;
const BLEED_IN = 2.25, TRIM_IN = 2.0, SAFE_IN = 1.75;
const BLEED = Math.round(BLEED_IN * DPI);   // 675
const TRIM = Math.round(TRIM_IN * DPI);     // 600
const SAFE = Math.round(SAFE_IN * DPI);     // 525

function fitBox(w, h, max) {
  const scale = Math.min(max / w, max / h);
  const fw = w * scale, fh = h * scale;
  return { w: fw, h: fh, x: (BLEED - fw) / 2, y: (BLEED - fh) / 2 };
}

function printSvg({ dataUri, width, height }) {
  const b = fitBox(width, height, SAFE);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${BLEED_IN}in" height="${BLEED_IN}in" viewBox="0 0 ${BLEED} ${BLEED}">
<title>sealed &amp; co. - 2x2in front sticker (print file, ${BLEED_IN}in with bleed)</title>
<image x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" xlink:href="${dataUri}"/>
</svg>`;
}

function proofSvg({ dataUri, width, height, filename }) {
  const b = fitBox(width, height, SAFE);
  const t = (BLEED - TRIM) / 2, sf = (BLEED - SAFE) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${BLEED_IN}in" height="${BLEED_IN}in" viewBox="0 0 ${BLEED} ${BLEED + 60}">
<title>sealed &amp; co. - proof for ${filename}</title>
<rect x="0" y="0" width="${BLEED}" height="${BLEED}" fill="#FFFAF5"/>
<image x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" xlink:href="${dataUri}"/>
<rect x="1" y="1" width="${BLEED - 2}" height="${BLEED - 2}" fill="none" stroke="#E85D9A" stroke-width="2"/>
<rect x="${t}" y="${t}" width="${TRIM}" height="${TRIM}" fill="none" stroke="#0B4924" stroke-width="2" stroke-dasharray="10 8"/>
<rect x="${sf}" y="${sf}" width="${SAFE}" height="${SAFE}" fill="none" stroke="#8DBF5A" stroke-width="2" stroke-dasharray="4 8"/>
<text x="8" y="${BLEED + 24}" font-family="Helvetica,Arial,sans-serif" font-size="20" fill="#0B4924">pink = bleed 2.25in · green dash = cut line 2in · light = safe area 1.75in</text>
<text x="8" y="${BLEED + 50}" font-family="Helvetica,Arial,sans-serif" font-size="20" fill="#0B4924">${filename} · ${width}x${height}px · sealed &amp; co. 2x2in front sticker</text>
</svg>`;
}

// returns null for vector art (svg/pdf already scales - it goes to the printer as-is)
function buildPrintFiles({ buffer, mime, width, height, filename }) {
  if (!width || !height) return null;
  if (mime !== 'image/png' && mime !== 'image/jpeg') return null;
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
  return {
    print: printSvg({ dataUri, width, height }),
    proof: proofSvg({ dataUri, width, height, filename }),
    spec: { bleedIn: BLEED_IN, trimIn: TRIM_IN, safeIn: SAFE_IN, dpi: DPI },
  };
}

module.exports = { buildPrintFiles, BLEED, TRIM, SAFE, DPI };
