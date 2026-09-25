import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SilhouettePieceTile } from './SilhouettePieceTile';
import { getCapturedPieces } from '../lib/captures';
import type { PieceColor } from './ChessPiece';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';

type CapturedSideColumnProps = {
  fen: string;
  /** Your color — top shows what they took from you; bottom what you took. */
  myColor: PieceColor;
  width?: number;
  tileSize?: number;
};

/**
 * Right-side capture column: top = they took, bottom = you took.
 */
export function CapturedSideColumn({
  fen,
  myColor,
  width = 52,
  tileSize = 40,
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
        They
      </Text>
      <ScrollView
        style={styles.half}
        contentContainerStyle={styles.stack}
        showsVerticalScrollIndicator={false}
      >
        {theyTook.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 10,
              textAlign: 'center',
              fontFamily: fontFamilyFor(theme, 'body'),
            }}
          >
            —
          </Text>
        ) : (
          theyTook.map((p) => (
            <SilhouettePieceTile
              key={p.key}
              type={p.type}
              color={p.color}
              size={tileSize}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body', 'bold'),
          },
        ]}
      >
        You
      </Text>
      <ScrollView
        style={styles.half}
        contentContainerStyle={styles.stack}
        showsVerticalScrollIndicator={false}
      >
        {youTook.length === 0 ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: 10,
              textAlign: 'center',
              fontFamily: fontFamilyFor(theme, 'body'),
            }}
          >
            —
          </Text>
        ) : (
          youTook.map((p) => (
            <SilhouettePieceTile
              key={p.key}
              type={p.type}
              color={p.color}
              size={tileSize}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  half: {
    flex: 1,
    width: '100%',
  },
  stack: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  divider: {
    width: '80%',
    height: 1,
    marginVertical: 8,
  },
});
