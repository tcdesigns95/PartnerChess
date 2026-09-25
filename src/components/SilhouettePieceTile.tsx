import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { PieceColor, PieceType } from './ChessPiece';

type SilhouettePieceProps = {
  type: PieceType;
  /** Whose piece this was (before capture). */
  color: PieceColor;
  size?: number;
};

/**
 * Minimalist silhouette icons in rounded tiles — black & white
 * adaptation of the brown/tan asset pack.
 */
export function SilhouettePieceTile({
  type,
  color,
  size = 36,
}: SilhouettePieceProps) {
  const isDarkPiece = color === 'b';
  const tileBg = isDarkPiece ? '#E8E8E8' : '#2A2A2A';
  const tileShade = isDarkPiece ? '#D0D0D0' : '#1A1A1A';
  const ink = isDarkPiece ? '#111111' : '#F5F5F5';
  const inkStroke = isDarkPiece ? '#111111' : '#111111';

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: tileBg,
          borderRadius: size * 0.22,
        },
      ]}
    >
      <View
        style={[
          styles.shade,
          {
            backgroundColor: tileShade,
            borderBottomLeftRadius: size * 0.22,
            borderBottomRightRadius: size * 0.22,
            height: size * 0.18,
          },
        ]}
      />
      <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 64 64">
        <SilhouetteBody type={type} fill={ink} stroke={inkStroke} />
      </Svg>
    </View>
  );
}

function SilhouetteBody({
  type,
  fill,
  stroke,
}: {
  type: PieceType;
  fill: string;
  stroke: string;
}) {
  // Ground line under every piece (from the asset pack)
  const ground = (
    <Rect x="18" y="54" width="28" height="4" rx="1.5" fill={fill} />
  );

  switch (type) {
    case 'p':
      return (
        <G>
          <Circle cx="32" cy="20" r="9" fill={fill} stroke={stroke} strokeWidth="1" />
          <Path
            d="M22 48 C22 34 26 30 32 30 C38 30 42 34 42 48 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Rect x="20" y="46" width="24" height="5" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    case 'r':
      return (
        <G>
          <Path
            d="M20 18 H28 V24 H36 V18 H44 V30 H20 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <Path
            d="M24 30 H40 V48 H24 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Rect x="18" y="46" width="28" height="6" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    case 'n':
      return (
        <G>
          <Path
            d="M18 48 L20 34 L16 28 L22 16 L34 12 L46 18 L48 28 L40 30 L44 38 L42 48 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <Circle cx="40" cy="22" r="1.8" fill={fill === '#111111' ? '#E8E8E8' : '#111111'} />
          <Rect x="18" y="46" width="28" height="6" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    case 'b':
      return (
        <G>
          <Path
            d="M32 10 C24 18 22 28 26 40 C28 46 30 48 32 48 C34 48 36 46 38 40 C42 28 40 18 32 10 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Path
            d="M28 30 L38 20"
            stroke={fill === '#111111' ? '#E8E8E8' : '#111111'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Rect x="20" y="46" width="24" height="5" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    case 'q':
      return (
        <G>
          <Path
            d="M16 28 L20 12 L28 24 L32 10 L36 24 L44 12 L48 28 L32 36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <Path
            d="M22 36 C24 42 26 46 32 46 C38 46 40 42 42 36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Rect x="18" y="46" width="28" height="6" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    case 'k':
      return (
        <G>
          <Path
            d="M32 8 V18 M27 13 H37"
            stroke={fill}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M20 28 C22 20 28 18 32 18 C36 18 42 20 44 28 L32 34 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Path
            d="M22 34 C24 42 26 46 32 46 C38 46 40 42 42 34 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1"
          />
          <Rect x="18" y="46" width="28" height="6" rx="1.5" fill={fill} />
          {ground}
        </G>
      );
    default:
      return null;
  }
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
