import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from './types';

const SESSION_KEY = 'chess.session';
const NAME_KEY = 'chess.displayName';
const COOKIE = 'chess.session';

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Session;
    if (!data.gameId || !data.playerId || (data.color !== 'w' && data.color !== 'b') || !data.code) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function readCookie(): Session | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) !== COOKIE) continue;
    return parseSession(decodeURIComponent(trimmed.slice(eq + 1)));
  }
  return null;
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

function readSeatUrl(): Session | null {
  if (typeof window === 'undefined') return null;
  return parseSession(new URLSearchParams(window.location.search).get('seat'));
}

export async function saveSession(session: Session): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The cookie and the page URL still hold the seat.
  }
  writeCookie(session);
  writeSeatUrl(session);
}

export async function loadSession(): Promise<Session | null> {
  try {
    const stored = parseSession(await AsyncStorage.getItem(SESSION_KEY));
    if (stored) return stored;
  } catch {
    // Storage can throw in a locked browser. Try the other copies.
  }
  const backup = readCookie() ?? readSeatUrl();
  if (!backup) return null;
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(backup));
  } catch {
    // This visit can still use the backup.
  }
  writeCookie(backup);
  return backup;
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Still drop the cookie and URL seat.
  }
  writeCookie(null);
  writeSeatUrl(null);
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
