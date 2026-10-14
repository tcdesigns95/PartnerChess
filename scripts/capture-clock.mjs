import { writeFileSync } from 'node:fs';

const pageRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('http://localhost:8081/')}`, {
  method: 'PUT',
});
if (!pageRes.ok) throw new Error(`open tab ${pageRes.status}`);
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
    const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 20000);
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
async function center(text) {
  return evaluate(`(() => {
    const el = [...document.querySelectorAll('*')].find((node) =>
      [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === ${JSON.stringify(text)}),
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
}
async function waitFor(text) {
  const start = Date.now();
  let body = '';
  while (Date.now() - start < 25000) {
    body = await evaluate(`document.body ? document.body.innerText : ''`);
    if (body.includes(text)) return body;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`missing ${text}\\n${body}`);
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
await send('Page.navigate', { url: 'http://localhost:8081/' });
await waitFor('10 min');
const homeShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/opt/cursor/artifacts/clock_choices.png', Buffer.from(homeShot.data, 'base64'));

const play = await center('PLAY GAME');
if (!play) throw new Error('no play button');
await click(play.x, play.y);
const board = await waitFor('Playing ');
if (!/\d+:\d{2}/.test(board)) throw new Error(`no clock on the board\\n${board}`);
await new Promise((r) => setTimeout(r, 600));
const boardShot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/opt/cursor/artifacts/clocks_on_board.png', Buffer.from(boardShot.data, 'base64'));
const text = await evaluate(`document.body.innerText`);
console.log(text.split('\\n').slice(0, 12).join(' | '));
ws.close();
await fetch(`http://127.0.0.1:9222/json/close/${page.id}`);
