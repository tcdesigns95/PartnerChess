import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

type ChessPieceProps = {
  type: PieceType;
  color: PieceColor;
  size: number;
};

/**
 * Silhouettes traced from assets/piece-icons-reference.jpg.
 * One viewBox keeps every piece on the same baseline.
 */
export const PIECE_VIEWBOX = '18 6 104 104';

const PIECE_PATHS: Record<PieceType, string> = {
  // Thick cross so the king still reads when the neon glow is on.
  k: 'M36 105L40 96L44 80L38 68L42 60L48 50L50 42L50 34L40 34L40 20L50 20L50 8L70 8L70 20L80 20L80 34L70 34L70 42L72 50L78 60L82 68L76 80L80 96L84 105Z',
  // Coronet of round pearls and a gown. No center spike.
  q: 'M34 105C36 98 40 88 44 78C48 68 52 64 50 58C48 52 44 48 40 44L34 40C33 32.1 36.1 29 40 29C43.9 29 47 32.1 47 36C49 40 51 38 53 36C52 30.6 55.6 27 60 27C64.4 27 68 30.6 68 35C69 38 71 40 74 36C73 32.1 76.1 29 80 29C83.9 29 87 32.1 87 36L86 40L80 44C76 48 72 52 70 58C68 64 72 68 76 78C80 88 84 98 86 105Z',
  b: 'M35.5 104.4C33.7 102.2 35.2 98.9 40.2 94.3C46.5 88.4 49.5 82.2 49.6 74.8L49.7 69.2L45.9 68.2C39.8 66.7 38.9 61.7 44.6 61.7C46.2 61.7 46.7 61.3 46.5 60.1C46.3 59.2 46.7 57.9 47.4 57.1C48.4 55.9 48.3 55.1 46.7 52.0C42.9 44.1 45.1 34.6 52.6 26.2C54.6 23.9 56.1 21.3 56.1 20.1C56.1 17.6 57.6 16.0 60.0 16.0C62.5 16.0 63.9 17.6 63.9 20.4C63.9 21.6 64.5 23.2 65.2 23.8C67.0 25.3 66.9 26.1 63.0 34.0C59.2 41.9 59.0 42.7 60.9 42.7C61.6 42.7 63.6 39.8 65.6 35.8C69.6 27.9 70.1 27.8 73.5 34.7C75.9 39.7 76.1 47.1 74.0 51.3C71.7 55.7 72.7 61.5 75.7 61.9C81.4 62.5 79.8 67.5 73.6 68.5L70.3 69.1L70.4 74.6C70.5 82.4 73.0 87.5 79.9 94.2C84.9 99.0 85.5 99.9 85.3 102.4L85.0 105.2L60.8 105.5C40.1 105.6 36.4 105.5 35.5 104.4Z',
  n: 'M39.2 93.9C39.5 92.0 40.8 89.6 42.3 88.0C45.4 84.8 45.5 84.2 43.1 79.7C40.4 74.4 41.3 72.5 53.6 56.9C57.5 52.0 58.1 49.1 55.0 50.0C54.0 50.3 51.8 50.9 50.2 51.3C48.4 51.8 45.9 53.6 44.0 55.6C40.7 59.2 37.1 60.2 35.7 58.0C35.3 57.4 34.3 56.5 33.3 56.0C29.7 54.0 29.2 52.0 31.4 47.8C32.6 45.7 35.1 40.9 37.2 37.1C39.2 33.3 41.8 29.2 42.9 27.9C44.9 25.9 45.0 25.2 44.5 20.8L43.8 15.9L47.9 17.9C51.1 19.5 52.0 19.6 52.6 18.7C54.4 15.8 71.5 17.9 73.6 21.3C74.2 22.2 75.5 22.9 76.5 22.9C78.8 22.9 85.3 29.3 86.0 32.3C86.3 33.5 87.1 35.0 87.7 35.6C91.5 39.4 91.5 57.7 87.8 65.0C87.1 66.4 87.1 67.2 87.7 67.6C88.2 67.9 88.9 69.8 89.2 71.8C89.7 75.3 89.6 75.7 86.3 78.8C84.0 81.0 82.8 81.7 82.5 80.9C81.1 77.3 81.1 70.6 82.4 62.5C84.3 51.6 83.7 45.9 80.2 38.7C76.1 30.3 68.3 24.6 59.3 23.3C53.0 22.4 53.9 25.3 60.4 26.9C76.8 31.1 82.6 42.8 79.0 64.5C77.1 76.2 78.6 82.8 84.3 88.1C86.5 90.2 87.2 91.5 87.2 93.9L87.2 97.0L62.9 97.0L38.7 97.0L39.2 93.9Z',
  r: 'M33.6 104.4C32.6 101.7 33.7 98.3 35.6 98.1C38.1 97.7 38.2 95.7 35.9 95.1C32.6 94.2 33.5 88.7 37.7 84.9L41.2 81.6L43.2 60.2C44.3 48.5 45.1 38.8 45.1 38.8C45.0 38.8 43.3 37.7 41.2 36.4L37.5 34.0L37.8 25.2L38.0 16.4L42.3 16.4L46.6 16.4L46.9 19.7C47.2 22.9 47.2 22.9 51.0 22.9C54.8 22.9 54.8 22.9 54.8 19.9L54.8 16.9L60.0 16.9L65.2 16.9L65.2 19.9C65.2 22.8 65.3 22.9 68.6 22.9C71.9 22.9 72.0 22.8 72.2 19.7L72.5 16.4L76.9 16.2L81.4 15.9L81.7 24.4C82.1 34.6 82.2 34.5 77.9 36.9L74.5 38.8L75.0 44.0C75.3 46.9 76.1 56.4 76.9 65.1L78.3 81.1L82.1 85.1C86.1 89.4 87.2 93.8 84.6 94.8C82.8 95.5 83.0 97.3 85.0 98.6C86.7 99.6 87.2 101.8 86.2 104.3C85.5 106.2 34.4 106.4 33.6 104.4Z',
  p: 'M34.5 88.1C33.8 85.2 35.2 82.8 41.4 76.6C48.6 69.6 50.5 65.5 50.5 57.5C50.5 51.6 50.4 51.3 48.5 51.3C43.1 51.3 42.3 47.1 47.4 44.6C50.1 43.3 50.2 42.5 47.8 39.1C42.2 31.2 47.1 19.1 56.8 16.9C69.3 14.1 79.6 28.3 72.5 38.8C69.7 42.8 69.8 43.0 73.4 44.7C78.4 47.1 77.3 51.3 71.6 51.3C69.6 51.3 69.5 51.6 69.5 57.2C69.5 65.0 71.6 69.3 79.1 76.9C84.4 82.3 85.2 83.5 85.3 86.4L85.4 89.7L60.2 89.9L35.0 90.2L34.5 88.1Z',
};

/** Cool hues for white, warm hues for black. White is the bright army; black is the dark one. */
const COOL_NEON: Record<PieceType, string> = {
  k: '#D6FF4A',
  q: '#7AF0FF',
  b: '#6AA6FF',
  n: '#2EFFC6',
  r: '#00E5FF',
  p: '#9BE7FF',
};

const WARM_NEON: Record<PieceType, string> = {
  k: '#FFE14A',
  q: '#FFF200',
  b: '#FF8A3D',
  n: '#FF5C33',
  r: '#E6C200',
  p: '#FFF6B0',
};

export function ChessPiece({ type, color, size }: ChessPieceProps) {
  const { theme } = useTheme();
  if (theme.pieceSet === 'cyber') {
    return <CyberPiece type={type} color={color} size={size} />;
  }

  const isBlack = color === 'b';
  const fill = isBlack ? '#121212' : '#FFFFFF';
  const stroke = '#121212';

  return (
    <Svg width={size} height={size} viewBox={PIECE_VIEWBOX} accessibilityLabel={`${color}${type}`}>
      <PiecePath type={type} fill={fill} stroke={stroke} outlined={!isBlack} />
    </Svg>
  );
}

function CyberPiece({ type, color, size }: ChessPieceProps) {
  const neon = color === 'w' ? COOL_NEON[type] : WARM_NEON[type];
  const dark = color === 'b';
  const crowned = type === 'k' || type === 'q';
  const fill = dark ? '#070B14' : neon;
  const stroke = dark ? neon : '#14060A';

  return (
    <Svg width={size} height={size} viewBox="8 0 124 118" accessibilityLabel={`${color}${type}`}>
      <Path
        d={PIECE_PATHS[type]}
        fill="none"
        stroke={neon}
        strokeWidth={crowned ? 6 : 14}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.45}
      />
      <Path
        d={PIECE_PATHS[type]}
        fill={fill}
        stroke={stroke}
        strokeWidth={dark ? (crowned ? 3.2 : 4.5) : crowned ? 1.6 : 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
  return (
    <Path
      d={PIECE_PATHS[type]}
      fill={fill}
      stroke={stroke}
      strokeWidth={outlined ? 5.5 : 0}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}
