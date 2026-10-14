import assert from 'node:assert/strict';
import { bankRemaining, chargeTurn, clockFromChoice } from '../server/src/clock.ts';

const clock = clockFromChoice(10 * 60 * 1000, 1_000);
assert.ok(clock);
assert.equal(bankRemaining(clock, 'waiting', 'w', 'w', 5_000), 10 * 60 * 1000);

const running = { ...clock, turnStartedAt: 10_000 };
assert.equal(bankRemaining(running, 'active', 'w', 'w', 12_500), 10 * 60 * 1000 - 2_500);
assert.equal(bankRemaining(running, 'active', 'w', 'b', 12_500), 10 * 60 * 1000);

const charged = chargeTurn(running, 'w', 15_000);
assert.equal(charged.whiteMs, 10 * 60 * 1000 - 5_000);
assert.equal(charged.blackMs, 10 * 60 * 1000);
assert.equal(charged.turnStartedAt, 15_000);
assert.equal(bankRemaining(charged, 'active', 'b', 'b', 16_000), 10 * 60 * 1000 - 1_000);

assert.equal(clockFromChoice(1234, 0), undefined);
console.log('clock checks passed');
