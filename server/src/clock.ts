type PlayerColor = 'w' | 'b';

export type GameClock = {
  initialMs: number;
  whiteMs: number;
  blackMs: number;
  /** When the side to move started this turn. Zero until both players are in. */
  turnStartedAt: number;
};

export const CLOCK_CHOICES = [5 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 24 * 60 * 60 * 1000];

export function clockFromChoice(ms: number | undefined, now: number): GameClock | undefined {
  if (!ms || !CLOCK_CHOICES.includes(ms)) return undefined;
  return { initialMs: ms, whiteMs: ms, blackMs: ms, turnStartedAt: now };
}

export function bankRemaining(
  clock: GameClock,
  status: 'waiting' | 'active' | 'finished',
  turn: PlayerColor,
  color: PlayerColor,
  now: number,
): number {
  const bank = color === 'w' ? clock.whiteMs : clock.blackMs;
  if (status !== 'active' || turn !== color || !clock.turnStartedAt) return Math.max(0, bank);
  return Math.max(0, bank - (now - clock.turnStartedAt));
}

/** Fold the running turn into the banks and start the other player's clock. */
export function chargeTurn(clock: GameClock, mover: PlayerColor, now: number): GameClock {
  const next = { ...clock };
  const started = clock.turnStartedAt || now;
  const left = Math.max(0, (mover === 'w' ? clock.whiteMs : clock.blackMs) - (now - started));
  if (mover === 'w') next.whiteMs = left;
  else next.blackMs = left;
  next.turnStartedAt = now;
  return next;
}
