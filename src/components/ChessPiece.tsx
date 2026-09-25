import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

type ChessPieceProps = {
  type: PieceType;
  color: PieceColor;
  size: number;
};

/**
 * Board pieces — black & white silhouettes matching the asset pack shapes.
 * Black = solid black. White = white fill + black outline.
 */
export function ChessPiece({ type, color, size }: ChessPieceProps) {
  const isBlack = color === 'b';
  const fill = isBlack ? '#111111' : '#F7F7F7';
  const stroke = '#111111';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessibilityLabel={`${color}${type}`}
    >
      <PiecePath type={type} fill={fill} stroke={stroke} outlined={!isBlack} />
    </Svg>
  );
}

export function PiecePath({
  type,
  fill,
  stroke,
  outlined,
}: {
  type: PieceType;
  fill: string;
  stroke: string;
  outlined: boolean;
}) {
  const sw = outlined ? 2.2 : 0;

  const ground = (
    <Rect x="16" y="54" width="32" height="4.5" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
  );

  switch (type) {
    case 'p':
      return (
        <G>
          <Circle cx="32" cy="18" r="9" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Path
            d="M21 48 C21 33 25 28 32 28 C39 28 43 33 43 48 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Rect x="18" y="45" width="28" height="6" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    case 'r':
      return (
        <G>
          <Path
            d="M18 16 H26 V23 H30 V16 H34 V23 H38 V16 H46 V30 H18 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path d="M22 30 H42 V48 H22 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x="16" y="45" width="32" height="7" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    case 'n':
      return (
        <G>
          <Path
            d="M17 48 L19 32 L14 26 L22 12 L36 8 L50 16 L52 28 L42 30 L46 38 L44 48 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle cx="42" cy="20" r="2" fill={outlined ? stroke : '#F7F7F7'} />
          <Rect x="16" y="45" width="32" height="7" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    case 'b':
      return (
        <G>
          <Path
            d="M32 8 C22 18 20 30 25 42 C27 48 29 50 32 50 C35 50 37 48 39 42 C44 30 42 18 32 8 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M26 32 L40 20"
            stroke={outlined ? stroke : '#F7F7F7'}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <Rect x="18" y="46" width="28" height="6" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    case 'q':
      return (
        <G>
          <Path
            d="M14 28 L19 10 L28 24 L32 8 L36 24 L45 10 L50 28 L32 36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M20 36 C23 44 26 48 32 48 C38 48 41 44 44 36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Rect x="16" y="45" width="32" height="7" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    case 'k':
      return (
        <G>
          <Path
            d="M32 4 V16 M26 10 H38"
            stroke={stroke}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {!outlined && (
            <Path
              d="M32 4 V16 M26 10 H38"
              stroke={fill}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}
          <Path
            d="M18 28 C21 18 27 16 32 16 C37 16 43 18 46 28 L32 35 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M20 34 C23 44 26 48 32 48 C38 48 41 44 44 34 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Rect x="16" y="45" width="32" height="7" rx="1.5" fill={fill} stroke={stroke} strokeWidth={sw} />
          {ground}
        </G>
      );
    default:
      return null;
  }
}
