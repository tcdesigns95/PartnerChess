const browser = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const pageRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('http://localhost:8081/')}`, {
  method: 'PUT',
});
if (!pageRes.ok) throw new Error(`open tab ${pageRes.status}`);
const page = await pageRes.json();

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});

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
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://localhost:8081/' });
await new Promise((r) => setTimeout(r, 1500));
await evaluate(`localStorage.clear(); document.cookie = 'chess.session=; Max-Age=0; Path=/';`);
await send('Page.navigate', { url: 'http://localhost:8081/' });

async function waitFor(text, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const body = await evaluate(`document.body ? document.body.innerText : ''`);
    if (body && body.includes(text)) return body;
    await new Promise((r) => setTimeout(r, 300));
  }
  const body = await evaluate(`document.body ? document.body.innerText : ''`);
  throw new Error(`timed out waiting for ${text}\n${body}`);
}

await waitFor('PLAY GAME');
const play = await evaluate(`(() => {
  const el = [...document.querySelectorAll('*')].find((node) =>
    [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes('PLAY GAME')),
  );
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
await click(play.x, play.y);
const boardText = await waitFor('Playing ');
if (/white vs/i.test(boardText) || /black vs/i.test(boardText)) {
  throw new Error(`color line still uses versus:\n${boardText}`);
}
const playing = boardText.match(/Playing (white|black)/);
if (!playing) throw new Error(`missing playing line:\n${boardText}`);

const fills = await evaluate(`(() => {
  const read = (label) => {
    const svg = document.querySelector('[aria-label="' + label + '"]');
    if (!svg) return null;
    const paths = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    return paths;
  };
  return { w: read('wp'), b: read('bp') };
})()`);

const whiteFill = (fills.w || []).find((fill) => fill && fill !== 'none');
const blackFill = (fills.b || []).find((fill) => fill && fill !== 'none');
if (!whiteFill || whiteFill.toLowerCase() === '#070b14') {
  throw new Error(`white pawn is not the bright army: ${JSON.stringify(fills)}`);
}
if (blackFill?.toLowerCase() !== '#070b14') {
  throw new Error(`black pawn is not the dark army: ${JSON.stringify(fills)}`);
}

console.log(JSON.stringify({ playing: playing[0], whiteFill, blackFill, browser: browser.Browser }, null, 2));
ws.close();
await fetch(`http://127.0.0.1:9222/json/close/${page.id}`);
