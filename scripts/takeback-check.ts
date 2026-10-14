import assert from 'node:assert/strict';
import type { GameClock } from '../server/src/clock.ts';
import { canTakeBack, rememberPosition, resumeClock, type PositionSnap } from '../server/src/takeback.ts';

function snap(fen: string): PositionSnap {
  return { fen, pgn: '', status: 'active' };
}

let history = rememberPosition(undefined, snap('1'));
history = rememberPosition(history, snap('2'));
history = rememberPosition(history, snap('3'));
history = rememberPosition(history, snap('4'));
history = rememberPosition(history, snap('5'));
assert.deepEqual(history.map((entry) => entry.fen), ['2', '3', '4', '5']);

assert.equal(canTakeBack({ status: 'active', history }), true);
assert.equal(canTakeBack({ status: 'active', history: [] }), false);
assert.equal(canTakeBack({ status: 'finished', result: 'White wins — black resigned', history }), false);
assert.equal(canTakeBack({ status: 'finished', result: 'Black wins on time', history }), false);
assert.equal(canTakeBack({ status: 'finished', result: 'White wins by checkmate', history }), true);

const clock: GameClock = { initialMs: 600_000, whiteMs: 600_000, blackMs: 600_000, turnStartedAt: 1_000 };
const resumed = resumeClock(clock, 9_000);
assert.equal(resumed?.whiteMs, 600_000);
assert.equal(resumed?.turnStartedAt, 9_000);
assert.equal(clock.turnStartedAt, 1_000);

console.log('takeback checks passed');
