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
}): boolean {
  const { rev, fen, status, heldRevision, pending } = input;
  if (!pending) return rev >= heldRevision;
  if (fen === pending.fen) return true;
  if (fen === pending.baseFen) {
    return pending.giveUp === true || status === 'finished';
  }
  return rev > pending.baseRev;
}
