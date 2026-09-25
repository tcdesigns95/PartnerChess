import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';
import { PiecePath, type PieceColor, type PieceType } from './ChessPiece';

type SilhouettePieceTileProps = {
  type: PieceType;
  color: PieceColor;
  size?: number;
};

/**
 * Rounded tile buttons from the asset pack, in black & white.
 * Black pieces: black silhouette on light tile.
 * White pieces: white silhouette on dark tile.
 */
export function SilhouettePieceTile({
  type,
  color,
  size = 36,
}: SilhouettePieceTileProps) {
  const isBlackPiece = color === 'b';
  const tileBg = isBlackPiece ? '#EDEDED' : '#2C2C2C';
  const tileShade = isBlackPiece ? '#D4D4D4' : '#1C1C1C';
  const fill = isBlackPiece ? '#111111' : '#F5F5F5';
  const stroke = '#111111';

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: tileBg,
          borderRadius: size * 0.24,
        },
      ]}
    >
      <View
        style={[
          styles.shade,
          {
            backgroundColor: tileShade,
            height: size * 0.2,
            borderBottomLeftRadius: size * 0.24,
            borderBottomRightRadius: size * 0.24,
          },
        ]}
      />
      <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 64 64">
        <PiecePath type={type} fill={fill} stroke={stroke} outlined={!isBlackPiece} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
