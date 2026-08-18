// tiny static server for local preview — python3 -m http.server can't run in the
// sandbox (its argparse default calls os.getcwd(), which is blocked)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  // dev-only upload endpoint so browser-generated brand assets can be saved to disk
  if (req.method === 'POST' && req.url.startsWith('/upload')) {
    const name = new URL(req.url, 'http://x').searchParams.get('name') || '';
    if (!/^[\w.-]+\.png$/.test(name)) { res.writeHead(400).end('bad name'); return; }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.mkdirSync(path.join(ROOT, 'brand'), {recursive: true});
      fs.writeFileSync(path.join(ROOT, 'brand', name), Buffer.concat(chunks));
      res.writeHead(200, {'Content-Type': 'text/plain'}).end('saved ' + name);
    });
    return;
  }
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, {'Content-Type': 'text/plain'}).end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
