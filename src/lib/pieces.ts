import type { PieceSetId } from '../theme/themes';

/**
 * Filled glyphs for both sides — same silhouette style.
 * Side is told apart by paint color in ChessBoard, not outline vs fill.
 */
const FILLED = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
  N: '♞',
  P: '♟',
} as const;

function setFor(_pieceSet: PieceSetId): Record<string, string> {
  return {
    wK: FILLED.K,
    wQ: FILLED.Q,
    wR: FILLED.R,
    wB: FILLED.B,
    wN: FILLED.N,
    wP: FILLED.P,
    bK: FILLED.K,
    bQ: FILLED.Q,
    bR: FILLED.R,
    bB: FILLED.B,
    bN: FILLED.N,
    bP: FILLED.P,
  };
}

const SETS: Record<PieceSetId, Record<string, string>> = {
  classic: setFor('classic'),
  modern: setFor('modern'),
  walnut: setFor('walnut'),
};

export function pieceGlyph(
  color: 'w' | 'b',
  type: 'k' | 'q' | 'r' | 'b' | 'n' | 'p',
  pieceSet: PieceSetId,
): string {
  const key = `${color}${type.toUpperCase()}`;
  return SETS[pieceSet][key] ?? FILLED[type.toUpperCase() as keyof typeof FILLED] ?? '?';
}

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
