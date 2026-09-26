import { io } from 'socket.io-client';

const URL = process.env.SOCKET_URL || 'http://localhost:3001';

function client() {
  return io(URL, {
    path: process.env.SOCKET_PATH || '/api/socket/socket.io',
    transports: ['websocket'],
  });
}

function once(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Ack timeout for ${event}`)), 5000);
    socket.emit(event, payload, (res) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

async function main() {
  const a = client();
  const b = client();
  await Promise.all([once(a, 'connect'), once(b, 'connect')]);
  console.log('both connected');

  const created = await emitAck(a, 'createGame', { name: 'Alex', preferColor: 'w' });
  if (!created.ok) throw new Error(JSON.stringify(created));
  console.log('created', created.game.code, 'color', created.color);

  const joined = await emitAck(b, 'joinGame', { code: created.game.code, name: 'Sam' });
  if (!joined.ok) throw new Error(JSON.stringify(joined));
  console.log('joined status', joined.game.status, 'color', joined.color);

  const updated = once(b, 'gameUpdated');
  const moved = await emitAck(a, 'makeMove', {
    gameId: created.game.id,
    playerId: created.playerId,
    from: 'e2',
    to: 'e4',
  });
  if (!moved.ok) throw new Error(JSON.stringify(moved));
  const g = await updated;
  console.log('move synced', g.lastMove, 'turn', g.turn);

  const chatWait = once(a, 'chatMessage');
  const chat = await emitAck(b, 'sendChat', {
    gameId: created.game.id,
    playerId: joined.playerId,
    text: 'hi love',
  });
  if (!chat.ok) throw new Error(JSON.stringify(chat));
  const msg = await chatWait;
  console.log('chat synced', msg.name, msg.text);

  a.disconnect();
  const a2 = client();
  await once(a2, 'connect');
  const rejoined = await emitAck(a2, 'rejoinGame', {
    gameId: created.game.id,
    playerId: created.playerId,
  });
  if (!rejoined.ok) throw new Error(JSON.stringify(rejoined));
  console.log('rejoin fen', rejoined.game.fen);
  console.log('PASS');
  a2.disconnect();
  b.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
