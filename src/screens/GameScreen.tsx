import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Chess } from 'chess.js';
import { ChessBoard } from '../components/ChessBoard';
import { CapturedSideColumn } from '../components/CapturedSideColumn';
import { ChatPanel } from '../components/ChatPanel';
import { ChatIcon, GameMenu, MenuButton } from '../components/GameMenu';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket, buildInviteLink } from '../lib/socket';
import { clearSession, loadSession, saveSession } from '../lib/session';
import type { ChatMessage, PublicGame, RootStackParamList, Session } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('…');
  const [error, setError] = useState('');
  const [boardAreaWidth, setBoardAreaWidth] = useState(280);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const applyGame = useCallback((g: PublicGame) => {
    setGame(g);
    setMessages(g.chat);
    if (g.status === 'waiting') setStatus('Waiting');
    else if (g.status === 'finished') setStatus(g.result || 'Over');
    else {
      const turnLabel = g.turn === 'w' ? 'White' : 'Black';
      setStatus(g.isCheck ? `${turnLabel} · check` : turnLabel);
    }
  }, []);

  const rejoin = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const socket = getSocket();
    const doRejoin = () => {
      socket.emit(
        'rejoinGame',
        { gameId: s.gameId, playerId: s.playerId },
        (res) => {
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setError('');
          applyGame(res.game);
          void saveSession({ ...s, code: res.game.code });
        },
      );
    };
    if (socket.connected) doRejoin();
    else socket.once('connect', doRejoin);
  }, [applyGame]);

  useEffect(() => {
    const socket = getSocket();
    const onGame = (g: PublicGame) => applyGame(g);
    const onChat = (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onConnect = () => rejoin();
    socket.on('gameUpdated', onGame);
    socket.on('chatMessage', onChat);
    socket.on('connect', onConnect);
    return () => {
      socket.off('gameUpdated', onGame);
      socket.off('chatMessage', onChat);
      socket.off('connect', onConnect);
    };
  }, [applyGame, rejoin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSession();
      if (cancelled) return;
      if (!s) {
        setError('No match');
        return;
      }
      sessionRef.current = s;
      setSession(s);
      rejoin();
    })();
    return () => {
      cancelled = true;
    };
  }, [rejoin]);

  useFocusEffect(
    useCallback(() => {
      rejoin();
    }, [rejoin]),
  );

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') rejoin();
    };
    const sub = AppState.addEventListener('change', onChange);
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') rejoin();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', onVisible);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('focus', onVisible);
      }
    };
  }, [rejoin]);

  const copyInvite = async () => {
    if (!game?.code) return;
    await Clipboard.setStringAsync(buildInviteLink(game.code));
    if (Platform.OS === 'web') {
      // brief feedback via status
      const prev = status;
      setStatus('Invite copied');
      setTimeout(() => setStatus(prev), 1200);
    } else {
      Alert.alert('Copied', 'Invite link ready to paste.');
    }
  };

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!session || !game) return;
    try {
      const draft = new Chess(game.fen);
      const opts: { from: string; to: string; promotion?: string } = { from, to };
      if (promotion) opts.promotion = promotion;
      const local = draft.move(opts as Parameters<Chess['move']>[0]);
      if (local) {
        setGame({
          ...game,
          fen: draft.fen(),
          lastMove: { from: local.from, to: local.to },
          turn: draft.turn(),
          isCheck: draft.isCheck(),
          isCheckmate: draft.isCheckmate(),
          isDraw: draft.isDraw(),
          isStalemate: draft.isStalemate(),
          status: draft.isGameOver() ? 'finished' : game.status,
        });
      }
    } catch {
      // server wins
    }

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
        if (!res.ok) {
          setError(res.error);
          rejoin();
        } else {
          setError('');
          applyGame(res.game);
        }
      },
    );
  };

  const resign = () => {
    if (!session) return;
    const go = () =>
      getSocket().emit(
        'resign',
        { gameId: session.gameId, playerId: session.playerId },
        () => {},
      );
    if (Platform.OS === 'web') {
      if (window.confirm('Resign?')) go();
    } else {
      Alert.alert('Resign?', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resign', style: 'destructive', onPress: go },
      ]);
    }
  };

  const leave = async () => {
    await clearSession();
    sessionRef.current = null;
    navigation.popToTop();
  };

  if (!session && error) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.danger, fontFamily: fontFamilyFor(theme, 'body') }}>
          {error}
        </Text>
        <Pressable onPress={() => navigation.popToTop()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.text, fontFamily: fontFamilyFor(theme, 'body', 'bold') }}>
            Home
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!game || !session) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  const myTurn = game.status === 'active' && game.turn === session.color;
  const opponent =
    session.color === 'w' ? game.players.b?.name : game.players.w?.name;
  const sideWidth = 48;
  const boardSize = Math.max(180, boardAreaWidth - sideWidth - 8);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
              fontSize: 20,
            }}
          >
            {status}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {session.color === 'w' ? 'White' : 'Black'}
            {opponent ? ` vs ${opponent}` : ''}
            {myTurn ? ' · your move' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => setChatOpen((v) => !v)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <ChatIcon color={theme.colors.text} />
        </Pressable>
        <MenuButton onPress={() => setMenuOpen(true)} />
      </View>

      <View style={styles.body}>
        <View
          style={styles.boardRow}
          onLayout={(e) => {
            const w = Math.floor(e.nativeEvent.layout.width);
            if (w > 0) setBoardAreaWidth(w);
          }}
        >
          <View
            style={[
              styles.boardFrame,
              {
                width: boardSize,
                borderColor: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <ChessBoard
              fen={game.fen}
              orientation={session.color}
              interactive={myTurn}
              lastMove={game.lastMove}
              onMove={onMove}
            />
          </View>
          <View style={{ height: boardSize, width: sideWidth }}>
            <CapturedSideColumn
              fen={game.fen}
              myColor={session.color}
              width={sideWidth}
              tileSize={34}
            />
          </View>
        </View>

        {!!error && (
          <Text
            style={{
              color: theme.colors.danger,
              fontFamily: fontFamilyFor(theme, 'body'),
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {error}
          </Text>
        )}

        {chatOpen && (
          <View style={styles.chatSlot}>
            <ChatPanel
              messages={messages}
              myPlayerId={session.playerId}
              onSend={(text) => {
                getSocket().emit(
                  'sendChat',
                  { gameId: session.gameId, playerId: session.playerId, text },
                  () => {},
                );
              }}
            />
          </View>
        )}
      </View>

      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        subtitle={game.code}
        items={[
          { label: 'Copy invite link', onPress: () => void copyInvite() },
          { label: 'Themes', onPress: () => navigation.navigate('Themes') },
          {
            label: chatOpen ? 'Hide chat' : 'Show chat',
            onPress: () => setChatOpen((v) => !v),
          },
          { label: 'Resign', onPress: resign, danger: true },
          { label: 'End & leave', onPress: () => void leave(), danger: true },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  boardFrame: {
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden',
    padding: 0,
  },
  chatSlot: {
    flex: 1,
    marginTop: 12,
    minHeight: 160,
  },
});
