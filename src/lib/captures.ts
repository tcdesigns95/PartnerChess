import { Chess } from 'chess.js';
import type { PieceColor, PieceType } from '../components/ChessPiece';

const START_COUNT: Record<PieceType, number> = {
  k: 1,
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

/** Display order for captured trays (most valuable first). */
export const CAPTURE_ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export type CapturedPiece = {
  type: PieceType;
  color: PieceColor;
  key: string;
};

function countSide(fen: string, color: PieceColor): Record<PieceType, number> {
  const counts: Record<PieceType, number> = {
    k: 0,
    q: 0,
    r: 0,
    b: 0,
    n: 0,
    p: 0,
  };
  try {
    const board = new Chess(fen).board();
    for (const row of board) {
      for (const cell of row) {
        if (!cell || cell.color !== color) continue;
        counts[cell.type] += 1;
      }
    }
  } catch {
    // ignore bad fen
  }
  return counts;
}

/** Pieces of `color` that have been captured (no longer on the board). */
export function getCapturedPieces(fen: string, color: PieceColor): CapturedPiece[] {
  const onBoard = countSide(fen, color);
  const out: CapturedPiece[] = [];
  for (const type of CAPTURE_ORDER) {
    const missing = Math.max(0, START_COUNT[type] - onBoard[type]);
    for (let i = 0; i < missing; i++) {
      out.push({ type, color, key: `${color}-${type}-${i}` });
    }
  }
  return out;
}
