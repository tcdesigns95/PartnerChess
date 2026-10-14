import { Platform } from 'react-native';
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

async function subscribe(session: { gameId: string; playerId: string }, publicKey: string) {
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
  await new Promise<void>((resolve, reject) => {
    getSocket().emit(
      'savePushSubscription',
      {
        gameId: session.gameId,
        playerId: session.playerId,
        subscription: { endpoint: json.endpoint!, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      },
      (res) => {
        if (res.ok) resolve();
        else reject(new Error(res.error));
      },
    );
  });
}

/** Subscribe again when the phone already allowed alerts. */
export async function resumeMoveAlerts(session: { gameId: string; playerId: string }): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (Notification.permission !== 'granted') return false;
  if (isIos() && !isStandalone()) return false;
  try {
    const config = await askConfig();
    if (!config.enabled || !config.publicKey) return false;
    await subscribe(session, config.publicKey);
    return true;
  } catch {
    return false;
  }
}

/** Ask for alerts. Must run from a tap. */
export async function enableMoveAlerts(session: { gameId: string; playerId: string }): Promise<string> {
  if (Platform.OS !== 'web' || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
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
    await subscribe(session, config.publicKey);
    return '';
  } catch {
    return 'Could not turn alerts on.';
  }
}
