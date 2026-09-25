import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_THEME_ID,
  getTheme,
  type AppTheme,
  type CustomStyles,
} from './themes';

const THEME_ID_KEY = 'chess.themeId';
const CUSTOM_STYLES_KEY = 'chess.customStyles';

export type { CustomStyles };

export async function loadThemeId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(THEME_ID_KEY);
    return saved ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export async function saveThemeId(themeId: string): Promise<void> {
  await AsyncStorage.setItem(THEME_ID_KEY, themeId);
}

export async function loadCustomStyles(): Promise<CustomStyles> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_STYLES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CustomStyles;
  } catch {
    return {};
  }
}

export async function saveCustomStyles(styles: CustomStyles): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(styles));
}

export async function clearCustomStyles(): Promise<void> {
  await AsyncStorage.removeItem(CUSTOM_STYLES_KEY);
}

/** Named theme + any saved custom style overrides. */
export async function loadResolvedTheme(): Promise<AppTheme> {
  const [themeId, custom] = await Promise.all([loadThemeId(), loadCustomStyles()]);
  const base = getTheme(themeId);

  return {
    ...base,
    boardSkin: custom.boardSkin ?? base.boardSkin,
    pieceSet: custom.pieceSet ?? base.pieceSet,
    colors: {
      ...base.colors,
      ...(custom.accent ? { accent: custom.accent } : {}),
      ...(custom.lightSquare ? { lightSquare: custom.lightSquare } : {}),
      ...(custom.darkSquare ? { darkSquare: custom.darkSquare } : {}),
    },
  };
}
