import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Chess, type Square } from 'chess.js';
import { FILES, RANKS } from '../lib/pieces';
import { ChessPiece } from './ChessPiece';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import type { PlayerColor } from '../lib/types';

/** Last-move mark: a neon frame, not a filled square. */
const LAST_MOVE_BORDER = '#39FF14';

type ChessBoardProps = {
  fen: string;
  orientation: PlayerColor;
  interactive: boolean;
  lastMove?: { from: string; to: string };
  onMove: (from: string, to: string, promotion?: string) => void;
};

export function ChessBoard({
  fen,
  orientation,
  interactive,
  lastMove,
  onMove,
}: ChessBoardProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(320);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Drop selection whenever the position changes (after a move / rejoin)
  useEffect(() => {
    setSelected(null);
  }, [fen]);

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    try {
      return new Set(
        chess
          .moves({ square: selected as Square, verbose: true })
          .map((m) => m.to),
      );
    } catch {
      return new Set<string>();
    }
  }, [chess, selected]);

  const rankOrder =
    orientation === 'w' ? [...RANKS].reverse() : [...RANKS];
  const fileOrder = orientation === 'w' ? [...FILES] : [...FILES].reverse();

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0) setBoardWidth(w);
  };

  const squareSize = boardWidth / 8;

  const handleSquarePress = (square: string) => {
    if (!interactive) return;
    const piece = chess.get(square as Square);
    const turn = chess.turn();

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        const moving = chess.get(selected as Square);
        const needsPromotion =
          moving?.type === 'p' &&
          ((moving.color === 'w' && square[1] === '8') ||
            (moving.color === 'b' && square[1] === '1'));
        onMove(selected, square, needsPromotion ? 'q' : undefined);
        setSelected(null);
        return;
      }
      // Switch selection to another friendly piece
      if (piece && piece.color === turn) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === turn) {
      setSelected(square);
    }
  };

  return (
    <View onLayout={onLayout} style={styles.boardWrap}>
      {rankOrder.map((rank, rowIndex) => (
        <View key={rank} style={styles.row}>
          {fileOrder.map((file, colIndex) => {
            const square = `${file}${rank}`;
            // Standard chessboard coloring from a1 (dark) perspective
            const fileIndex = FILES.indexOf(file as (typeof FILES)[number]);
            const rankIndex = Number(rank) - 1;
            const isLight = (fileIndex + rankIndex) % 2 === 1;
            const piece = chess.get(square as Square);
            const isLast =
              lastMove &&
              (lastMove.from === square || lastMove.to === square);
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);

            return (
              <Pressable
                key={square}
                onPress={() => handleSquarePress(square)}
                // Keep SVG pieces from eating taps on web
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: isLight
                      ? theme.colors.lightSquare
                      : theme.colors.darkSquare,
                  },
                  isSelected && {
                    borderWidth: 2,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                {isLast && (
                  <View pointerEvents="none" style={styles.lastMoveBorder} />
                )}
                {isTarget && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.targetDot,
                      {
                        backgroundColor: piece
                          ? 'transparent'
                          : theme.colors.accent,
                        borderColor: theme.colors.accent,
                        borderWidth: piece ? 2 : 0,
                        width: piece ? squareSize * 0.85 : squareSize * 0.28,
                        height: piece ? squareSize * 0.85 : squareSize * 0.28,
                        borderRadius: piece ? 4 : 99,
                      },
                    ]}
                  />
                )}
                {piece && (
                  <View pointerEvents="none">
                    <ChessPiece
                      type={piece.type}
                      color={piece.color}
                      size={squareSize * 0.9}
                    />
                  </View>
                )}
                {colIndex === 0 && (
                  <Text
                    pointerEvents="none"
                    style={[
                      styles.coord,
                      styles.rankCoord,
                      {
                        color: isLight
                          ? theme.colors.darkSquare
                          : theme.colors.lightSquare,
                        fontFamily: fontFamilyFor(theme, 'body'),
                        opacity: 0.55,
                      },
                    ]}
                  >
                    {rank}
                  </Text>
                )}
                {rowIndex === 7 && (
                  <Text
                    pointerEvents="none"
                    style={[
                      styles.coord,
                      styles.fileCoord,
                      {
                        color: isLight
                          ? theme.colors.darkSquare
                          : theme.colors.lightSquare,
                        fontFamily: fontFamilyFor(theme, 'body'),
                        opacity: 0.55,
                      },
                    ]}
                  >
                    {file}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  boardWrap: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastMoveBorder: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderWidth: 3,
    borderColor: LAST_MOVE_BORDER,
    borderRadius: 2,
    boxShadow: '0 0 8px #39FF14',
  },
  targetDot: {
    position: 'absolute',
    opacity: 0.45,
  },
  coord: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.85,
  },
  rankCoord: {
    top: 2,
    left: 3,
  },
  fileCoord: {
    bottom: 2,
    right: 3,
  },
});
