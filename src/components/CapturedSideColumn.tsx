import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SilhouettePieceTile } from './SilhouettePieceTile';
import { getCapturedPieces } from '../lib/captures';
import type { PieceColor } from './ChessPiece';

type PlayerCaptureRowProps = {
  fen: string;
  /** Color of the pieces that were taken. */
  lostBy: PieceColor;
  width: number;
};

/** Captured pieces along one player's edge of the board. */
export function PlayerCaptureRow({ fen, lostBy, width }: PlayerCaptureRowProps) {
  const pieces = getCapturedPieces(fen, lostBy);
  const size = 22;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.row, { width }]}
      contentContainerStyle={styles.content}
    >
      {pieces.map((p) => (
        <SilhouettePieceTile key={p.key} type={p.type} color={p.color} size={size} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 26,
  },
  content: {
    alignItems: 'center',
    gap: 2,
    minHeight: 26,
    paddingHorizontal: 2,
  },
});
