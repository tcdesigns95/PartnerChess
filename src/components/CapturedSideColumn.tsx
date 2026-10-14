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
  /** Clock on this player's side. */
  aside?: string;
  asideColor?: string;
  /** Spoken form of the clock, such as "9:58 left" or "4:12 used". */
  asideLabel?: string;
  /** Time this player has used, shown beside a countdown clock. */
  used?: string;
};

/** Captured pieces along one player's edge of the board. */
export function PlayerCaptureRow({
  fen,
  lostBy,
  width,
  label,
  aside,
  asideColor,
  asideLabel,
  used,
}: PlayerCaptureRowProps) {
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
            {
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              maxWidth: used ? '34%' : '48%',
            },
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
        {!!used && (
          <Text
            accessibilityLabel={`${used} used`}
            style={[
              styles.used,
              { color: theme.colors.textMuted, fontFamily: fontFamilyFor(theme, 'body') },
            ]}
          >
            {used}
          </Text>
        )}
        {!!aside && (
          <Text
            accessibilityLabel={asideLabel || aside}
            style={[
              styles.aside,
              { color: asideColor || theme.colors.text, fontFamily: fontFamilyFor(theme, 'body', 'bold') },
            ]}
          >
            {aside}
          </Text>
        )}
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
  },
  captures: {
    flex: 1,
    height: 26,
  },
  used: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  aside: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'right',
  },
  content: {
    alignItems: 'center',
    gap: 2,
    minHeight: 26,
    paddingHorizontal: 2,
  },
});
