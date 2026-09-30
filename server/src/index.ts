import { Chess, type Square } from 'chess.js';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server, type Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

/** `npm --prefix server` and Docker set cwd to `server/`. A repo-root cwd still works. */
function serverRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('/server') || cwd.endsWith('\\server')) return cwd;
  return join(cwd, 'server');
}

/** Vercel functions can only write to /tmp. Local and Docker keep games under server/data. */
const DATA_DIR = process.env.VERCEL ? join('/tmp', 'couple-chess') : join(serverRoot(), 'data');
const GAMES_FILE = join(DATA_DIR, 'games.json');
const WEB_DIST = join(serverRoot(), '..', 'dist');
/**
 * The browser always connects to `/api/socket`. Vercel serves `api/socket.ts` at that path and
 * strips the mount before the request reaches this process, so Engine.IO sees `/`.
 * Locally this process is the origin, so Engine.IO listens on the full path.
 */
const SOCKET_PATH = process.env.VERCEL ? '/' : '/api/socket';

export type PlayerColor = 'w' | 'b';

export type ChatMessage = {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
};

export type StoredGame = {
  id: string;
  code: string;
  fen: string;
  pgn: string;
  status: 'waiting' | 'active' | 'finished';
  players: {
    w?: { id: string; name: string };
    b?: { id: string; name: string };
  };
  lastMove?: { from: string; to: string };
  chat: ChatMessage[];
  result?: string;
  createdAt: number;
  updatedAt: number;
};

type ClientToServer = {
  createGame: (
    payload: { name: string; preferColor?: PlayerColor | 'random' },
    cb: (res: { ok: true; game: PublicGame; playerId: string; color: PlayerColor } | { ok: false; error: string }) => void,
  ) => void;
  joinGame: (
    payload: { code: string; name: string },
    cb: (res: { ok: true; game: PublicGame; playerId: string; color: PlayerColor } | { ok: false; error: string }) => void,
  ) => void;
  rejoinGame: (
    payload: { gameId: string; playerId: string },
    cb: (res: { ok: true; game: PublicGame; color: PlayerColor } | { ok: false; error: string }) => void,
  ) => void;
  makeMove: (
    payload: { gameId: string; playerId: string; from: string; to: string; promotion?: string },
    cb: (res: { ok: true; game: PublicGame } | { ok: false; error: string }) => void,
  ) => void;
  sendChat: (
    payload: { gameId: string; playerId: string; text: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  resign: (
    payload: { gameId: string; playerId: string },
    cb: (res: { ok: true; game: PublicGame } | { ok: false; error: string }) => void,
  ) => void;
  offerDraw: (
    payload: { gameId: string; playerId: string },
    cb: (res: { ok: true; game: PublicGame } | { ok: false; error: string }) => void,
  ) => void;
};

type ServerToClient = {
  gameUpdated: (game: PublicGame) => void;
  chatMessage: (message: ChatMessage) => void;
  playerJoined: (payload: { color: PlayerColor; name: string }) => void;
};

export type PublicGame = {
  id: string;
  code: string;
  fen: string;
  status: StoredGame['status'];
  players: {
    w?: { name: string; connected?: boolean };
    b?: { name: string; connected?: boolean };
  };
  lastMove?: { from: string; to: string };
  chat: ChatMessage[];
  result?: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  updatedAt: number;
};

const games = new Map<string, StoredGame>();
const codeIndex = new Map<string, string>();
const socketPlayer = new Map<string, { gameId: string; playerId: string }>();

function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadGames() {
  ensureDataDir();
  if (!existsSync(GAMES_FILE)) return;
  try {
    const raw = readFileSync(GAMES_FILE, 'utf8');
    const list = JSON.parse(raw) as StoredGame[];
    for (const game of list) {
      games.set(game.id, game);
      codeIndex.set(game.code, game.id);
    }
    console.log(`Loaded ${list.length} saved games`);
  } catch (err) {
    console.error('Failed to load games', err);
  }
}

function persistGames() {
  ensureDataDir();
  const list = [...games.values()];
  writeFileSync(GAMES_FILE, JSON.stringify(list, null, 2));
}

function sharedRedisUrl(): string | undefined {
  const url = (process.env.REDIS_URL || process.env.KV_URL || '').trim();
  return url || undefined;
}

let redis: Redis | null = null;
function getRedis(): Redis | null {
  const url = sharedRedisUrl();
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, { maxRetriesPerRequest: 2 });
    redis.on('error', (err: Error) => console.error('redis', err.message));
  }
  return redis;
}

function remember(game: StoredGame) {
  games.set(game.id, game);
  codeIndex.set(game.code, game.id);
}

async function saveGame(game: StoredGame) {
  remember(game);
  const client = getRedis();
  if (!client) {
    persistGames();
    return;
  }
  await client.set(`chess:game:${game.id}`, JSON.stringify(game));
  await client.set(`chess:code:${game.code}`, game.id);
}

async function loadGame(id: string): Promise<StoredGame | undefined> {
  const client = getRedis();
  if (client) {
    const raw = await client.get(`chess:game:${id}`);
    if (raw) {
      const game = JSON.parse(raw) as StoredGame;
      remember(game);
      return game;
    }
  }
  return games.get(id);
}

async function loadByCode(code: string): Promise<StoredGame | undefined> {
  const known = codeIndex.get(code);
  if (known) return loadGame(known);
  const client = getRedis();
  if (!client) return undefined;
  const gameId = await client.get(`chess:code:${code}`);
  if (!gameId) return undefined;
  return loadGame(gameId);
}

async function makeCode(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (codeIndex.has(code)) return makeCode();
  const client = getRedis();
  if (client && (await client.exists(`chess:code:${code}`))) return makeCode();
  return code;
}

function toPublic(game: StoredGame, connectedIds: Set<string>): PublicGame {
  const chess = new Chess(game.fen);
  return {
    id: game.id,
    code: game.code,
    fen: game.fen,
    status: game.status,
    players: {
      w: game.players.w
        ? { name: game.players.w.name, connected: connectedIds.has(game.players.w.id) }
        : undefined,
      b: game.players.b
        ? { name: game.players.b.name, connected: connectedIds.has(game.players.b.id) }
        : undefined,
    },
    lastMove: game.lastMove,
    chat: game.chat,
    result: game.result,
    turn: chess.turn(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    updatedAt: game.updatedAt,
  };
}

function connectedPlayersFor(game: StoredGame): Set<string> {
  const ids = new Set<string>();
  for (const meta of socketPlayer.values()) {
    if (meta.gameId === game.id) ids.add(meta.playerId);
  }
  return ids;
}

function colorOf(game: StoredGame, playerId: string): PlayerColor | null {
  if (game.players.w?.id === playerId) return 'w';
  if (game.players.b?.id === playerId) return 'b';
  return null;
}

function finishIfNeeded(game: StoredGame) {
  const chess = new Chess(game.fen);
  if (chess.isCheckmate()) {
    game.status = 'finished';
    game.result = chess.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  } else if (chess.isDraw()) {
    game.status = 'finished';
    if (chess.isStalemate()) game.result = 'Draw by stalemate';
    else if (chess.isThreefoldRepetition()) game.result = 'Draw by repetition';
    else if (chess.isInsufficientMaterial()) game.result = 'Draw by insufficient material';
    else game.result = 'Draw';
  }
}

loadGames();

const app = express();
app.use(cors());
app.get('/health', (_req, res) => {
  res.json({ ok: true, games: games.size });
});

// Local / Docker only. On Vercel the static Expo export is served from `dist/` by the platform.
if (!process.env.VERCEL && existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/(?:socket\.io|api\/socket)(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/health')) return next();
    res.sendFile(join(WEB_DIST, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  console.log(`Serving web app from ${WEB_DIST}`);
} else if (!process.env.VERCEL) {
  console.warn(`No web dist at ${WEB_DIST} — run: npx expo export --platform web`);
}

const httpServer = createServer(app);
const io = new Server<ClientToServer, ServerToClient>(httpServer, {
  path: SOCKET_PATH,
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const sharedRedis = getRedis();
if (sharedRedis) {
  io.adapter(createAdapter(sharedRedis, sharedRedis.duplicate()));
  console.log('Sharing games across instances with Redis');
}

function emitGame(game: StoredGame) {
  const pub = toPublic(game, connectedPlayersFor(game));
  io.to(game.id).emit('gameUpdated', pub);
}

io.on('connection', (socket: Socket<ClientToServer, ServerToClient>) => {
  socket.on('createGame', async (payload, cb) => {
    try {
      const name = (payload.name || 'Player').trim().slice(0, 24) || 'Player';
      const prefer = payload.preferColor ?? 'random';
      const color: PlayerColor =
        prefer === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : prefer;
      const playerId = uuidv4();
      const chess = new Chess();
      const game: StoredGame = {
        id: uuidv4(),
        code: await makeCode(),
        fen: chess.fen(),
        pgn: chess.pgn(),
        status: 'waiting',
        players: {
          [color]: { id: playerId, name },
        },
        chat: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      socket.join(game.id);
      socketPlayer.set(socket.id, { gameId: game.id, playerId });
      await saveGame(game);
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)), playerId, color });
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Could not create game' });
    }
  });

  socket.on('joinGame', async (payload, cb) => {
    try {
      const code = (payload.code || '').trim().toUpperCase();
      const name = (payload.name || 'Player').trim().slice(0, 24) || 'Player';
      const game = await loadByCode(code);
      if (!game) {
        cb({ ok: false, error: 'Game code not found' });
        return;
      }
      if (game.status === 'finished') {
        cb({ ok: false, error: 'That game already ended' });
        return;
      }

      let color: PlayerColor | null = null;
      if (!game.players.w) color = 'w';
      else if (!game.players.b) color = 'b';
      else {
        // Same person opening the link again after the phone dropped their seat.
        const wanted = name.toLowerCase();
        const seats = (['w', 'b'] as const).filter(
          (seat) => game.players[seat]?.name.trim().toLowerCase() === wanted,
        );
        if (seats.length === 1) {
          const seat = seats[0];
          const playerId = game.players[seat]!.id;
          socket.join(game.id);
          socketPlayer.set(socket.id, { gameId: game.id, playerId });
          emitGame(game);
          cb({
            ok: true,
            game: toPublic(game, connectedPlayersFor(game)),
            playerId,
            color: seat,
          });
          return;
        }
        cb({ ok: false, error: 'Game is full' });
        return;
      }

      const playerId = uuidv4();
      game.players[color] = { id: playerId, name };
      game.status = game.players.w && game.players.b ? 'active' : 'waiting';
      game.updatedAt = Date.now();
      socket.join(game.id);
      socketPlayer.set(socket.id, { gameId: game.id, playerId });
      await saveGame(game);
      io.to(game.id).emit('playerJoined', { color, name });
      emitGame(game);
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)), playerId, color });
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Could not join game' });
    }
  });

  socket.on('rejoinGame', async (payload, cb) => {
    const game = await loadGame(payload.gameId);
    if (!game) {
      cb({ ok: false, error: 'Game not found' });
      return;
    }
    const color = colorOf(game, payload.playerId);
    if (!color) {
      cb({ ok: false, error: 'You are not a player in this game' });
      return;
    }
    socket.join(game.id);
    socketPlayer.set(socket.id, { gameId: game.id, playerId: payload.playerId });
    // Read again so a move saved while this rejoin was in flight is what we send.
    const fresh = (await loadGame(payload.gameId)) ?? game;
    const pub = toPublic(fresh, connectedPlayersFor(fresh));
    socket.emit('gameUpdated', pub);
    cb({ ok: true, game: pub, color });
  });

  socket.on('makeMove', async (payload, cb) => {
    const game = await loadGame(payload.gameId);
    if (!game) {
      cb({ ok: false, error: 'Game not found' });
      return;
    }
    if (game.status === 'finished') {
      cb({ ok: false, error: 'Game is over' });
      return;
    }
    if (game.status === 'waiting') {
      cb({ ok: false, error: 'Waiting for your partner to join' });
      return;
    }
    const color = colorOf(game, payload.playerId);
    if (!color) {
      cb({ ok: false, error: 'Not your game' });
      return;
    }
    const chess = new Chess(game.fen);
    if (chess.turn() !== color) {
      cb({ ok: false, error: 'Not your turn' });
      return;
    }
    try {
      const moveOpts: {
        from: Square;
        to: Square;
        promotion?: 'q' | 'r' | 'b' | 'n';
      } = {
        from: payload.from as Square,
        to: payload.to as Square,
      };
      // Only attach promotion for actual pawn promotions — forcing 'q' breaks other moves.
      if (payload.promotion) {
        moveOpts.promotion = payload.promotion as 'q' | 'r' | 'b' | 'n';
      } else {
        const piece = chess.get(moveOpts.from);
        if (
          piece?.type === 'p' &&
          ((piece.color === 'w' && moveOpts.to.endsWith('8')) ||
            (piece.color === 'b' && moveOpts.to.endsWith('1')))
        ) {
          moveOpts.promotion = 'q';
        }
      }
      const move = chess.move(moveOpts);
      if (!move) {
        cb({ ok: false, error: 'Illegal move' });
        return;
      }
      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.lastMove = { from: move.from, to: move.to };
      game.updatedAt = Date.now();
      finishIfNeeded(game);
      await saveGame(game);
      emitGame(game);
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)) });
    } catch {
      cb({ ok: false, error: 'Illegal move' });
    }
  });

  socket.on('sendChat', async (payload, cb) => {
    const game = await loadGame(payload.gameId);
    if (!game) {
      cb({ ok: false, error: 'Game not found' });
      return;
    }
    const color = colorOf(game, payload.playerId);
    if (!color) {
      cb({ ok: false, error: 'Not your game' });
      return;
    }
    const text = (payload.text || '').trim().slice(0, 280);
    if (!text) {
      cb({ ok: false, error: 'Empty message' });
      return;
    }
    const player = game.players[color]!;
    const message: ChatMessage = {
      id: uuidv4(),
      playerId: payload.playerId,
      name: player.name,
      text,
      at: Date.now(),
    };
    game.chat.push(message);
    if (game.chat.length > 200) game.chat = game.chat.slice(-200);
    game.updatedAt = Date.now();
    await saveGame(game);
    io.to(game.id).emit('chatMessage', message);
    cb({ ok: true });
  });

  socket.on('resign', async (payload, cb) => {
    const game = await loadGame(payload.gameId);
    if (!game) {
      cb({ ok: false, error: 'Game not found' });
      return;
    }
    const color = colorOf(game, payload.playerId);
    if (!color) {
      cb({ ok: false, error: 'Not your game' });
      return;
    }
    if (game.status === 'finished') {
      cb({ ok: false, error: 'Game is over' });
      return;
    }
    game.status = 'finished';
    game.result = color === 'w' ? 'Black wins — white resigned' : 'White wins — black resigned';
    game.updatedAt = Date.now();
    await saveGame(game);
    emitGame(game);
    cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)) });
  });

  socket.on('disconnect', () => {
    const meta = socketPlayer.get(socket.id);
    if (!meta) return;
    socketPlayer.delete(socket.id);
    const game = games.get(meta.gameId);
    if (game) emitGame(game);
  });
});

// Vercel invokes the exported server. Listening here would crash the function.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT || 3001);
  httpServer.listen(PORT, () => {
    console.log(`Chess couple server listening on :${PORT}`);
  });
}

export default httpServer;
