import { dropSeat, upsertSeat } from '../src/lib/roster.ts';
import type { Session } from '../src/lib/types.ts';

function seat(gameId: string, name = 'You'): Session {
  return { gameId, playerId: `p-${gameId}`, color: 'w', code: gameId.slice(0, 6).toUpperCase(), name };
}

const first = upsertSeat([], seat('a'));
const both = upsertSeat(first, seat('b'));
if (both.map((item) => item.gameId).join(',') !== 'b,a') {
  throw new Error(`new game did not stay with the old one: ${both.map((item) => item.gameId).join(',')}`);
}

const again = upsertSeat(both, seat('a', 'You'));
if (again.map((item) => item.gameId).join(',') !== 'a,b') {
  throw new Error(`reopening a game duplicated it: ${again.map((item) => item.gameId).join(',')}`);
}
if (again[0]?.name !== 'You') throw new Error('reopened seat did not refresh');

const capped = Array.from({ length: 30 }, (_, index) => seat(`g${index}`)).reduce(
  (list, item) => upsertSeat(list, item),
  [] as Session[],
);
if (capped.length !== 24) throw new Error(`roster grew past 24: ${capped.length}`);
if (capped[0]?.gameId !== 'g29') throw new Error('newest game was dropped');
if (capped.some((item) => item.gameId === 'g0')) throw new Error('oldest game was kept past the cap');

const kept = dropSeat(both, 'missing');
if (kept.length !== 2) throw new Error('drop removed a different game');
const one = dropSeat(both, 'b');
if (one.length !== 1 || one[0]?.gameId !== 'a') throw new Error('drop did not keep the other game');

console.log('roster-check ok');
