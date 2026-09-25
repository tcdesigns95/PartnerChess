import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ChessPiece } from '../components/ChessPiece';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket } from '../lib/socket';
import { loadDisplayName, loadSession, saveDisplayName, saveSession } from '../lib/session';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { theme, setThemeId } = useTheme();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void setThemeId('ink');
  }, [setThemeId]);

  useEffect(() => {
    void (async () => {
      setName(await loadDisplayName());
      const existing = await loadSession();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          navigation.navigate('Join', { code: code.toUpperCase() });
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
          const code = new URLSearchParams(window.location.search).get('code');
          if (code) return;
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
      <View style={styles.hero}>
        <View style={styles.pieceRow}>
          <ChessPiece type="k" color="b" size={36} />
          <ChessPiece type="q" color="b" size={36} />
          <ChessPiece type="b" color="b" size={36} />
          <ChessPiece type="n" color="b" size={36} />
          <ChessPiece type="r" color="b" size={36} />
          <ChessPiece type="p" color="b" size={36} />
        </View>
        <Text
          style={[
            styles.brand,
            {
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
            },
          ]}
        >
          Couple Chess
        </Text>
      </View>

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

        <Pressable
          onPress={createGame}
          disabled={busy}
          style={({ pressed }) => [
            styles.play,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.text,
              opacity: pressed || busy ? 0.75 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 18,
                letterSpacing: 2,
              }}
            >
              PLAY GAME
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Join')} style={styles.linkBtn}>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
              letterSpacing: 1,
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
            marginTop: 20,
            textAlign: 'center',
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body'),
            fontSize: 11,
          }}
        >
          {connected ? '● live' : '○ connecting'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'space-between' },
  hero: {
    marginTop: 48,
    alignItems: 'center',
    gap: 18,
  },
  pieceRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
  },
  brand: {
    fontSize: 40,
    letterSpacing: -0.5,
  },
  form: {
    gap: 12,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  play: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  linkBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
