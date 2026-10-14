import assert from 'node:assert/strict';
import { backfillLog, chargeLog, closeLog, startLog, viewElapsed } from '../server/src/elapsed.ts';
import { formatElapsed } from '../src/lib/clock.ts';

const started = startLog(1_000);
assert.equal(viewElapsed(started, 'active', 'w', 1_000).gameMs, 0);
assert.equal(viewElapsed(started, 'active', 'w', 4_000).whiteMs, 3_000);
assert.equal(viewElapsed(started, 'active', 'w', 4_000).blackMs, 0);
assert.equal(viewElapsed(started, 'active', 'w', 4_000).gameMs, 3_000);

const afterWhite = chargeLog(started, 'w', 5_000);
assert.equal(afterWhite.whiteMs, 4_000);
assert.equal(afterWhite.turnStartedAt, 5_000);
const blackThinking = viewElapsed(afterWhite, 'active', 'b', 8_500);
assert.equal(blackThinking.whiteMs, 4_000);
assert.equal(blackThinking.blackMs, 3_500);
assert.equal(blackThinking.gameMs, 7_500);

const done = closeLog(chargeLog(afterWhite, 'b', 9_000), 9_000);
const finished = viewElapsed(done, 'finished', 'w', 20_000);
assert.equal(finished.whiteMs, 4_000);
assert.equal(finished.blackMs, 4_000);
assert.equal(finished.gameMs, 8_000);

const old = backfillLog({ createdAt: 100, updatedAt: 5_000, status: 'active' }, 9_000);
assert.equal(old.gameStartedAt, 100);
assert.equal(old.turnStartedAt, 5_000);
assert.equal(viewElapsed(old, 'active', 'w', 9_000).gameMs, 8_900);
assert.equal(viewElapsed(old, 'active', 'w', 9_000).whiteMs, 4_000);
assert.equal(viewElapsed(old, 'active', 'w', 9_000).blackMs, 0);

assert.equal(formatElapsed(0), '0:00');
assert.equal(formatElapsed(1_500), '0:01');
assert.equal(formatElapsed(61_000), '1:01');
assert.equal(formatElapsed(3_600_000), '1:00:00');
assert.equal(formatElapsed(50 * 3_600_000), '2d 2h');

console.log('elapsed checks passed');
