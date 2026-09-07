import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = new Set(['popup.css', 'lib/render.js', 'lib/usage.js', 'lib/badge.js', 'tests/demo/demo.js', 'icons/icon-48.png']);
http.createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1').pathname.slice(1);
    if (path === 'badge-preview') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(await readFile(resolve(root, 'tests/demo/badge.html'), 'utf8')); return;
    }
    if (path === '' || path === 'preview') {
      let html = await readFile(resolve(root, 'popup.html'), 'utf8');
      html = html.replace('src="popup.js"', 'src="tests/demo/demo.js"').replace('<main>', '<div style="padding:12px;background:#ffe7a8;color:#272014"><strong>CENÁRIO FICTÍCIO — não é uma consulta</strong><label for="scenario">Cenário de revisão</label><select id="scenario"><option value="success">Sucesso</option><option value="loading">Atualizando</option><option value="error">Falha temporária</option><option value="auth">Sem login privado</option><option value="partial">Dados parciais</option></select><label for="scale">Escala do conteúdo</label><select id="scale"><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select><p id="qaResult" role="status"></p></div><main>');
      response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return;
    }
    if (!allowed.has(path)) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript; charset=utf-8' : path.endsWith('.css') ? 'text/css; charset=utf-8' : 'image/png');
    response.end(await readFile(resolve(root, path)));
  } catch { response.writeHead(500); response.end('Preview unavailable'); }
}).listen(8765, '127.0.0.1', () => console.log('Preview fictício: http://127.0.0.1:8765/preview'));
