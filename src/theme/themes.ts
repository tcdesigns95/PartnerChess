/**
 * Chess app visual themes — board, pieces, chrome, and chat.
 * Swap `activeThemeId` (via themeStorage) to restyle the whole UI.
 */

export type PieceSetId = 'classic' | 'modern' | 'walnut';
export type BoardSkinId = 'maple' | 'slate' | 'midnight' | 'blush';

/** Optional per-user overrides layered on top of a named theme. */
export type CustomStyles = {
  accent?: string;
  lightSquare?: string;
  darkSquare?: string;
  pieceSet?: PieceSetId;
  boardSkin?: BoardSkinId;
};

export type AppTheme = {
  id: string;
  name: string;
  boardSkin: BoardSkinId;
  pieceSet: PieceSetId;
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
    danger: string;
    lightSquare: string;
    darkSquare: string;
    lastMove: string;
    chatBubbleMine: string;
    chatBubbleTheirs: string;
    chatText: string;
    border: string;
  };
  fonts: {
    display: string;
    body: string;
  };
};

export const themes: Record<string, AppTheme> = {
  meadow: {
    id: 'meadow',
    name: 'Meadow',
    boardSkin: 'maple',
    pieceSet: 'classic',
    colors: {
      background: '#E8F0E4',
      surface: '#F7FBF5',
      text: '#1F2A1C',
      textMuted: '#5C6B57',
      accent: '#2F6F4E',
      accentText: '#F7FBF5',
      danger: '#B42318',
      lightSquare: '#F0D9B5',
      darkSquare: '#B58863',
      lastMove: 'rgba(47, 111, 78, 0.35)',
      chatBubbleMine: '#2F6F4E',
      chatBubbleTheirs: '#DCE8D6',
      chatText: '#1F2A1C',
      border: '#C5D4BE',
    },
    fonts: {
      display: 'Fraunces',
      body: 'Source Sans 3',
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    boardSkin: 'midnight',
    pieceSet: 'modern',
    colors: {
      background: '#0F1419',
      surface: '#1A222C',
      text: '#E8EEF4',
      textMuted: '#8B9AAB',
      accent: '#6EB5FF',
      accentText: '#0F1419',
      danger: '#F97066',
      lightSquare: '#4A5563',
      darkSquare: '#2D3748',
      lastMove: 'rgba(110, 181, 255, 0.35)',
      chatBubbleMine: '#6EB5FF',
      chatBubbleTheirs: '#243040',
      chatText: '#E8EEF4',
      border: '#2E3A48',
    },
    fonts: {
      display: 'Space Grotesk',
      body: 'IBM Plex Sans',
    },
  },
  blush: {
    id: 'blush',
    name: 'Blush',
    boardSkin: 'blush',
    pieceSet: 'walnut',
    colors: {
      background: '#F8ECEF',
      surface: '#FFF8FA',
      text: '#3D2430',
      textMuted: '#8A6574',
      accent: '#C45C7A',
      accentText: '#FFF8FA',
      danger: '#B42318',
      lightSquare: '#F5D5DC',
      darkSquare: '#D4A0AE',
      lastMove: 'rgba(196, 92, 122, 0.35)',
      chatBubbleMine: '#C45C7A',
      chatBubbleTheirs: '#F0D8DF',
      chatText: '#3D2430',
      border: '#E8C5CF',
    },
    fonts: {
      display: 'Playfair Display',
      body: 'Nunito',
    },
  },
};

export const DEFAULT_THEME_ID = 'meadow';

export function getTheme(themeId: string): AppTheme {
  return themes[themeId] ?? themes[DEFAULT_THEME_ID];
}

export function listThemes(): AppTheme[] {
  return Object.values(themes);
}
