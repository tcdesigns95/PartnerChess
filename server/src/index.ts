import { Chess, type Square } from 'chess.js';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Server, type Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const GAMES_FILE = join(DATA_DIR, 'games.json');

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

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (codeIndex.has(code)) return makeCode();
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

const httpServer = createServer(app);
const io = new Server<ClientToServer, ServerToClient>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

function emitGame(game: StoredGame) {
  const pub = toPublic(game, connectedPlayersFor(game));
  io.to(game.id).emit('gameUpdated', pub);
}

io.on('connection', (socket: Socket<ClientToServer, ServerToClient>) => {
  socket.on('createGame', (payload, cb) => {
    try {
      const name = (payload.name || 'Player').trim().slice(0, 24) || 'Player';
      const prefer = payload.preferColor ?? 'random';
      const color: PlayerColor =
        prefer === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : prefer;
      const playerId = uuidv4();
      const chess = new Chess();
      const game: StoredGame = {
        id: uuidv4(),
        code: makeCode(),
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
      games.set(game.id, game);
      codeIndex.set(game.code, game.id);
      socket.join(game.id);
      socketPlayer.set(socket.id, { gameId: game.id, playerId });
      persistGames();
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)), playerId, color });
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Could not create game' });
    }
  });

  socket.on('joinGame', (payload, cb) => {
    try {
      const code = (payload.code || '').trim().toUpperCase();
      const name = (payload.name || 'Player').trim().slice(0, 24) || 'Player';
      const gameId = codeIndex.get(code);
      if (!gameId) {
        cb({ ok: false, error: 'Game code not found' });
        return;
      }
      const game = games.get(gameId);
      if (!game) {
        cb({ ok: false, error: 'Game not found' });
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
        cb({ ok: false, error: 'Game is full' });
        return;
      }

      const playerId = uuidv4();
      game.players[color] = { id: playerId, name };
      game.status = game.players.w && game.players.b ? 'active' : 'waiting';
      game.updatedAt = Date.now();
      socket.join(game.id);
      socketPlayer.set(socket.id, { gameId: game.id, playerId });
      persistGames();
      io.to(game.id).emit('playerJoined', { color, name });
      emitGame(game);
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)), playerId, color });
    } catch (err) {
      console.error(err);
      cb({ ok: false, error: 'Could not join game' });
    }
  });

  socket.on('rejoinGame', (payload, cb) => {
    const game = games.get(payload.gameId);
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
    emitGame(game);
    cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)), color });
  });

  socket.on('makeMove', (payload, cb) => {
    const game = games.get(payload.gameId);
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
      const move = chess.move({
        from: payload.from as Square,
        to: payload.to as Square,
        promotion: (payload.promotion as 'q' | 'r' | 'b' | 'n' | undefined) ?? 'q',
      });
      if (!move) {
        cb({ ok: false, error: 'Illegal move' });
        return;
      }
      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.lastMove = { from: move.from, to: move.to };
      game.updatedAt = Date.now();
      finishIfNeeded(game);
      persistGames();
      emitGame(game);
      cb({ ok: true, game: toPublic(game, connectedPlayersFor(game)) });
    } catch {
      cb({ ok: false, error: 'Illegal move' });
    }
  });

  socket.on('sendChat', (payload, cb) => {
    const game = games.get(payload.gameId);
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
    persistGames();
    io.to(game.id).emit('chatMessage', message);
    cb({ ok: true });
  });

  socket.on('resign', (payload, cb) => {
    const game = games.get(payload.gameId);
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
    persistGames();
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

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, () => {
  console.log(`Chess couple server listening on :${PORT}`);
});
