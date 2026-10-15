import { Platform } from 'react-native';
import { loadRoster } from './session';
import { getSocket } from './socket';

type PushKeys = { p256dh: string; auth: string };

function isIos() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function urlBase64ToUint8Array(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function askConfig(): Promise<{ enabled: boolean; publicKey?: string }> {
  return new Promise((resolve) => {
    getSocket().emit('getPushConfig', (res) => resolve(res));
  });
}

async function browserSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  const json = subscription.toJSON();
  const keys = json.keys as PushKeys | undefined;
  if (!json.endpoint || !keys?.p256dh || !keys.auth) throw new Error('Could not subscribe');
  return { endpoint: json.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function saveSeat(
  seat: { gameId: string; playerId: string },
  subscription: { endpoint: string; keys: PushKeys },
) {
  return new Promise<void>((resolve, reject) => {
    getSocket().emit(
      'savePushSubscription',
      { gameId: seat.gameId, playerId: seat.playerId, subscription },
      (res) => {
        if (res.ok) resolve();
        else reject(new Error(res.error));
      },
    );
  });
}

/** One browser subscription, saved for every game on this phone. */
async function subscribeSeats(seats: { gameId: string; playerId: string }[], publicKey: string) {
  if (seats.length === 0) return;
  const subscription = await browserSubscription(publicKey);
  await Promise.all(seats.map((seat) => saveSeat(seat, subscription)));
}

function alertsAvailable() {
  return Platform.OS === 'web' && typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

/** Subscribe again when the phone already allowed alerts. Covers every saved game. */
export async function resumeMoveAlerts(session?: { gameId: string; playerId: string }): Promise<boolean> {
  if (!alertsAvailable()) return false;
  if (Notification.permission !== 'granted') return false;
  if (isIos() && !isStandalone()) return false;
  try {
    const config = await askConfig();
    if (!config.enabled || !config.publicKey) return false;
    const roster = await loadRoster();
    const seats = session ? [session, ...roster.filter((seat) => seat.playerId !== session.playerId)] : roster;
    const unique = seats.filter((seat, index) => seats.findIndex((other) => other.playerId === seat.playerId) === index);
    await subscribeSeats(unique, config.publicKey);
    return unique.length > 0;
  } catch {
    return false;
  }
}

/** Ask for alerts. Must run from a tap. */
export async function enableMoveAlerts(session: { gameId: string; playerId: string }): Promise<string> {
  if (!alertsAvailable()) {
    return 'Alerts are available in the phone browser.';
  }
  if (isIos() && !isStandalone()) {
    return 'On iPhone, tap Share, then Add to Home Screen. Open Couple Chess from that icon and turn alerts on.';
  }
  const config = await askConfig();
  if (!config.enabled || !config.publicKey) return 'Alerts are not turned on for this server yet.';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'Alerts are blocked in the browser settings.';
  try {
    const roster = await loadRoster();
    const seats = [session, ...roster.filter((seat) => seat.playerId !== session.playerId)];
    const unique = seats.filter((seat, index) => seats.findIndex((other) => other.playerId === seat.playerId) === index);
    await subscribeSeats(unique, config.publicKey);
    return '';
  } catch {
    return 'Could not turn alerts on.';
  }
}
