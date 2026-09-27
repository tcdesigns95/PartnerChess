import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ChessPiece } from '../components/ChessPiece';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { clearInviteCodeFromUrl, getSocket } from '../lib/socket';
import { loadDisplayName, loadSession, saveDisplayName, saveSession } from '../lib/session';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { theme, setThemeId } = useTheme();
  const { height, width } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const short = height < 700;
  const narrow = width < 380;
  const pieceSize = short || narrow ? 28 : 34;

  useEffect(() => {
    void setThemeId('ink');
  }, [setThemeId]);

  useEffect(() => {
    void (async () => {
      setName(await loadDisplayName());
      const existing = await loadSession();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code')?.trim().toUpperCase();
        if (code) {
          if (existing && existing.code.toUpperCase() === code) {
            clearInviteCodeFromUrl();
            navigation.navigate('Game', { resume: true });
            return;
          }
          navigation.navigate('Join', { code });
          return;
        }
      }

      if (existing) {
        navigation.navigate('Game', { resume: true });
      }
    })();
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void (async () => {
        const existing = await loadSession();
        if (!existing) return;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const code = new URLSearchParams(window.location.search).get('code')?.trim().toUpperCase();
          if (code && existing.code.toUpperCase() !== code) return;
          if (code) clearInviteCodeFromUrl();
        }
        navigation.navigate('Game', { resume: true });
      })();
    });
    return unsub;
  }, [navigation]);

  const createGame = () => {
    const trimmed = name.trim() || 'You';
    setBusy(true);
    setError('');
    void saveDisplayName(trimmed);
    getSocket().emit('createGame', { name: trimmed, preferColor: 'random' }, async (res) => {
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
        name: trimmed,
      });
      navigation.navigate('Game');
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 16 + keyboardInset },
          ]}
        >
          <View style={[styles.hero, { marginTop: short ? 12 : 28 }]}>
            <View style={styles.pieceRow}>
              <ChessPiece type="k" color="b" size={pieceSize} />
              <ChessPiece type="q" color="b" size={pieceSize} />
              <ChessPiece type="b" color="b" size={pieceSize} />
              <ChessPiece type="n" color="b" size={pieceSize} />
              <ChessPiece type="r" color="b" size={pieceSize} />
              <ChessPiece type="p" color="b" size={pieceSize} />
            </View>
            <Text
              style={[
                styles.brand,
                {
                  color: theme.colors.text,
                  fontFamily: fontFamilyFor(theme, 'display', 'bold'),
                  fontSize: short ? 32 : 40,
                },
              ]}
            >
              Couple Chess
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body'),
                fontSize: 15,
                textAlign: 'center',
              }}
            >
              A board for two. One link.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={createGame}
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

            <Pressable
              accessibilityRole="button"
              onPress={createGame}
              disabled={busy}
              style={({ pressed }) => [
                styles.play,
                {
                  backgroundColor: theme.colors.text,
                  opacity: pressed || busy ? 0.8 : 1,
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
                    letterSpacing: 1.4,
                  }}
                >
                  PLAY GAME
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Join')}
              style={({ pressed }) => [
                styles.linkBtn,
                {
                  borderColor: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                  letterSpacing: 1,
                  fontSize: 15,
                }}
              >
                JOIN WITH CODE
              </Text>
            </Pressable>

            {!!error && (
              <Text
                style={{
                  color: theme.colors.danger,
                  textAlign: 'center',
                  fontFamily: fontFamilyFor(theme, 'body'),
                }}
              >
                {error}
              </Text>
            )}

            <Text
              style={{
                marginTop: 8,
                textAlign: 'center',
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body'),
                fontSize: 12,
              }}
            >
              {connected ? '● live' : '○ connecting'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  pieceRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  brand: {
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  form: {
    gap: 12,
    marginTop: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 16,
  },
  play: {
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
