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

await new Promise((r) => setTimeout(r, 1300));
const timed = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: created.playerId,
  from: 'e2',
  to: 'e4',
});
if (!timed.ok) throw new Error(timed.error);
const whiteLeft = timed.game.clock.whiteMs;
const whiteUsed = timed.game.elapsed.whiteMs;
if (whiteLeft > 10 * 60 * 1000 - 900) throw new Error(`white clock did not run ${whiteLeft}`);
if ((timed.game.forwards ?? 0) !== 0) throw new Error('a new move left a redo line');
const beforeUndo = await emit(white, 'takeForward', { gameId: created.game.id, playerId: created.playerId });
if (beforeUndo.ok) throw new Error('forward before any take back');
await new Promise((r) => setTimeout(r, 900));
const undone = await emit(white, 'takeBack', { gameId: created.game.id, playerId: created.playerId });
if (!undone.ok) throw new Error(undone.error);
if (undone.game.turn !== 'w') throw new Error('take back did not return the turn');
if (undone.game.clock.whiteMs > whiteLeft + 400) {
  throw new Error(`white clock was refunded ${whiteLeft} -> ${undone.game.clock.whiteMs}`);
}
if (undone.game.elapsed.whiteMs + 200 < whiteUsed) {
  throw new Error(`white time was erased ${whiteUsed} -> ${undone.game.elapsed.whiteMs}`);
}
if (undone.game.elapsed.gameMs < 1800) throw new Error(`game clock stopped ${undone.game.elapsed.gameMs}`);
if (undone.game.clock.blackMs > 10 * 60 * 1000 - 500) {
  throw new Error(`black clock paused on take back ${undone.game.clock.blackMs}`);
}
if (undone.game.forwards !== 1) throw new Error(`expected 1 forward, got ${undone.game.forwards}`);
const stranger = await emit(white, 'takeForward', { gameId: created.game.id, playerId: 'nope' });
if (stranger.ok) throw new Error('a stranger stepped the game forward');
const replayed = await emit(black, 'takeForward', { gameId: created.game.id, playerId: joined.playerId });
if (!replayed.ok) throw new Error(replayed.error);
if (replayed.game.fen !== timed.game.fen) throw new Error('forward did not restore the move');
if (replayed.game.turn !== 'b') throw new Error(`forward left turn ${replayed.game.turn}`);
if (replayed.game.forwards !== 0) throw new Error(`forward left ${replayed.game.forwards} on the redo line`);
if ((replayed.game.backs ?? 0) < 1) throw new Error('forward did not restore back');
if (replayed.game.clock.whiteMs > undone.game.clock.whiteMs + 400) {
  throw new Error(`forward refunded white ${undone.game.clock.whiteMs} -> ${replayed.game.clock.whiteMs}`);
}
if (replayed.game.elapsed.whiteMs + 200 < undone.game.elapsed.whiteMs) {
  throw new Error(`forward erased white time ${undone.game.elapsed.whiteMs} -> ${replayed.game.elapsed.whiteMs}`);
}
const emptyForward = await emit(white, 'takeForward', { gameId: created.game.id, playerId: created.playerId });
if (emptyForward.ok) throw new Error('a fifth forward was allowed');
const backToStart = await emit(white, 'takeBack', { gameId: created.game.id, playerId: created.playerId });
if (!backToStart.ok) throw new Error(backToStart.error);
if (backToStart.game.turn !== 'w') throw new Error('second take back did not return the turn');

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
if ((played.game.forwards ?? 0) !== 0) throw new Error('new moves did not clear the redo line');

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
let stepped = current;
for (let i = 4; i >= 1; i--) {
  const fwd = await emit(white, 'takeForward', { gameId: created.game.id, playerId: created.playerId });
  if (!fwd.ok) throw new Error(fwd.error);
  if (fwd.game.fen === stepped) throw new Error('forward left the board in place');
  if (fwd.game.forwards !== i - 1) throw new Error(`forwards ${fwd.game.forwards} after replaying to ${i - 1}`);
  stepped = fwd.game.fen;
}
if (stepped !== played.game.fen) throw new Error('four forwards did not restore the line');
const extra = await emit(black, 'takeForward', { gameId: created.game.id, playerId: joined.playerId });
if (extra.ok) throw new Error('forward with an empty redo line');
for (let i = 0; i < 4; i++) {
  const back = await emit(black, 'takeBack', { gameId: created.game.id, playerId: joined.playerId });
  if (!back.ok) throw new Error(back.error);
}

const again = await emit(black, 'makeMove', {
  gameId: created.game.id,
  playerId: joined.playerId,
  from: 'e7',
  to: 'e5',
});
if (!again.ok) throw new Error(again.error);
if (again.game.backs !== 1) throw new Error(`new move should allow one back, got ${again.game.backs}`);
if ((again.game.forwards ?? 0) !== 0) throw new Error('a new move kept the redo line');

white.close();
black.close();
console.log('takeback smoke passed', created.game.code);
