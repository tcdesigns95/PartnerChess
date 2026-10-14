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
if (created.game.elapsed) throw new Error('count started before the second player joined');
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
if (!rejoined.game.elapsed) throw new Error('missing count-up timer');
if (rejoined.game.elapsed.whiteMs < 800) throw new Error(`white time did not count ${rejoined.game.elapsed.whiteMs}`);
if (rejoined.game.elapsed.blackMs > 400) throw new Error(`black time counted on white's turn ${rejoined.game.elapsed.blackMs}`);
if (rejoined.game.elapsed.gameMs < 800) throw new Error(`game time did not count ${rejoined.game.elapsed.gameMs}`);

const moved = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: created.playerId,
  from: 'e2',
  to: 'e4',
});
if (!moved.ok) throw new Error(moved.error);
if (moved.game.turn !== 'b') throw new Error('turn did not pass');
const whiteUsed = moved.game.elapsed.whiteMs;
const blackAfter = moved.game.clock.blackMs;
await new Promise((r) => setTimeout(r, 1200));
const blackView = await emit(black, 'rejoinGame', { gameId: created.game.id, playerId: joined.playerId });
if (blackView.game.clock.blackMs > blackAfter - 800) {
  throw new Error(`black clock did not run ${blackAfter} -> ${blackView.game.clock.blackMs}`);
}
if (blackView.game.elapsed.blackMs < 800) throw new Error(`black time did not count ${blackView.game.elapsed.blackMs}`);
if (blackView.game.elapsed.whiteMs > whiteUsed + 500) {
  throw new Error(`white time kept counting ${whiteUsed} -> ${blackView.game.elapsed.whiteMs}`);
}

const quiet = connect();
await new Promise((r) => quiet.on('connect', r));
const untimed = await emit(quiet, 'createGame', { name: 'You', preferColor: 'w', clockMs: 0 });
if (!untimed.ok) throw new Error(untimed.error);
if (untimed.game.clock) throw new Error('no-timer game got a clock');
const partner = connect();
await new Promise((r) => partner.on('connect', r));
const sat = await emit(partner, 'joinGame', { code: untimed.game.code, name: 'Partner' });
if (!sat.ok) throw new Error(sat.error);
await new Promise((r) => setTimeout(r, 1100));
const counted = await emit(quiet, 'rejoinGame', { gameId: untimed.game.id, playerId: untimed.playerId });
if (!counted.game.elapsed || counted.game.elapsed.whiteMs < 800) {
  throw new Error(`untimed game did not count ${counted.game.elapsed && counted.game.elapsed.whiteMs}`);
}
quiet.close();
partner.close();

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
