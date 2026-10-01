import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build, base } from './build.mjs';
await build();
const root = resolve('.');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.woff2':'font/woff2', '.woff':'font/woff', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    if (path.split('/').some(p => p.startsWith('.')) || path.startsWith('/node_modules/')) throw new Error('private path');
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw new Error('outside root');
    let body = await readFile(file);
    if (path === '/index.html') {
      body = body.toString().replaceAll(base, '/');
      body = body.replace(/<!-- Top.Mail.Ru counter -->[\s\S]*?<!-- \/Top.Mail.Ru counter -->/g, '')
        .replace(/<!-- Yandex.Metrika counter -->[\s\S]*?<!-- \/Yandex.Metrika counter -->/g, '')
        .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
        .replace(/<!-- Yandex.Metrika: цели по кнопкам тарифов -->[\s\S]*?<!-- \/Yandex.Metrika: цели по кнопкам тарифов -->/g, '');
    }
    res.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
