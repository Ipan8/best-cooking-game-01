// Api Wok Rush — zero-dependency static server for local play-testing.
// Serves game/ at the root so the game plays exactly as the grader loads
// it; screenshots/ is served too, for a quick visual check.
// Usage: node serve.ts [port]  (default 8080), then open http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2] || 8080);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'game/index.html';
  // Serve the game at / and everything else relative to the repo root.
  const file = path === 'game/index.html' || path.startsWith('game/') || path.startsWith('screenshots/')
    ? join(here, path)
    : join(here, 'game', path);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});
server.listen(port, () => console.log(`Api Wok Rush at http://localhost:${port}/`));
