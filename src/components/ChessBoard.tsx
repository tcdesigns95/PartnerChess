import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Chess, type Square } from 'chess.js';
import { FILES, RANKS, pieceGlyph } from '../lib/pieces';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import type { PlayerColor } from '../lib/types';

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

  const chess = useMemo(() => new Chess(fen), [fen]);
  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      chess.moves({ square: selected as Square, verbose: true }).map((m) => m.to),
    );
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

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        const moving = chess.get(selected as Square);
        const isPromotion =
          moving?.type === 'p' &&
          ((moving.color === 'w' && square.endsWith('8')) ||
            (moving.color === 'b' && square.endsWith('1')));
        onMove(selected, square, isPromotion ? 'q' : undefined);
        setSelected(null);
        return;
      }
      if (piece && piece.color === chess.turn()) {
        setSelected(square);
        return;
      }
      setSelected(null);
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelected(square);
    }
  };

  return (
    <View onLayout={onLayout} style={styles.boardWrap}>
      {rankOrder.map((rank, rowIndex) => (
        <View key={rank} style={styles.row}>
          {fileOrder.map((file, colIndex) => {
            const square = `${file}${rank}`;
            const isLight = (rowIndex + colIndex) % 2 === 1;
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
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: isLight
                      ? theme.colors.lightSquare
                      : theme.colors.darkSquare,
                  },
                  isLast && { backgroundColor: theme.colors.lastMove },
                  isSelected && {
                    borderWidth: 2,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                {isTarget && (
                  <View
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
                  <Text
                    style={[
                      styles.piece,
                      {
                        fontSize: squareSize * 0.72,
                        color: piece.color === 'w' ? '#f8f4ec' : '#1a1a1a',
                        textShadowColor:
                          piece.color === 'w'
                            ? 'rgba(0,0,0,0.45)'
                            : 'rgba(255,255,255,0.25)',
                      },
                    ]}
                  >
                    {pieceGlyph(piece.color, piece.type, theme.pieceSet)}
                  </Text>
                )}
                {colIndex === 0 && (
                  <Text
                    style={[
                      styles.coord,
                      styles.rankCoord,
                      {
                        color: isLight
                          ? theme.colors.darkSquare
                          : theme.colors.lightSquare,
                        fontFamily: fontFamilyFor(theme, 'body'),
                      },
                    ]}
                  >
                    {rank}
                  </Text>
                )}
                {rowIndex === 7 && (
                  <Text
                    style={[
                      styles.coord,
                      styles.fileCoord,
                      {
                        color: isLight
                          ? theme.colors.darkSquare
                          : theme.colors.lightSquare,
                        fontFamily: fontFamilyFor(theme, 'body'),
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
  piece: {
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
