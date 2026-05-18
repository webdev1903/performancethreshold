import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const tryStat = async (p) => {
  try {
    return await stat(p);
  } catch {
    return null;
  }
};

const resolveFile = async (pathname) => {
  let candidate = join(DIST, pathname);
  let s = await tryStat(candidate);
  if (s?.isFile()) return candidate;
  if (s?.isDirectory()) {
    const idx = join(candidate, 'index.html');
    if ((await tryStat(idx))?.isFile()) return idx;
  }
  const html = join(DIST, pathname + '.html');
  if ((await tryStat(html))?.isFile()) return html;
  const idx2 = join(DIST, pathname, 'index.html');
  if ((await tryStat(idx2))?.isFile()) return idx2;
  return null;
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);
    pathname = normalize(pathname);
    if (pathname.startsWith('..')) return res.writeHead(400).end('Bad request');
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    const filepath = await resolveFile(pathname);
    if (!filepath) {
      const notFound = await readFile(join(DIST, '404.html')).catch(() => null);
      if (notFound) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(notFound);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    const data = await readFile(filepath);
    const type = MIME[extname(filepath).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type };
    if (/\/_astro\/|\.(js|mjs|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(filepath)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch (err) {
    console.error('[server] error', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[server] Performance Threshold listening on http://${HOST}:${PORT}`);
  console.log(`[server] DIST=${DIST}`);
});

const shutdown = (sig) => {
  console.log(`[server] ${sig} received, closing.`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
