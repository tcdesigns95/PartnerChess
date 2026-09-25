import type { PieceSetId } from '../theme/themes';

const CLASSIC: Record<string, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

/** Slightly different unicode choices for visual variety across themes. */
const MODERN: Record<string, string> = {
  ...CLASSIC,
  wK: '♔',
  bK: '♚',
};

const WALNUT: Record<string, string> = {
  ...CLASSIC,
};

const SETS: Record<PieceSetId, Record<string, string>> = {
  classic: CLASSIC,
  modern: MODERN,
  walnut: WALNUT,
};

export function pieceGlyph(
  color: 'w' | 'b',
  type: 'k' | 'q' | 'r' | 'b' | 'n' | 'p',
  pieceSet: PieceSetId,
): string {
  const key = `${color}${type.toUpperCase()}`;
  return SETS[pieceSet][key] ?? CLASSIC[key] ?? '?';
}

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
