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
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket, getSocketUrl } from '../lib/socket';
import { loadDisplayName, loadSession, saveDisplayName, saveSession } from '../lib/session';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void (async () => {
      setName(await loadDisplayName());
      const existing = await loadSession();
      setHasSession(!!existing);

      // Invite link join takes priority
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          navigation.navigate('Join', { code: code.toUpperCase() });
          return;
        }
      }

      // Auto stay in / return to active match when opening the app
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

  // If user opens Home while a match is saved, put them back in the game
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void (async () => {
        const existing = await loadSession();
        setHasSession(!!existing);
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
      setHasSession(true);
      navigation.navigate('Game');
    });
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style="auto" />
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.glow,
            { backgroundColor: theme.colors.accent, opacity: 0.12 },
          ]}
        />
        <Text
          style={[
            styles.brand,
            {
              color: theme.colors.accent,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
            },
          ]}
        >
          Couple Chess
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'display'),
            },
          ]}
        >
          Your board. Your chat. One live match.
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
          Create a room, send the code, play without interruptions.
        </Text>
      </View>

      <View style={styles.form}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
            },
          ]}
        >
          Your name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
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
              Start a live match
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Join')}
          style={({ pressed }) => [
            styles.secondary,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
              fontSize: 16,
            }}
          >
            Join with a code
          </Text>
        </Pressable>

        {hasSession && (
          <Pressable
            onPress={() => navigation.navigate('Game', { resume: true })}
            style={({ pressed }) => [
              styles.secondary,
              {
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.surface,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 16,
              }}
            >
              Resume current match
            </Text>
          </Pressable>
        )}

        <Pressable onPress={() => navigation.navigate('Themes')}>
          <Text
            style={{
              textAlign: 'center',
              marginTop: 8,
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              textDecorationLine: 'underline',
            }}
          >
            Change look & theme
          </Text>
        </Pressable>

        {!!error && (
          <Text
            style={{
              color: theme.colors.danger,
              marginTop: 10,
              fontFamily: fontFamilyFor(theme, 'body'),
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        )}

        <Text
          style={{
            marginTop: 18,
            textAlign: 'center',
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body'),
            fontSize: 12,
          }}
        >
          {connected ? 'Connected' : 'Connecting…'} · {getSocketUrl()}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  hero: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    marginTop: 8,
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -60,
  },
  brand: {
    fontSize: 42,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    marginTop: 28,
    gap: 10,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primary: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
