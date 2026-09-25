import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SilhouettePieceTile } from './SilhouettePieceTile';
import { getCapturedPieces } from '../lib/captures';
import type { PieceColor } from './ChessPiece';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';

type CapturedPiecesRailProps = {
  fen: string;
  /** Whose pieces are shown as captured (the side that lost them). */
  lostBy: PieceColor;
  label: string;
  tileSize?: number;
};

export function CapturedPiecesRail({
  fen,
  lostBy,
  label,
  tileSize = 34,
}: CapturedPiecesRailProps) {
  const { theme } = useTheme();
  const pieces = getCapturedPieces(fen, lostBy);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body', 'bold'),
          },
        ]}
      >
        {label}
        {pieces.length === 0 ? ' — none yet' : ` · ${pieces.length}`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {pieces.map((p) => (
          <SilhouettePieceTile
            key={p.key}
            type={p.type}
            color={p.color}
            size={tileSize}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 58,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
    minHeight: 36,
  },
});
