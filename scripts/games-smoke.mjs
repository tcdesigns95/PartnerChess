import { io } from 'socket.io-client';

const url = process.env.SOCKET_URL || 'http://127.0.0.1:3001';
function connect() {
  return io(url, { path: '/api/socket', transports: ['websocket'], forceNew: true });
}
function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), 8000);
    const done = (res) => {
      clearTimeout(timer);
      resolve(res);
    };
    if (payload === undefined) socket.emit(event, done);
    else socket.emit(event, payload, done);
  });
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const you = connect();
const partner = connect();
await new Promise((resolve) => you.on('connect', resolve));
await new Promise((resolve) => partner.on('connect', resolve));

const first = await emit(you, 'createGame', { name: 'You', preferColor: 'w', clockMs: 0 });
if (!first.ok) throw new Error(first.error);
const second = await emit(you, 'createGame', { name: 'You', preferColor: 'b', clockMs: 0 });
if (!second.ok) throw new Error(second.error);

const listed = await emit(you, 'myGames', {
  seats: [
    { gameId: first.game.id, playerId: first.playerId },
    { gameId: second.game.id, playerId: second.playerId },
    { gameId: first.game.id, playerId: 'someone-else' },
  ],
});
if (!listed.ok) throw new Error(listed.error);
if (listed.games.length !== 2) throw new Error(`expected both games, got ${listed.games.length}`);
const ids = listed.games.map((game) => game.id);
if (!ids.includes(first.game.id) || !ids.includes(second.game.id)) {
  throw new Error(`missing a game: ${ids.join(',')}`);
}
if (listed.games[0].id !== second.game.id) throw new Error('newer game was not first');
if (listed.games.some((game) => game.playerId || game.players)) throw new Error('myGames leaked a seat id');

const stranger = connect();
await new Promise((resolve) => stranger.on('connect', resolve));
const denied = await emit(stranger, 'myGames', {
  seats: [{ gameId: first.game.id, playerId: 'someone-else' }],
});
if (!denied.ok) throw new Error(denied.error);
if (denied.games.length !== 0) throw new Error('a wrong player id still returned a game');

const rejoined = await emit(you, 'rejoinGame', { gameId: first.game.id, playerId: first.playerId });
if (!rejoined.ok) throw new Error(rejoined.error);
if (rejoined.game.id !== first.game.id) throw new Error('rejoin opened the wrong game');

const joined = await emit(partner, 'joinGame', { code: second.game.code, name: 'Partner' });
if (!joined.ok) throw new Error(joined.error);
if (joined.color !== 'w') throw new Error(`partner was not white on the second game: ${joined.color}`);

let foreign = 0;
let sawFirst = 0;
you.on('gameUpdated', (game) => {
  if (game.id === second.game.id) foreign += 1;
  if (game.id === first.game.id) sawFirst += 1;
});

const moved = await emit(partner, 'makeMove', {
  gameId: second.game.id,
  playerId: joined.playerId,
  from: 'e2',
  to: 'e4',
});
if (!moved.ok) throw new Error(moved.error);
await wait(400);
if (foreign !== 0) throw new Error('the other game landed on the open board');

const other = connect();
await new Promise((resolve) => other.on('connect', resolve));
const sat = await emit(other, 'joinGame', { code: first.game.code, name: 'Partner' });
if (!sat.ok) throw new Error(sat.error);
await wait(400);
if (sawFirst === 0) throw new Error('the open game did not update');

you.close();
partner.close();
stranger.close();
other.close();
console.log('games-smoke ok');
