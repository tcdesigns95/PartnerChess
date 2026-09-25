import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { BackButton } from '../components/BackButton';
import { ChessBoard } from '../components/ChessBoard';
import { ChatPanel } from '../components/ChatPanel';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket, buildInviteLink } from '../lib/socket';
import { clearSession, loadSession } from '../lib/session';
import type { ChatMessage, PublicGame, RootStackParamList, Session } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('Loading match…');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const attachListeners = useCallback(() => {
    const socket = getSocket();
    const onGame = (g: PublicGame) => {
      setGame(g);
      setMessages(g.chat);
      if (g.status === 'waiting') setStatus('Waiting for your partner…');
      else if (g.status === 'finished') setStatus(g.result || 'Game over');
      else setStatus(g.turn === 'w' ? "White's turn" : "Black's turn");
    };
    const onChat = (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    socket.on('gameUpdated', onGame);
    socket.on('chatMessage', onChat);
    return () => {
      socket.off('gameUpdated', onGame);
      socket.off('chatMessage', onChat);
    };
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      const s = await loadSession();
      if (!s) {
        setError('No active match. Start or join one from home.');
        return;
      }
      setSession(s);
      cleanup = attachListeners();
      const socket = getSocket();
      const rejoin = () => {
        socket.emit(
          'rejoinGame',
          { gameId: s.gameId, playerId: s.playerId },
          (res) => {
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setGame(res.game);
            setMessages(res.game.chat);
            if (res.game.status === 'waiting') setStatus('Waiting for your partner…');
            else if (res.game.status === 'finished')
              setStatus(res.game.result || 'Game over');
            else
              setStatus(res.game.turn === 'w' ? "White's turn" : "Black's turn");
          },
        );
      };
      if (socket.connected) rejoin();
      else socket.once('connect', rejoin);
    })();
    return () => cleanup();
  }, [attachListeners]);

  const copyCode = async () => {
    if (!game?.code) return;
    const link = buildInviteLink(game.code);
    setInviteLink(link);
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!session || !game) return;
    getSocket().emit(
      'makeMove',
      {
        gameId: session.gameId,
        playerId: session.playerId,
        from,
        to,
        promotion,
      },
      (res) => {
        if (!res.ok) setError(res.error);
        else setError('');
      },
    );
  };

  const onSend = (text: string) => {
    if (!session) return;
    getSocket().emit(
      'sendChat',
      { gameId: session.gameId, playerId: session.playerId, text },
      (res) => {
        if (!res.ok) setError(res.error);
      },
    );
  };

  const resign = () => {
    if (!session) return;
    const doResign = () => {
      getSocket().emit(
        'resign',
        { gameId: session.gameId, playerId: session.playerId },
        () => {},
      );
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Resign? Your partner will win this match.')) {
        doResign();
      }
      return;
    }
    Alert.alert('Resign?', 'Your partner will win this match.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resign', style: 'destructive', onPress: doResign },
    ]);
  };

  const leave = async () => {
    await clearSession();
    navigation.popToTop();
  };

  if (!session && error) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
      >
        <BackButton onPress={() => navigation.popToTop()} />
        <Text
          style={{
            marginTop: 24,
            color: theme.colors.danger,
            fontFamily: fontFamilyFor(theme, 'body'),
          }}
        >
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  if (!game || !session) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator color={theme.colors.accent} />
        <Text
          style={{
            marginTop: 12,
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body'),
          }}
        >
          {status}
        </Text>
      </SafeAreaView>
    );
  }

  const myTurn = game.status === 'active' && game.turn === session.color;
  const opponent =
    session.color === 'w' ? game.players.b?.name : game.players.w?.name;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.navigate('Home')} label="Home" />
        <Pressable onPress={() => navigation.navigate('Themes')}>
          <Text
            style={{
              color: theme.colors.accent,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
            }}
          >
            Theme
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.status,
              {
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'display', 'bold'),
              },
            ]}
          >
            {status}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              marginTop: 4,
            }}
          >
            You are {session.color === 'w' ? 'White' : 'Black'}
            {opponent ? ` · vs ${opponent}` : ' · waiting…'}
            {game.isCheck && game.status === 'active' ? ' · check' : ''}
          </Text>
        </View>

        <Pressable
          onPress={copyCode}
          style={[
            styles.codeCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Invite link · tap to copy for iMessage
          </Text>
          <Text
            style={{
              color: theme.colors.accent,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
              fontSize: 28,
              letterSpacing: 4,
              marginTop: 4,
            }}
          >
            {game.code}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              marginTop: 2,
            }}
            numberOfLines={2}
          >
            {copied
              ? 'Link copied — paste into Messages'
              : inviteLink || 'Copies a join link + code'}
          </Text>
        </Pressable>

        <ChessBoard
          fen={game.fen}
          orientation={session.color}
          interactive={myTurn}
          lastMove={game.lastMove}
          onMove={onMove}
        />

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

        <View style={styles.actions}>
          {game.status !== 'finished' && (
            <Pressable
              onPress={resign}
              style={[
                styles.actionBtn,
                {
                  borderColor: theme.colors.danger,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.danger,
                  fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                }}
              >
                Resign
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={leave}
            style={[
              styles.actionBtn,
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
              Leave
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 220 }}>
          <ChatPanel
            messages={messages}
            myPlayerId={session.playerId}
            onSend={onSend}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  header: {},
  status: { fontSize: 24 },
  codeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
