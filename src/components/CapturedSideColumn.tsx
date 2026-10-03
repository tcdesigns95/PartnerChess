import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SilhouettePieceTile } from './SilhouettePieceTile';
import { getCapturedPieces } from '../lib/captures';
import { fontFamilyFor, useTheme } from '../context/ThemeContext';
import type { PieceColor } from './ChessPiece';

type PlayerCaptureRowProps = {
  fen: string;
  /** Color of the pieces that were taken. */
  lostBy: PieceColor;
  width: number;
  /** Name of the player sitting on this edge. */
  label?: string;
};

/** Captured pieces along one player's edge of the board. */
export function PlayerCaptureRow({ fen, lostBy, width, label }: PlayerCaptureRowProps) {
  const { theme } = useTheme();
  const pieces = getCapturedPieces(fen, lostBy);
  const size = 22;

  return (
    <View style={[styles.row, { width }]}>
      {!!label && (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: theme.colors.textMuted, fontFamily: fontFamilyFor(theme, 'body') },
          ]}
        >
          {label}
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.captures}
        contentContainerStyle={styles.content}
      >
        {pieces.map((p) => (
          <SilhouettePieceTile key={p.key} type={p.type} color={p.color} size={size} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    maxWidth: '48%',
  },
  captures: {
    flex: 1,
    height: 26,
  },
  content: {
    alignItems: 'center',
    gap: 2,
    minHeight: 26,
    paddingHorizontal: 2,
  },
});
