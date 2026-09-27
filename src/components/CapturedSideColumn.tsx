import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SilhouettePieceTile } from './SilhouettePieceTile';
import { getCapturedPieces } from '../lib/captures';
import type { PieceColor } from './ChessPiece';
import { useTheme } from '../context/ThemeContext';

type CapturedSideColumnProps = {
  fen: string;
  myColor: PieceColor;
  width?: number;
  tileSize?: number;
};

/** Right-side captures: top = they took, bottom = you took. No labels. */
export function CapturedSideColumn({
  fen,
  myColor,
  width = 48,
  tileSize = 36,
}: CapturedSideColumnProps) {
  const { theme } = useTheme();
  const theyTook = getCapturedPieces(fen, myColor);
  const youTook = getCapturedPieces(fen, myColor === 'w' ? 'b' : 'w');

  return (
    <View
      style={[
        styles.column,
        {
          width,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <ScrollView
        style={styles.half}
        contentContainerStyle={styles.stack}
        showsVerticalScrollIndicator={false}
      >
        {theyTook.map((p) => (
          <SilhouettePieceTile
            key={p.key}
            type={p.type}
            color={p.color}
            size={tileSize}
          />
        ))}
      </ScrollView>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <ScrollView
        style={styles.half}
        contentContainerStyle={styles.stack}
        showsVerticalScrollIndicator={false}
      >
        {youTook.map((p) => (
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
  column: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  half: {
    flex: 1,
    width: '100%',
  },
  stack: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  divider: {
    width: '70%',
    height: 1,
    marginVertical: 6,
  },
});
