import AsyncStorage from '@react-native-async-storage/async-storage';
import { dropSeat, upsertSeat } from './roster';
import type { Session } from './types';

const SESSION_KEY = 'chess.session';
const ROSTER_KEY = 'chess.games';
const NAME_KEY = 'chess.displayName';
const COOKIE = 'chess.session';
const ROSTER_COOKIE = 'chess.games';

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Session;
    if (!data.gameId || !data.playerId || (data.color !== 'w' && data.color !== 'b') || !data.code) {
      return null;
    }
    return {
      gameId: data.gameId,
      playerId: data.playerId,
      color: data.color,
      code: data.code,
      name: typeof data.name === 'string' ? data.name : '',
    };
  } catch {
    return null;
  }
}

function parseRoster(raw: string | null): Session[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const seats: Session[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const seat = parseSession(JSON.stringify(item));
      if (!seat || seen.has(seat.gameId)) continue;
      seen.add(seat.gameId);
      seats.push(seat);
      if (seats.length >= 24) break;
    }
    return seats;
  } catch {
    return [];
  }
}

function readNamedCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

function readCookie(): Session | null {
  return parseSession(readNamedCookie(COOKIE));
}

function writeCookie(session: Session | null) {
  if (typeof document === 'undefined') return;
  if (!session) {
    document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }
  const value = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${COOKIE}=${value}; Max-Age=2592000; Path=/; SameSite=Lax`;
}

function writeRosterCookie(seats: Session[]) {
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(seats));
  if (value.length > 3500) return;
  document.cookie = `${ROSTER_COOKIE}=${value}; Max-Age=2592000; Path=/; SameSite=Lax`;
}

function writeSeatUrl(session: Session | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!session) {
    if (!url.searchParams.has('seat')) return;
    url.searchParams.delete('seat');
  } else {
    url.searchParams.delete('code');
    url.searchParams.set('seat', JSON.stringify(session));
  }
  const next = `${url.pathname}${url.search}${url.hash}` || '/';
  window.history.replaceState(window.history.state, '', next);
}

export function loadSeatFromUrl(): Session | null {
  if (typeof window === 'undefined') return null;
  return parseSession(new URLSearchParams(window.location.search).get('seat'));
}

async function readStoredSession(): Promise<Session | null> {
  try {
    return parseSession(await AsyncStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

async function persistRoster(seats: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ROSTER_KEY, JSON.stringify(seats));
  } catch {
    // The cookie still holds a copy when it fits.
  }
  writeRosterCookie(seats);
}

/** Every game this phone has joined. The open game is first. */
export async function loadRoster(): Promise<Session[]> {
  let seats: Session[] = [];
  try {
    seats = parseRoster(await AsyncStorage.getItem(ROSTER_KEY));
  } catch {
    seats = [];
  }
  if (seats.length === 0) seats = parseRoster(readNamedCookie(ROSTER_COOKIE));
  if (seats.length > 0) return seats;
  const legacy = (await readStoredSession()) ?? readCookie();
  if (!legacy) return [];
  await persistRoster([legacy]);
  return [legacy];
}

/** Keep a seat without making it the open game. */
export async function rememberSeat(session: Session): Promise<void> {
  await persistRoster(upsertSeat(await loadRoster(), session));
}

export async function saveSession(session: Session): Promise<void> {
  await rememberSeat(session);
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The cookie and the page URL still hold the seat.
  }
  writeCookie(session);
  writeSeatUrl(session);
}

export async function loadSession(): Promise<Session | null> {
  const stored = await readStoredSession();
  if (stored) return stored;
  const backup = readCookie() ?? loadSeatFromUrl();
  if (!backup) return null;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(backup));
  } catch {
    // This visit can still use the backup.
  }
  writeCookie(backup);
  return backup;
}

/** Drop the open seat. Games saved on this phone stay in the list. */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Still drop the cookie and URL seat.
  }
  writeCookie(null);
  writeSeatUrl(null);
}

/** Leave the board and stay on the list. A refresh keeps every saved game. */
export function parkHome(): void {
  writeSeatUrl(null);
}

/** Forget one game on this phone. The match on the server stays as it is. */
export async function forgetSeat(gameId: string): Promise<void> {
  await persistRoster(dropSeat(await loadRoster(), gameId));
  const active = await loadSession();
  if (active?.gameId === gameId) await clearSession();
}

export async function saveDisplayName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name);
}

export async function loadDisplayName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(NAME_KEY)) || '';
  } catch {
    return '';
  }
}
