import { io } from 'socket.io-client';
import { Chess } from 'chess.js';

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
await new Promise((resolve) => white.on('connect', resolve));
await new Promise((resolve) => black.on('connect', resolve));

const created = await emit(white, 'createGame', { name: 'Daddy', preferColor: 'w' });
if (!created.ok) throw new Error(created.error);
const code = created.game.code;
const joined = await emit(black, 'joinGame', { code, name: 'Baby' });
if (!joined.ok) throw new Error(joined.error);
if (joined.color !== 'b') throw new Error(`joiner color ${joined.color}`);

const seen = [];
white.on('gameUpdated', (game) => seen.push(game.fen));

const moved = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: created.playerId,
  from: 'e2',
  to: 'e4',
});
if (!moved.ok) throw new Error(moved.error);
const fen = moved.game.fen;
if (!fen.startsWith('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR')) {
  throw new Error(`unexpected fen ${fen}`);
}

const chat = await emit(black, 'sendChat', {
  gameId: created.game.id,
  playerId: joined.playerId,
  text: 'still your move',
});
if (!chat.ok) throw new Error(chat.error);

const rejoined = await emit(white, 'rejoinGame', {
  gameId: created.game.id,
  playerId: created.playerId,
});
if (!rejoined.ok) throw new Error(rejoined.error);
if (rejoined.color !== 'w') throw new Error(`rejoin color ${rejoined.color}`);
if (rejoined.game.fen !== fen) throw new Error(`rejoin dropped the move: ${rejoined.game.fen}`);
if (rejoined.game.players.w.name !== 'Daddy' || rejoined.game.players.b.name !== 'Baby') {
  throw new Error('names missing');
}

white.disconnect();
await new Promise((r) => setTimeout(r, 200));
const afterDrop = await emit(black, 'rejoinGame', {
  gameId: created.game.id,
  playerId: joined.playerId,
});
if (!afterDrop.ok) throw new Error(afterDrop.error);
if (afterDrop.game.fen !== fen) throw new Error(`disconnect broadcast reverted the move: ${afterDrop.game.fen}`);
if (afterDrop.color !== 'b') throw new Error(`black rejoin color ${afterDrop.color}`);

const chess = new Chess(fen);
const reply = chess.moves({ verbose: true })[0];
const blackMove = await emit(black, 'makeMove', {
  gameId: created.game.id,
  playerId: joined.playerId,
  from: reply.from,
  to: reply.to,
});
if (!blackMove.ok) throw new Error(blackMove.error);

if (!white.connected) {
  await new Promise((resolve) => {
    white.once('connect', resolve);
    white.connect();
  });
}
const stale = await emit(white, 'makeMove', {
  gameId: created.game.id,
  playerId: created.playerId,
  from: 'e2',
  to: 'e4',
});
if (stale.ok) throw new Error('stale e4 was accepted');
if (stale.error !== 'Illegal move' && stale.error !== 'Not your turn') {
  throw new Error(`unexpected stale error ${stale.error}`);
}

const final = await emit(black, 'rejoinGame', {
  gameId: created.game.id,
  playerId: joined.playerId,
});
if (final.game.fen !== blackMove.game.fen) throw new Error('board changed after a rejected move');

white.close();
black.close();
console.log('move keep smoke passed', code);
