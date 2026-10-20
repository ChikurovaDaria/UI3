import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4186);
const marker = 'last-hunt-local-v1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Last-Hunt-Server', marker);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  const reply = (code, message) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(message); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, 'Method not allowed');
  let pathname;
  try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch { return reply(400, 'Invalid URL encoding'); }
  if (pathname === '/__last_hunt_health') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(req.method === 'HEAD' ? undefined : `<title>${marker}</title>`);
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.includes(':')) return reply(400, 'Invalid path');
  const filename = path.resolve(root, '.' + pathname);
  const relative = path.relative(root, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) return reply(403, 'Forbidden');
  try {
    const target = (await stat(filename)).isDirectory() ? path.join(filename, 'index.html') : filename;
    const actualRelative = path.relative(await realpath(root), await realpath(target));
    if (actualRelative.startsWith('..') || path.isAbsolute(actualRelative)) return reply(403, 'Forbidden');
    const data = await readFile(target);
    const type = mime[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + (/^(text\/|application\/json|image\/svg)/.test(type) ? '; charset=utf-8' : ''), 'Content-Length': data.length });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) { reply(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500, 'File unavailable'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`The Last Hunt: http://127.0.0.1:${port}/`));
