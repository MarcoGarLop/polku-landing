// Local server for the Polku landing. Run: npm start  → http://localhost:4180
// (Opening index.html straight from disk also works; the server adds Range support so the videos loop smoothly.)
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4180);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let file = join(ROOT, path || 'index.html');
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return res.writeHead(403).end();
  if (/[/\\](tools|node_modules|\.git)([/\\]|$)/.test(file.slice(ROOT.length))) return res.writeHead(404).end();
  try {
    let st = await stat(file);
    if (st.isDirectory()) { file = join(file, 'index.html'); st = await stat(file); }
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? +range[1] : 0, end = range[2] ? +range[2] : st.size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
      return createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`Polku landing on http://localhost:${PORT}`));
