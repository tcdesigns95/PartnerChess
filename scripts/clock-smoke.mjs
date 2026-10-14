import { io } from 'socket.io-client';

const url = process.env.SOCKET_URL || 'http://127.0.0.1:3001';
function connect() {
  return io(url, { path: '/api/socket', transports: ['websocket'], forceNew: true });
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

const white = connect();
const black = connect();
await new Promise((r) => white.on('connect', r));
await new Promise((r) => black.on('connect', r));

const created = await emit(white, 'createGame', { name: 'Daddy', preferColor: 'w', clockMs: 10 * 60 * 1000 });
if (!created.ok) throw new Error(created.error);
if (!created.game.clock) throw new Error('new game has no clock');
if (created.game.clock.whiteMs !== 10 * 60 * 1000) {
  throw new Error(`clock started early ${created.game.clock.whiteMs}`);
}

const joined = await emit(black, 'joinGame', { code: created.game.code, name: 'Baby' });
if (!joined.ok) throw new Error(joined.error);
const started = joined.game.clock.whiteMs;
if (started > 10 * 60 * 1000 || started < 10 * 60 * 1000 - 3000) {
  throw new Error(`white clock out of range ${started}`);
}

await new Promise((r) => setTimeout(r, 1200));
const rejoined = await emit(white, 'rejoinGame', { gameId: created.game.id, playerId: created.playerId });
if (!rejoined.ok) throw new Error(rejoined.error);
const afterWait = rejoined.game.clock.whiteMs;
if (afterWait > started - 800) throw new Error(`white clock did not run ${started} -> ${afterWait}`);
if (rejoined.game.clock.blackMs < 10 * 60 * 1000 - 500) {
  throw new Error(`black clock ran on white's turn ${rejoined.game.clock.blackMs}`);
}

const moved = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: created.playerId,
  from: 'e2',
  to: 'e4',
});
if (!moved.ok) throw new Error(moved.error);
if (moved.game.turn !== 'b') throw new Error('turn did not pass');
const blackAfter = moved.game.clock.blackMs;
await new Promise((r) => setTimeout(r, 1200));
const blackView = await emit(black, 'rejoinGame', { gameId: created.game.id, playerId: joined.playerId });
if (blackView.game.clock.blackMs > blackAfter - 800) {
  throw new Error(`black clock did not run ${blackAfter} -> ${blackView.game.clock.blackMs}`);
}

const config = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('getPushConfig timed out')), 8000);
  white.emit('getPushConfig', (res) => {
    clearTimeout(timer);
    resolve(res);
  });
});
if (config.enabled) throw new Error('push should be off without keys');

white.close();
black.close();
console.log('clock smoke passed', created.game.code);
