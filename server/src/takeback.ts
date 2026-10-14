import type { GameClock } from './clock';
import type { TimeLog } from './elapsed';

type PlayerStatus = 'waiting' | 'active' | 'finished';

/** One saved position. A game keeps the last four, so Back can undo four moves. */
export type PositionSnap = {
  fen: string;
  pgn: string;
  lastMove?: { from: string; to: string };
  status: PlayerStatus;
  result?: string;
  clock?: GameClock;
  log?: TimeLog;
};

export const MAX_BACKS = 4;

export function rememberPosition(history: PositionSnap[] | undefined, snap: PositionSnap): PositionSnap[] {
  return [...(history ?? []), snap].slice(-MAX_BACKS);
}

export function canTakeBack(game: { status: string; result?: string; history?: unknown[] }): boolean {
  if (!game.history?.length) return false;
  if (game.status === 'waiting') return false;
  const result = (game.result || '').toLowerCase();
  if (game.status === 'finished' && (result.includes('resign') || result.includes('on time'))) return false;
  return true;
}

/** Put the side to move back on the clock from now, with the time they had before that move. */
export function resumeClock(clock: GameClock | undefined, now: number): GameClock | undefined {
  if (!clock) return undefined;
  return { ...clock, turnStartedAt: clock.turnStartedAt ? now : clock.turnStartedAt };
}

export function resumeLog(log: TimeLog | undefined, now: number): TimeLog | undefined {
  if (!log) return undefined;
  return {
    ...log,
    finishedAt: 0,
    turnStartedAt: log.turnStartedAt ? now : log.turnStartedAt,
  };
}
