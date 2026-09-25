import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

/** Flat teal set matching the reference art. */
const PALETTE = {
  stroke: '#1B3A5F',
  darkFill: '#3E6F99',
  darkHighlight: '#8EBFDF',
  lightFill: '#F2F7FB',
  lightHighlight: '#8EBFDF',
} as const;

type ChessPieceProps = {
  type: PieceType;
  color: PieceColor;
  size: number;
};

function colorsFor(side: PieceColor) {
  if (side === 'b') {
    return {
      fill: PALETTE.darkFill,
      highlight: PALETTE.darkHighlight,
      stroke: PALETTE.stroke,
    };
  }
  return {
    fill: PALETTE.lightFill,
    highlight: PALETTE.lightHighlight,
    stroke: PALETTE.stroke,
  };
}

/** Shared two-tier pedestal used by every piece. */
function Base({
  fill,
  highlight,
  stroke,
}: {
  fill: string;
  highlight: string;
  stroke: string;
}) {
  return (
    <G>
      <Rect x="18" y="78" width="44" height="10" rx="2" fill={fill} stroke={stroke} strokeWidth="3" />
      <Rect x="24" y="70" width="32" height="10" rx="2" fill={fill} stroke={stroke} strokeWidth="3" />
      <Path d="M20 80 H30 V86 H20 Z" fill={highlight} opacity={0.95} />
      <Path d="M26 72 H34 V78 H26 Z" fill={highlight} opacity={0.95} />
    </G>
  );
}

function Pawn({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M32 68 C32 52 28 48 40 36 C52 48 48 52 48 68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M34 66 C34 54 32 50 40 40 C40 50 38 54 38 66 Z" fill={highlight} />
      <Circle cx="40" cy="28" r="12" fill={fill} stroke={stroke} strokeWidth="3" />
      <Path d="M32 28 A8 8 0 0 1 40 20 V36 A8 8 0 0 1 32 28 Z" fill={highlight} />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

function Rook({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M28 68 V34 H52 V68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M30 66 V36 H38 V66 Z" fill={highlight} />
      <Path
        d="M24 34 V18 H32 V26 H38 V18 H42 V26 H48 V18 H56 V34 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M26 32 V20 H32 V28 H30 V32 Z" fill={highlight} />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

function Bishop({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M40 16 C28 28 26 42 30 56 C32 64 34 68 40 68 C46 68 48 64 50 56 C54 42 52 28 40 16 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path
        d="M40 20 C34 28 32 40 34 54 C35 60 36 64 40 64 V20 Z"
        fill={highlight}
      />
      <Path d="M34 40 L46 28" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <Circle cx="40" cy="14" r="3.5" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

function Knight({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M26 68 L28 46 L22 40 L26 28 L34 22 L42 18 L50 22 L54 30 L48 36 L52 42 L56 50 L52 68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path
        d="M28 66 L30 46 L24 40 L28 30 L34 24 L40 22 V66 Z"
        fill={highlight}
      />
      <Circle cx="46" cy="28" r="2.2" fill={stroke} />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

function Queen({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M28 68 C30 48 28 42 40 34 C52 42 50 48 52 68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M32 66 C33 50 32 44 40 38 V66 Z" fill={highlight} />
      <Path
        d="M24 40 L28 18 L36 32 L40 14 L44 32 L52 18 L56 40 L40 48 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M28 38 L30 24 L36 34 L40 20 V46 Z" fill={highlight} />
      <Circle cx="40" cy="12" r="4" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

function King({ fill, highlight, stroke }: ReturnType<typeof colorsFor>) {
  return (
    <G>
      <Path
        d="M28 68 C30 46 28 40 40 32 C52 40 50 46 52 68 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M32 66 C33 48 32 42 40 36 V66 Z" fill={highlight} />
      <Path
        d="M26 36 C28 24 34 20 40 20 C46 20 52 24 54 36 L40 44 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path d="M30 35 C32 26 36 22 40 22 V42 Z" fill={highlight} />
      <Path
        d="M40 8 V22 M34 14 H46"
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Base fill={fill} highlight={highlight} stroke={stroke} />
    </G>
  );
}

const RENDERERS = {
  p: Pawn,
  r: Rook,
  b: Bishop,
  n: Knight,
  q: Queen,
  k: King,
} as const;

export function ChessPiece({ type, color, size }: ChessPieceProps) {
  const palette = colorsFor(color);
  const Body = RENDERERS[type];

  return (
    <Svg width={size} height={size} viewBox="0 0 80 96" accessibilityLabel={`${color}${type}`}>
      <Body {...palette} />
    </Svg>
  );
}
