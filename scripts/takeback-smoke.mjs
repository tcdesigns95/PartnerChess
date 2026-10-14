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

const created = await emit(white, 'createGame', { name: 'You', preferColor: 'w', clockMs: 10 * 60 * 1000 });
if (!created.ok) throw new Error(created.error);
const joined = await emit(black, 'joinGame', { code: created.game.code, name: 'Partner' });
if (!joined.ok) throw new Error(joined.error);

const moves = [
  ['w', 'e2', 'e4'],
  ['b', 'e7', 'e5'],
  ['w', 'g1', 'f3'],
  ['b', 'b8', 'c6'],
  ['w', 'f1', 'c4'],
];
let afterFirst = '';
for (const [side, from, to] of moves) {
  const seat = side === 'w' ? created : joined;
  const socket = side === 'w' ? white : black;
  const moved = await emit(socket, 'makeMove', {
    gameId: created.game.id,
    playerId: seat.playerId,
    from,
    to,
  });
  if (!moved.ok) throw new Error(`${from}${to} ${moved.error}`);
  if (!afterFirst) afterFirst = moved.game.fen;
}
if (moves.length !== 5) throw new Error('expected 5 moves');
const played = await emit(white, 'rejoinGame', { gameId: created.game.id, playerId: created.playerId });
if (played.game.backs !== 4) throw new Error(`expected 4 backs, got ${played.game.backs}`);

let current = played.game.fen;
for (let i = 4; i >= 1; i--) {
  const back = await emit(black, 'takeBack', { gameId: created.game.id, playerId: joined.playerId });
  if (!back.ok) throw new Error(back.error);
  if (back.game.fen === current) throw new Error('take back left the board in place');
  if (back.game.backs !== i - 1) throw new Error(`backs ${back.game.backs} after undoing to ${i - 1}`);
  current = back.game.fen;
}
if (current !== afterFirst) throw new Error('four backs did not return to the first move');
const fifth = await emit(white, 'takeBack', { gameId: created.game.id, playerId: created.playerId });
if (fifth.ok) throw new Error('a fifth back was allowed');

const again = await emit(black, 'makeMove', {
  gameId: created.game.id,
  playerId: joined.playerId,
  from: 'e7',
  to: 'e5',
});
if (!again.ok) throw new Error(again.error);
if (again.game.backs !== 1) throw new Error(`new move should allow one back, got ${again.game.backs}`);
if (again.game.clock.blackMs < 10 * 60 * 1000 - 5_000) {
  throw new Error(`black clock was not restored ${again.game.clock.blackMs}`);
}

white.close();
black.close();
console.log('takeback smoke passed', created.game.code);
