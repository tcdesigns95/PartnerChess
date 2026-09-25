import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Nunito_400Regular, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import {
  DEFAULT_THEME_ID,
  getTheme,
  type AppTheme,
  type CustomStyles,
} from '../theme/themes';
import {
  loadCustomStyles,
  loadThemeId,
  saveCustomStyles,
  saveThemeId,
} from '../theme/themeStorage';

type ThemeContextValue = {
  theme: AppTheme;
  themeId: string;
  custom: CustomStyles;
  fontsReady: boolean;
  setThemeId: (id: string) => Promise<void>;
  updateCustom: (patch: CustomStyles) => Promise<void>;
  clearCustom: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(themeId: string, custom: CustomStyles): AppTheme {
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [custom, setCustom] = useState<CustomStyles>({});
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
  });

  useEffect(() => {
    (async () => {
      const [id, styles] = await Promise.all([loadThemeId(), loadCustomStyles()]);
      setThemeIdState(id);
      setCustom(styles);
      setReady(true);
    })();
  }, []);

  const setThemeId = useCallback(async (id: string) => {
    setThemeIdState(id);
    await saveThemeId(id);
  }, []);

  const updateCustom = useCallback(async (patch: CustomStyles) => {
    setCustom((prev) => {
      const next = { ...prev, ...patch };
      void saveCustomStyles(next);
      return next;
    });
  }, []);

  const clearCustom = useCallback(async () => {
    setCustom({});
    await saveCustomStyles({});
  }, []);

  const theme = useMemo(() => resolveTheme(themeId, custom), [themeId, custom]);

  const value = useMemo(
    () => ({
      theme,
      themeId,
      custom,
      fontsReady: ready && fontsLoaded,
      setThemeId,
      updateCustom,
      clearCustom,
    }),
    [theme, themeId, custom, ready, fontsLoaded, setThemeId, updateCustom, clearCustom],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function fontFamilyFor(theme: AppTheme, kind: 'display' | 'body', weight: 'regular' | 'bold' = 'regular') {
  const map: Record<string, { regular: string; bold: string }> = {
    Fraunces: { regular: 'Fraunces_600SemiBold', bold: 'Fraunces_700Bold' },
    'Source Sans 3': { regular: 'SourceSans3_400Regular', bold: 'SourceSans3_600SemiBold' },
    'Space Grotesk': { regular: 'SpaceGrotesk_500Medium', bold: 'SpaceGrotesk_700Bold' },
    'IBM Plex Sans': { regular: 'IBMPlexSans_400Regular', bold: 'IBMPlexSans_600SemiBold' },
    'Playfair Display': { regular: 'PlayfairDisplay_600SemiBold', bold: 'PlayfairDisplay_700Bold' },
    Nunito: { regular: 'Nunito_400Regular', bold: 'Nunito_600SemiBold' },
  };
  const family = kind === 'display' ? theme.fonts.display : theme.fonts.body;
  return map[family]?.[weight] ?? map['Source Sans 3'][weight];
}
