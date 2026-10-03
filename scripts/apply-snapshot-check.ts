import assert from 'node:assert/strict';
import { shouldApplySnapshot } from '../src/lib/applySnapshot';

const base = 'start-fen';
const moved = 'moved-fen';
const other = 'other-fen';

assert.equal(
  shouldApplySnapshot({ rev: 10, fen: base, status: 'active', heldRevision: 0, pending: null }),
  true,
  'first snapshot lands',
);

assert.equal(
  shouldApplySnapshot({ rev: 9, fen: other, status: 'active', heldRevision: 10, pending: null }),
  false,
  'older snapshot stays off the board',
);

const pending = { fen: moved, baseFen: base, baseRev: 10 };

assert.equal(
  shouldApplySnapshot({ rev: 10, fen: base, status: 'active', heldRevision: 10, pending }),
  false,
  'a refresh of the pre-move position does not undo the move',
);

assert.equal(
  shouldApplySnapshot({ rev: 40, fen: base, status: 'active', heldRevision: 10, pending }),
  false,
  'a newer clock with the old position still does not undo the move',
);

assert.equal(
  shouldApplySnapshot({ rev: 11, fen: moved, status: 'active', heldRevision: 10, pending }),
  true,
  'the server copy of this move replaces the optimistic one',
);

assert.equal(
  shouldApplySnapshot({ rev: 30, fen: other, status: 'active', heldRevision: 10, pending }),
  true,
  'a different newer position replaces the optimistic move',
);

assert.equal(
  shouldApplySnapshot({
    rev: 10,
    fen: base,
    status: 'active',
    heldRevision: 10,
    pending: { ...pending, giveUp: true },
  }),
  true,
  'giving up restores the server position',
);

assert.equal(
  shouldApplySnapshot({ rev: 50, fen: base, status: 'finished', heldRevision: 10, pending }),
  true,
  'a finished game replaces an in-flight move',
);

console.log('apply snapshot checks passed');
