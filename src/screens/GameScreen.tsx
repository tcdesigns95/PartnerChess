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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useKeyboardInset } from '../lib/useKeyboardInset';
import type { ChatMessage, PublicGame, RootStackParamList, Session } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<PublicGame | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('…');
  const [error, setError] = useState('');
  const [bodyBox, setBodyBox] = useState({ w: 0, h: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

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
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
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
  const waiting = game.status === 'waiting';
  const opponent =
    session.color === 'w' ? game.players.b?.name : game.players.w?.name;
  const bottomInset = Math.max(insets.bottom, 8);
  const hPad = 10;
  const areaW = bodyBox.w || winW;
  const areaH = bodyBox.h || Math.max(280, winH - insets.top - 64);
  const contentW = Math.max(0, areaW - hPad * 2);
  const contentH = Math.max(0, areaH - bottomInset);
  const sideWidth = contentW < 340 ? 36 : 42;
  const footerH = (waiting ? 128 : 0) + (error ? 36 : 0);
  const availW = contentW - sideWidth - 6;
  const availH = contentH - footerH;
  const boardSize = Math.max(0, Math.floor(Math.min(availW, availH)));
  const chatHeight = Math.max(220, Math.min(420, Math.round(winH * 0.46)));

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              fontFamily: fontFamilyFor(theme, 'display', 'bold'),
              fontSize: 22,
            }}
          >
            {status}
          </Text>
          <Text
            numberOfLines={1}
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
          accessibilityRole="button"
          accessibilityLabel={chatOpen ? 'Close chat' : 'Open chat'}
          onPress={() => setChatOpen((v) => !v)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: chatOpen ? theme.colors.text : theme.colors.surface,
              borderColor: chatOpen ? theme.colors.text : theme.colors.border,
            },
          ]}
        >
          <ChatIcon
            color={chatOpen ? theme.colors.accentText : theme.colors.text}
            dotColor={chatOpen ? theme.colors.text : theme.colors.surface}
          />
        </Pressable>
        <MenuButton onPress={() => setMenuOpen(true)} />
      </View>

      <View
        style={[styles.body, { paddingBottom: bottomInset, paddingHorizontal: hPad }]}
        onLayout={(e) => {
          const w = Math.floor(e.nativeEvent.layout.width);
          const h = Math.floor(e.nativeEvent.layout.height);
          if (w > 0 && h > 0) {
            setBodyBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
          }
        }}
      >
        <View style={styles.boardSlot}>
        <View style={styles.boardRow}>
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
              tileSize={Math.max(24, sideWidth - 8)}
            />
          </View>
        </View>
        </View>

        <View style={[styles.footer, footerH > 0 && { minHeight: footerH }]}>
        {!!error && (
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.danger,
              fontFamily: fontFamilyFor(theme, 'body'),
              textAlign: 'center',
              marginTop: 8,
              fontSize: 13,
            }}
          >
            {error}
          </Text>
        )}

        {waiting && (
          <View style={styles.wait}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 12,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Share this code
            </Text>
            <Text
              selectable
              style={{
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'display', 'bold'),
                fontSize: contentH < 560 ? 28 : 32,
                lineHeight: contentH < 560 ? 32 : 36,
                letterSpacing: contentW < 340 ? 3 : 5,
              }}
            >
              {game.code}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy invite link"
              onPress={() => void copyInvite()}
              style={({ pressed }) => [
                styles.copyBtn,
                {
                  backgroundColor: theme.colors.text,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                  fontSize: 16,
                  letterSpacing: 0.4,
                }}
              >
                {copied ? 'Invite copied' : 'Copy invite'}
              </Text>
            </Pressable>
          </View>
        )}
        </View>
      </View>

      {chatOpen && (
        <View style={styles.chatLayer} pointerEvents="box-none">
          <Pressable
            accessibilityLabel="Close chat"
            style={styles.chatBackdrop}
            onPress={() => setChatOpen(false)}
          />
          <View
            style={[
              styles.chatSheet,
              {
                height: chatHeight,
                marginBottom: keyboardInset,
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
            <ChatPanel
              sheet
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
        </View>
      )}

      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        subtitle={`Code ${game.code}`}
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
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  boardSlot: {
    flex: 1,
    justifyContent: 'center',
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  boardFrame: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footer: {
    justifyContent: 'flex-end',
  },
  wait: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  copyBtn: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  chatLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  chatBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.28)',
  },
  chatSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
});
