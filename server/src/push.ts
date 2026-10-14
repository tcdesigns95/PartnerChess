import webpush from 'web-push';
import type { Redis } from 'ioredis';

export type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const memory = new Map<string, PushSubscription>();
let vapidReady = false;

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || '';
  const subject = process.env.VAPID_SUBJECT?.trim() || 'https://couple-chess-opal.vercel.app';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function pushPublicKey(): string | null {
  return vapid()?.publicKey ?? null;
}

export function parseSubscription(value: unknown): PushSubscription | null {
  if (!value || typeof value !== 'object') return null;
  const sub = value as PushSubscription;
  if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) return null;
  if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return null;
  if (sub.keys.p256dh.length < 8 || sub.keys.auth.length < 8) return null;
  return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
}

function key(playerId: string) {
  return `chess:push:${playerId}`;
}

export async function saveSubscription(redis: Redis | null, playerId: string, sub: PushSubscription) {
  memory.set(playerId, sub);
  if (redis) await redis.set(key(playerId), JSON.stringify(sub));
}

async function loadSubscription(redis: Redis | null, playerId: string): Promise<PushSubscription | null> {
  if (redis) {
    const raw = await redis.get(key(playerId));
    if (!raw) return memory.get(playerId) ?? null;
    try {
      return parseSubscription(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return memory.get(playerId) ?? null;
}

async function dropSubscription(redis: Redis | null, playerId: string) {
  memory.delete(playerId);
  if (redis) await redis.del(key(playerId));
}

export async function notifyPlayer(redis: Redis | null, playerId: string, payload: PushPayload) {
  const keys = vapid();
  if (!keys) return;
  const sub = await loadSubscription(redis, playerId);
  if (!sub) return;
  if (!vapidReady) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    vapidReady = true;
  }
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await dropSubscription(redis, playerId);
  }
}
