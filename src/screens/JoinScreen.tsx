import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BackButton } from '../components/BackButton';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket } from '../lib/socket';
import { loadDisplayName, saveDisplayName, saveSession } from '../lib/session';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

export function JoinScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadDisplayName().then(setName);
  }, []);

  const join = () => {
    const trimmedName = name.trim() || 'You';
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 4) {
      setError('Enter the 6-character code');
      return;
    }
    setBusy(true);
    setError('');
    void saveDisplayName(trimmedName);
    getSocket().emit(
      'joinGame',
      { code: trimmedCode, name: trimmedName },
      async (res) => {
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        await saveSession({
          gameId: res.game.id,
          playerId: res.playerId,
          color: res.color,
          code: res.game.code,
          name: trimmedName,
        });
        navigation.replace('Game');
      },
    );
  };

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
        Join match
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
        Enter the code your partner shared.
      </Text>

      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              fontFamily: fontFamilyFor(theme, 'body'),
            },
          ]}
        />
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="CODE"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            styles.code,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
            },
          ]}
        />
        <Pressable
          onPress={join}
          disabled={busy}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed || busy ? 0.75 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.accentText} />
          ) : (
            <Text
              style={{
                color: theme.colors.accentText,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 17,
              }}
            >
              Join live match
            </Text>
          )}
        </Pressable>
        {!!error && (
          <Text
            style={{
              color: theme.colors.danger,
              fontFamily: fontFamilyFor(theme, 'body'),
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  title: { fontSize: 34, marginTop: 18 },
  sub: { fontSize: 15, marginTop: 6, marginBottom: 24 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  code: {
    letterSpacing: 6,
    fontSize: 28,
    textAlign: 'center',
    paddingVertical: 16,
  },
  primary: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
});
