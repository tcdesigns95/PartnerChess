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
 * Exact silhouette language from the user's icon sheet, in black & white.
 * Shared wide pedestal + thin collar line on every piece.
 */
export function ChessPiece({ type, color, size }: ChessPieceProps) {
  const isBlack = color === 'b';
  const fill = isBlack ? '#121212' : '#FFFFFF';
  const stroke = '#121212';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 80 100"
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
  const sw = outlined ? 2.4 : 0;

  /** Shared base from the asset pack — wide pedestal + thin collar line. */
  const Pedestal = (
    <G>
      <Path
        d="M18 78 H62 L58 88 H22 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Path
        d="M22 88 H58 L54 96 H26 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Thin horizontal collar line */}
      <Path
        d="M26 84 H54"
        stroke={outlined ? stroke : fill === '#121212' ? '#3A3A3A' : stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={outlined ? 1 : 0.9}
      />
    </G>
  );

  switch (type) {
    case 'p':
      return (
        <G>
          <Circle cx="40" cy="28" r="12" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Path
            d="M28 52 C28 40 32 36 40 36 C48 36 52 40 52 52 L50 78 H30 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {Pedestal}
        </G>
      );
    case 'r':
      return (
        <G>
          {/* Four crenellations */}
          <Path
            d="M22 18 H30 V28 H34 V18 H38 V28 H42 V18 H46 V28 H50 V18 H58 V40 H22 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M26 40 H54 V78 H26 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {Pedestal}
        </G>
      );
    case 'n':
      // Horse faces LEFT as in the asset sheet
      return (
        <G>
          <Path
            d="M58 78 L56 52 L60 44 L52 28 L48 18 L36 12 L22 18 L18 30 L28 34 L24 42 L20 50 L24 58 L28 78 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {/* Notched mane */}
          <Path
            d="M48 18 L52 24 L46 28 L50 34 L44 38"
            fill="none"
            stroke={outlined ? stroke : fill === '#121212' ? '#F5F5F5' : stroke}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.001}
          />
          <Circle
            cx="30"
            cy="26"
            r="2.2"
            fill={outlined ? stroke : '#F5F5F5'}
          />
          {Pedestal}
        </G>
      );
    case 'b':
      return (
        <G>
          <Path
            d="M40 12 C28 24 26 40 30 58 C32 68 34 74 40 74 C46 74 48 68 50 58 C54 40 52 24 40 12 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {/* Mitre slit */}
          <Path
            d="M34 40 L48 26"
            stroke={outlined ? stroke : '#F5F5F5'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M32 74 H48 L50 78 H30 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {Pedestal}
        </G>
      );
    case 'q':
      return (
        <G>
          {/* Three-point crown + center orb */}
          <Path
            d="M20 40 L26 16 L34 34 L40 12 L46 34 L54 16 L60 40 L40 50 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Circle cx="40" cy="14" r="4" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Path
            d="M26 50 C28 62 32 72 40 72 C48 72 52 62 54 50 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Path
            d="M28 72 H52 L54 78 H26 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {Pedestal}
        </G>
      );
    case 'k':
      return (
        <G>
          {/* Cross */}
          <Path
            d="M40 4 V22 M32 12 H48"
            stroke={stroke}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {!outlined && (
            <Path
              d="M40 4 V22 M32 12 H48"
              stroke={fill}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}
          {/* Crown / neck indentation */}
          <Path
            d="M24 36 C26 26 32 24 40 24 C48 24 54 26 56 36 L40 46 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <Path
            d="M26 46 C28 60 32 72 40 72 C48 72 52 60 54 46 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Path
            d="M28 72 H52 L54 78 H26 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          {Pedestal}
        </G>
      );
    default:
      return null;
  }
}
