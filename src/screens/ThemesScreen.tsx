import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BackButton } from '../components/BackButton';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { listThemes } from '../theme/themes';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;

export function ThemesScreen({}: Props) {
  const { theme, themeId, setThemeId, clearCustom } = useTheme();
  const all = listThemes();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <BackButton />
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
            fontFamily: fontFamilyFor(theme, 'display', 'bold'),
          },
        ]}
      >
        Look & theme
      </Text>
      <Text
        style={[
          styles.sub,
          {
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body'),
          },
        ]}
      >
        Skins stay on your phone. Change anytime — the match keeps going.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {all.map((t) => {
          const active = t.id === themeId;
          return (
            <Pressable
              key={t.id}
              onPress={() => void setThemeId(t.id)}
              style={[
                styles.card,
                {
                  backgroundColor: t.colors.surface,
                  borderColor: active ? t.colors.accent : t.colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <View style={styles.swatches}>
                <View
                  style={[styles.swatch, { backgroundColor: t.colors.lightSquare }]}
                />
                <View
                  style={[styles.swatch, { backgroundColor: t.colors.darkSquare }]}
                />
                <View
                  style={[styles.swatch, { backgroundColor: t.colors.accent }]}
                />
              </View>
              <Text
                style={{
                  color: t.colors.text,
                  fontFamily: fontFamilyFor(t, 'display', 'bold'),
                  fontSize: 22,
                  marginTop: 10,
                }}
              >
                {t.name}
              </Text>
              <Text
                style={{
                  color: t.colors.textMuted,
                  fontFamily: fontFamilyFor(t, 'body'),
                  marginTop: 4,
                }}
              >
                {t.boardSkin} board · {t.pieceSet} pieces
                {active ? ' · active' : ''}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => void clearCustom()}
          style={[
            styles.reset,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
            }}
          >
            Reset custom color overrides
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  title: { fontSize: 34, marginTop: 18 },
  sub: { fontSize: 15, marginTop: 6, marginBottom: 18 },
  list: { gap: 12, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  swatches: { flexDirection: 'row', gap: 8 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  reset: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
