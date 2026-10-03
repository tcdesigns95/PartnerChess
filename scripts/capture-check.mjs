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
async function play(socket, gameId, playerId, from, to) {
  const res = await emit(socket, 'makeMove', { gameId, playerId, from, to });
  if (!res.ok) throw new Error(`${from}${to}: ${res.error}`);
  return res.game;
}

const white = connect();
const black = connect();
await new Promise((r) => white.on('connect', r));
await new Promise((r) => black.on('connect', r));

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
async function openSeat(session) {
  const url = `http://localhost:8081/?seat=${encodeURIComponent(JSON.stringify(session))}`;
  await send('Page.navigate', { url: 'http://localhost:8081/' });
  await new Promise((r) => setTimeout(r, 400));
  await evaluate(`localStorage.clear(); document.cookie='chess.session=; Max-Age=0; Path=/';`);
  await send('Page.navigate', { url });
}
async function waitFor(text) {
  const start = Date.now();
  let body = '';
  while (Date.now() - start < 20000) {
    body = await evaluate(`document.body ? document.body.innerText : ''`);
    if (body.includes(text)) return body;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`missing ${text}\n${body}`);
}
async function shot(file) {
  const image = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(image.data, 'base64'));
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await send('Page.enable');

const created = await emit(white, 'createGame', { name: 'Daddy', preferColor: 'w' });
if (!created.ok) throw new Error(created.error);
const joined = await emit(black, 'joinGame', { code: created.game.code, name: 'Baby' });
if (!joined.ok) throw new Error(joined.error);
await play(white, created.game.id, created.playerId, 'e2', 'e4');
await play(black, created.game.id, joined.playerId, 'f7', 'f5');
const checkGame = await play(white, created.game.id, created.playerId, 'd1', 'h5');
if (!checkGame.isCheck || checkGame.isCheckmate) throw new Error('expected a check, not mate');

await openSeat({
  gameId: created.game.id,
  playerId: joined.playerId,
  color: 'b',
  code: created.game.code,
  name: 'Baby',
});
const checkText = await waitFor('Check');
const checkCue = await evaluate(`(() => {
  const el = document.querySelector('[aria-label="Check"]');
  if (!el) return null;
  const style = getComputedStyle(el);
  return { border: style.borderTopColor, width: style.borderTopWidth, shadow: style.boxShadow };
})()`);
if (!checkCue) throw new Error(`no check frame\n${checkText}`);
if (checkCue.border !== 'rgb(255, 46, 108)') throw new Error(`check color ${checkCue.border}`);
await shot('/opt/cursor/artifacts/king_in_check.png');

const mateWhite = connect();
const mateBlack = connect();
await new Promise((r) => mateWhite.on('connect', r));
await new Promise((r) => mateBlack.on('connect', r));
const mateCreated = await emit(mateWhite, 'createGame', { name: 'Daddy', preferColor: 'w' });
const mateJoined = await emit(mateBlack, 'joinGame', { code: mateCreated.game.code, name: 'Baby' });
await play(mateWhite, mateCreated.game.id, mateCreated.playerId, 'f2', 'f3');
await play(mateBlack, mateCreated.game.id, mateJoined.playerId, 'e7', 'e5');
await play(mateWhite, mateCreated.game.id, mateCreated.playerId, 'g2', 'g4');
const mateGame = await play(mateBlack, mateCreated.game.id, mateJoined.playerId, 'd8', 'h4');
if (!mateGame.isCheckmate) throw new Error(`expected checkmate, fen ${mateGame.fen}`);

await openSeat({
  gameId: mateCreated.game.id,
  playerId: mateCreated.playerId,
  color: 'w',
  code: mateCreated.game.code,
  name: 'Daddy',
});
const mateText = await waitFor('Checkmate');
const mateCue = await evaluate(`(() => {
  const el = document.querySelector('[aria-label="Checkmate"]');
  if (!el) return null;
  const style = getComputedStyle(el);
  return { border: style.borderTopColor, width: style.borderTopWidth, fill: style.backgroundColor };
})()`);
if (!mateCue) throw new Error(`no checkmate frame\n${mateText}`);
if (mateCue.border !== 'rgb(255, 46, 108)') throw new Error(`mate color ${mateCue.border}`);
if (!mateText.includes('Checkmate')) throw new Error(mateText);
await shot('/opt/cursor/artifacts/king_in_checkmate.png');

console.log(JSON.stringify({ check: checkCue, mate: mateCue, mateHeadline: mateText.split('\n')[0] }));
ws.close();
white.close();
black.close();
mateWhite.close();
mateBlack.close();
await fetch(`http://127.0.0.1:9222/json/close/${page.id}`);
