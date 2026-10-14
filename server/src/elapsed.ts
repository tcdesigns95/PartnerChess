type PlayerColor = 'w' | 'b';

/** Time actually used. Counts up for the whole game and for each player. */
export type TimeLog = {
  /** When the second player joined. Zero while the seat is still open. */
  gameStartedAt: number;
  /** When the game ended. Zero while it is still going. */
  finishedAt: number;
  /** Time already spent, not including the turn that is open right now. */
  whiteMs: number;
  blackMs: number;
  /** When the side to move began this turn. Zero until the game is active. */
  turnStartedAt: number;
};

export type ElapsedView = {
  gameMs: number;
  whiteMs: number;
  blackMs: number;
};

export function startLog(now: number): TimeLog {
  return { gameStartedAt: now, finishedAt: 0, whiteMs: 0, blackMs: 0, turnStartedAt: now };
}

/**
 * A game saved before count-up timers existed.
 * The match length starts at creation. The open turn starts at the last save,
 * which is the last move or note we still have.
 */
export function backfillLog(input: { createdAt: number; updatedAt: number; status: string }, now: number): TimeLog {
  if (input.status === 'finished') {
    return {
      gameStartedAt: input.createdAt,
      finishedAt: input.updatedAt || now,
      whiteMs: 0,
      blackMs: 0,
      turnStartedAt: 0,
    };
  }
  return {
    gameStartedAt: input.createdAt,
    finishedAt: 0,
    whiteMs: 0,
    blackMs: 0,
    turnStartedAt: input.updatedAt || now,
  };
}

export function logFor(
  log: TimeLog | undefined,
  input: { createdAt: number; updatedAt: number; status: string },
  now: number,
): TimeLog {
  if (log?.gameStartedAt) return log;
  return backfillLog(input, now);
}

/** Fold the open turn into that player's total and start the other player's turn. */
export function chargeLog(log: TimeLog, mover: PlayerColor, now: number): TimeLog {
  const next = { ...log };
  const started = log.turnStartedAt || now;
  const spent = Math.max(0, now - started);
  if (mover === 'w') next.whiteMs += spent;
  else next.blackMs += spent;
  next.turnStartedAt = now;
  return next;
}

/** Stop the count. The open turn must already be folded in. */
export function closeLog(log: TimeLog, now: number): TimeLog {
  return { ...log, finishedAt: log.finishedAt || now, turnStartedAt: 0 };
}

export function viewElapsed(
  log: TimeLog,
  status: 'waiting' | 'active' | 'finished',
  turn: PlayerColor,
  now: number,
): ElapsedView {
  const end = status === 'active' ? now : log.finishedAt || now;
  const gameMs = log.gameStartedAt ? Math.max(0, end - log.gameStartedAt) : 0;
  let whiteMs = log.whiteMs;
  let blackMs = log.blackMs;
  if (status === 'active' && log.turnStartedAt) {
    const open = Math.max(0, now - log.turnStartedAt);
    if (turn === 'w') whiteMs += open;
    else blackMs += open;
  }
  return { gameMs, whiteMs, blackMs };
}
