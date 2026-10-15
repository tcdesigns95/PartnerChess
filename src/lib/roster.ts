import type { Session } from './types';

export const ROSTER_LIMIT = 24;

/** Put this seat first and keep one row per game. */
export function upsertSeat(list: Session[], seat: Session): Session[] {
  const rest = list.filter((item) => item.gameId !== seat.gameId);
  return [seat, ...rest].slice(0, ROSTER_LIMIT);
}

export function dropSeat(list: Session[], gameId: string): Session[] {
  return list.filter((item) => item.gameId !== gameId);
}
