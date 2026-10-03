import { writeFileSync } from 'node:fs';
import { io } from 'socket.io-client';

function connect() {
  return io('http://127.0.0.1:3001', { path: '/api/socket', transports: ['websocket'], forceNew: true });
}
function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), 8000);
    socket.emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

const black = connect();
const white = connect();
await new Promise((r) => black.on('connect', r));
await new Promise((r) => white.on('connect', r));
const created = await emit(black, 'createGame', { name: 'Baby', preferColor: 'b' });
if (!created.ok) throw new Error(created.error);
const joined = await emit(white, 'joinGame', { code: created.game.code, name: 'Daddy' });
if (!joined.ok) throw new Error(joined.error);
const first = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: joined.playerId,
  from: 'e2',
  to: 'e4',
});
if (!first.ok) throw new Error(first.error);

const session = {
  gameId: created.game.id,
  playerId: created.playerId,
  color: 'b',
  code: created.game.code,
  name: 'Baby',
};
const url = `http://localhost:8081/?seat=${encodeURIComponent(JSON.stringify(session))}`;

const pageRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('http://localhost:8081/')}`, {
  method: 'PUT',
});
const page = await pageRes.json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 15000);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:8081/' });
await new Promise((r) => setTimeout(r, 800));
await evaluate(`localStorage.clear(); document.cookie='chess.session=; Max-Age=0; Path=/';`);
await send('Page.navigate', { url });

const start = Date.now();
let body = '';
while (Date.now() - start < 20000) {
  body = await evaluate(`document.body ? document.body.innerText : ''`);
  if (body.includes('Playing black') && body.includes('Your move')) break;
  await new Promise((r) => setTimeout(r, 300));
}
if (!body.includes('Playing black') || /white vs/i.test(body)) {
  throw new Error(`header mismatch:\n${body}`);
}

const e7 = await evaluate(`(() => {
  const el = document.querySelector('[aria-label="e7"]');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
const e5 = await evaluate(`(() => {
  const el = document.querySelector('[aria-label="e5"]');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
await click(e7.x, e7.y);
await new Promise((r) => setTimeout(r, 200));
await click(e5.x, e5.y);
await new Promise((r) => setTimeout(r, 800));
body = await evaluate(`document.body ? document.body.innerText : ''`);
const pawnOnE5 = await evaluate(`!!document.querySelector('[aria-label="e5"] [aria-label="bp"]')`);
if (!pawnOnE5) throw new Error(`pawn did not stay on e5\n${body}`);
if (/white vs/i.test(body)) throw new Error(`still says white vs\n${body}`);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/opt/cursor/artifacts/playing_black_move_stays.png', Buffer.from(shot.data, 'base64'));
console.log(body.split('\n').slice(0, 8).join(' | '));
ws.close();
black.close();
white.close();
await fetch(`http://127.0.0.1:9222/json/close/${page.id}`);
