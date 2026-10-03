import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChessPiece, type PieceColor, type PieceType } from './ChessPiece';

type SilhouettePieceTileProps = {
  type: PieceType;
  color: PieceColor;
  size?: number;
};

/** Captured-piece chips using the same silhouette paths as the board. */
export function SilhouettePieceTile({
  type,
  color,
  size = 36,
}: SilhouettePieceTileProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <ChessPiece type={type} color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
