import { io, type Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import type { PlayerColor, PublicGame, ChatMessage } from './types';

function resolveSocketUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  // Same-origin through the public gateway / hosted deploy (web).
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const { origin, hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
  }

  return 'http://localhost:3001';
}

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
let boundUrl: string | null = null;

export function getSocketUrl() {
  return resolveSocketUrl();
}

export function getSocket() {
  const url = resolveSocketUrl();
  if (!socket || boundUrl !== url) {
    if (socket) socket.disconnect();
    boundUrl = url;
    socket = io(url, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });
  }
  return socket;
}

/** Public invite URL for iMessage / Messages. */
export function buildInviteLink(code: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : process.env.EXPO_PUBLIC_APP_URL?.trim()) ||
    'http://localhost:8081';
  return `${base.replace(/\/$/, '')}/?code=${encodeURIComponent(code)}`;
}
