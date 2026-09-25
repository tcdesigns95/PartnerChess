import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from './types';

const SESSION_KEY = 'chess.session';
const NAME_KEY = 'chess.displayName';

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
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
