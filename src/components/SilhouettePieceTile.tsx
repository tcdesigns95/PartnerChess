import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { PiecePath, type PieceColor, type PieceType } from './ChessPiece';

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
  const isBlackPiece = color === 'b';
  const fill = isBlackPiece ? '#121212' : '#FFFFFF';
  const stroke = '#121212';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 80 100">
        <PiecePath type={type} fill={fill} stroke={stroke} outlined={!isBlackPiece} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
