import http from 'http';
import httpProxy from 'http-proxy';

const PUBLIC_PORT = Number(process.env.PUBLIC_PORT || 3080);
const WEB_TARGET = process.env.WEB_TARGET || 'http://127.0.0.1:8081';
const SOCKET_TARGET = process.env.SOCKET_TARGET || 'http://127.0.0.1:3001';

const proxy = httpProxy.createProxyServer({
  xfwd: true,
  ws: true,
});

proxy.on('error', (err, _req, res) => {
  console.error('proxy error', err.message);
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway');
  }
});

function isSocketPath(url = '') {
  return url.startsWith('/socket.io') || url.startsWith('/health');
}

const server = http.createServer((req, res) => {
  const target = isSocketPath(req.url || '') ? SOCKET_TARGET : WEB_TARGET;
  proxy.web(req, res, { target, changeOrigin: true });
});

server.on('upgrade', (req, socket, head) => {
  const target = isSocketPath(req.url || '') ? SOCKET_TARGET : WEB_TARGET;
  proxy.ws(req, socket, head, { target, changeOrigin: true });
});

server.listen(PUBLIC_PORT, () => {
  console.log(`Public gateway on :${PUBLIC_PORT} → web ${WEB_TARGET}, socket ${SOCKET_TARGET}`);
});
