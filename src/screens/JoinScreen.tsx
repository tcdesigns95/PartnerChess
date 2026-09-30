import React, { useEffect, useRef, useState } from 'react';
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
import { BackButton } from '../components/BackButton';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { clearInviteCodeFromUrl, getSocket } from '../lib/socket';
import { loadDisplayName, loadSession, saveDisplayName, saveSession } from '../lib/session';
import { useKeyboardInset } from '../lib/useKeyboardInset';
import type { RootStackParamList } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

/** One in-flight auto-join per code, including a React strict-mode remount. */
const autoJoinStarted = new Set<string>();

export function JoinScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  const inviteCode = (route.params?.code || '').trim().toUpperCase();
  const [name, setName] = useState('');
  const [code, setCode] = useState(inviteCode);
  const [busy, setBusy] = useState(!!inviteCode);
  const [error, setError] = useState('');
  const [autoFailed, setAutoFailed] = useState(false);
  const joined = useRef(false);
  const short = height < 700;
  const narrow = width < 380;

  useEffect(() => {
    void loadDisplayName().then((saved) => {
      setName((current) => current || saved);
    });
  }, []);

  useEffect(() => {
    if (route.params?.code) {
      setCode(route.params.code.toUpperCase());
    }
  }, [route.params?.code]);

  const enterGame = async (
    trimmedName: string,
    res: { game: { id: string; code: string }; playerId: string; color: 'w' | 'b' },
  ) => {
    if (joined.current) return;
    joined.current = true;
    await saveSession({
      gameId: res.game.id,
      playerId: res.playerId,
      color: res.color,
      code: res.game.code,
      name: trimmedName,
    });
    clearInviteCodeFromUrl();
    navigation.replace('Game');
  };

  const joinWith = (trimmedName: string, trimmedCode: string) => {
    if (trimmedCode.length < 4) {
      setBusy(false);
      setError('Enter the 6-character code');
      return;
    }
    setBusy(true);
    setError('');
    void saveDisplayName(trimmedName);
    const socket = getSocket();
    const emit = () => {
      socket.emit('joinGame', { code: trimmedCode, name: trimmedName }, (res) => {
        if (!res.ok) {
          setBusy(false);
          setError(res.error);
          if (inviteCode && trimmedCode === inviteCode) setAutoFailed(true);
          autoJoinStarted.delete(trimmedCode);
          return;
        }
        void enterGame(trimmedName, res);
      });
    };
    if (socket.connected) emit();
    else socket.once('connect', emit);
  };

  useEffect(() => {
    if (!inviteCode || autoJoinStarted.has(inviteCode)) return;
    autoJoinStarted.add(inviteCode);
    void (async () => {
      const existing = await loadSession();
      if (existing && existing.code.toUpperCase() === inviteCode) {
        autoJoinStarted.delete(inviteCode);
        clearInviteCodeFromUrl();
        navigation.replace('Game');
        return;
      }
      const saved = (await loadDisplayName()).trim() || 'You';
      setName(saved);
      joinWith(saved, inviteCode);
    })();
    // One attempt per invite code. joinWith from this commit talks to the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode]);

  const join = () => {
    joinWith(name.trim() || 'You', code.trim().toUpperCase());
  };

  const joiningFromLink = !!inviteCode && !autoFailed && !error;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scroll, { paddingBottom: 24 + keyboardInset }]}
        >
          <BackButton />
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'display', 'bold'),
                fontSize: short ? 30 : 34,
                marginTop: short ? 12 : 18,
              },
            ]}
          >
            {joiningFromLink ? 'Joining match' : 'Join match'}
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
            {joiningFromLink
              ? 'Opening the board…'
              : 'Enter the code your partner shared.'}
          </Text>

          {joiningFromLink ? (
            <ActivityIndicator color={theme.colors.text} style={{ marginTop: 12 }} />
          ) : (
          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
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
              returnKeyType="go"
              onSubmitEditing={join}
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                styles.code,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  fontFamily: fontFamilyFor(theme, 'display', 'bold'),
                  letterSpacing: narrow ? 4 : 6,
                  fontSize: narrow ? 26 : 30,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
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
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8 },
  title: {},
  sub: { fontSize: 15, marginTop: 6, marginBottom: 20, lineHeight: 21 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 16,
  },
  code: {
    textAlign: 'center',
    minHeight: 64,
  },
  primary: {
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
