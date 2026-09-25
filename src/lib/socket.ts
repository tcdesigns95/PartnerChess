import { io, type Socket } from 'socket.io-client';
import type { PlayerColor, PublicGame, ChatMessage } from './types';

const DEFAULT_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL?.trim() ||
  // Web on same machine → local server. Native devices should set EXPO_PUBLIC_SOCKET_URL.
  (typeof window !== 'undefined' ? 'http://localhost:3001' : 'http://localhost:3001');

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
};

type ServerToClient = {
  gameUpdated: (game: PublicGame) => void;
  chatMessage: (message: ChatMessage) => void;
  playerJoined: (payload: { color: PlayerColor; name: string }) => void;
};

let socket: Socket<ServerToClient, ClientToServer> | null = null;

export function getSocketUrl() {
  return DEFAULT_URL;
}

export function getSocket() {
  if (!socket) {
    socket = io(DEFAULT_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });
  }
  return socket;
}
