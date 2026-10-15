export type PendingMove = {
  /** Position after the move this device just played. */
  fen: string;
  /** Position before that move. A refresh of this fen is not a new position. */
  baseFen: string;
  baseRev: number;
  /** The server rejected the move, or the retry window closed. */
  giveUp?: boolean;
};

/**
 * Decide whether a server snapshot may replace the board.
 * A move that is still in flight stays on screen until the server has that
 * position, a different newer position, or the move has been given up.
 */
export function shouldApplySnapshot(input: {
  rev: number;
  fen: string;
  status: string;
  heldRevision: number;
  pending: PendingMove | null;
  /** Position currently on the board. The same revision must not swap it. */
  heldFen?: string;
  /** A newer snapshot that puts a move back on purpose. */
  undo?: boolean;
}): boolean {
  const { rev, fen, status, heldRevision, pending, heldFen, undo } = input;
  if (!pending) {
    if (rev > heldRevision) return true;
    if (rev < heldRevision) return false;
    return heldFen == null || fen === heldFen;
  }
  if (undo && rev > pending.baseRev) return true;
  if (fen === pending.fen) return true;
  if (fen === pending.baseFen) {
    return pending.giveUp === true || status === 'finished';
  }
  return rev > pending.baseRev;
}
