import assert from 'node:assert/strict';
import type { GameClock } from '../server/src/clock.ts';
import type { TimeLog } from '../server/src/elapsed.ts';
import { canStepForward, canTakeBack, keepClock, keepLog, rememberPosition, type PositionSnap } from '../server/src/takeback.ts';

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

const redo = rememberPosition(undefined, snap('e4'));
assert.equal(canStepForward({ status: 'active', redo }), true);
assert.equal(canStepForward({ status: 'active', redo: [] }), false);
assert.equal(canStepForward({ status: 'finished', result: 'White wins — black resigned', redo }), false);
assert.equal(canStepForward({ status: 'finished', result: 'Black wins on time', redo }), false);
assert.equal(canStepForward({ status: 'finished', result: 'White wins by checkmate', redo }), true);
let capped = redo;
for (const fen of ['a', 'b', 'c', 'd']) capped = rememberPosition(capped, snap(fen));
assert.deepEqual(capped.map((entry) => entry.fen), ['a', 'b', 'c', 'd']);

const clock: GameClock = { initialMs: 600_000, whiteMs: 590_000, blackMs: 600_000, turnStartedAt: 1_000 };
const kept = keepClock(clock, 'b', 'active', 9_000);
assert.equal(kept?.whiteMs, 590_000);
assert.equal(kept?.blackMs, 592_000);
assert.equal(kept?.turnStartedAt, 9_000);
assert.equal(clock.whiteMs, 590_000);

const finished: GameClock = { initialMs: 600_000, whiteMs: 580_000, blackMs: 570_000, turnStartedAt: 5_000 };
const reopened = keepClock(finished, 'w', 'finished', 9_000);
assert.equal(reopened?.whiteMs, 580_000);
assert.equal(reopened?.blackMs, 570_000);
assert.equal(reopened?.turnStartedAt, 9_000);

const log: TimeLog = { gameStartedAt: 100, finishedAt: 0, whiteMs: 10_000, blackMs: 0, turnStartedAt: 20_000 };
const keptLog = keepLog(log, 'b', 'active', 25_000);
assert.equal(keptLog?.gameStartedAt, 100);
assert.equal(keptLog?.whiteMs, 10_000);
assert.equal(keptLog?.blackMs, 5_000);
assert.equal(keptLog?.turnStartedAt, 25_000);

console.log('takeback checks passed');
