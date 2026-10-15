import { chargeTurn, type GameClock } from './clock';
import { chargeLog, type TimeLog } from './elapsed';

type PlayerStatus = 'waiting' | 'active' | 'finished';

/** One saved position. A game keeps the last four, so Back can undo four moves. */
export type PositionSnap = {
  fen: string;
  pgn: string;
  lastMove?: { from: string; to: string };
  status: PlayerStatus;
  result?: string;
};

export const MAX_BACKS = 4;

export function rememberPosition(history: PositionSnap[] | undefined, snap: PositionSnap): PositionSnap[] {
  return [...(history ?? []), snap].slice(-MAX_BACKS);
}

export function canTakeBack(game: { status: string; result?: string; history?: unknown[] }): boolean {
  if (!game.history?.length) return false;
  return canStepHistory(game);
}

/** Forward puts back a move that Back removed. The redo line holds at most four. */
export function canStepForward(game: { status: string; result?: string; redo?: unknown[] }): boolean {
  if (!game.redo?.length) return false;
  return canStepHistory(game);
}

function canStepHistory(game: { status: string; result?: string }): boolean {
  if (game.status === 'waiting') return false;
  const result = (game.result || '').toLowerCase();
  if (game.status === 'finished' && (result.includes('resign') || result.includes('on time'))) return false;
  return true;
}

/**
 * A take-back changes the position and whose turn it is.
 * Time already spent stays spent, and the clock keeps running for the side to move.
 */
export function keepClock(
  clock: GameClock | undefined,
  turn: 'w' | 'b',
  status: string,
  now: number,
): GameClock | undefined {
  if (!clock) return undefined;
  if (status === 'active') return chargeTurn(clock, turn, now);
  if (status === 'finished') return { ...clock, turnStartedAt: now };
  return clock;
}

export function keepLog(
  log: TimeLog | undefined,
  turn: 'w' | 'b',
  status: string,
  now: number,
): TimeLog | undefined {
  if (!log) return undefined;
  if (status === 'active') return chargeLog(log, turn, now);
  if (status === 'finished') return { ...log, finishedAt: 0, turnStartedAt: now };
  return log;
}
