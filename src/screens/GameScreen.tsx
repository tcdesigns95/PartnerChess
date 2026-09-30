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
import { PlayerCaptureRow } from '../components/CapturedSideColumn';
import { ChessPiece, type PieceType } from '../components/ChessPiece';
import { ChatPanel } from '../components/ChatPanel';
import { ChatIcon, GameMenu, MenuButton } from '../components/GameMenu';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';
import { getSocket, buildInviteLink, resumeLiveSocket } from '../lib/socket';
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
  const [unread, setUnread] = useState(0);
  const [chatPreview, setChatPreview] = useState<ChatMessage | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const sharePrompted = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const chatOpenRef = useRef(false);
  const revisionRef = useRef(0);
  const pendingMoveRef = useRef(false);
  const chatHydrated = useRef(false);
  const seenChatIds = useRef(new Set<string>());
  const hasGameRef = useRef(false);
  const rejoinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  const absorbChat = useCallback((incoming: ChatMessage[], notify: boolean) => {
    for (const m of incoming) {
      if (seenChatIds.current.has(m.id)) continue;
      seenChatIds.current.add(m.id);
      if (!notify) continue;
      if (m.playerId === sessionRef.current?.playerId) continue;
      if (chatOpenRef.current) continue;
      setUnread((n) => n + 1);
      setChatPreview(m);
    }
  }, []);

  const applyGame = useCallback((g: PublicGame, force = false) => {
    const rev = g.updatedAt ?? 0;
    // Never paint an older snapshot over a move that already landed.
    if (rev < revisionRef.current) return;
    // While a move is in flight, ignore a repeat of the pre-move snapshot.
    // A failed move passes force so the server position can replace the optimistic one.
    if (!force && pendingMoveRef.current && rev === revisionRef.current) return;
    revisionRef.current = rev;
    pendingMoveRef.current = false;
    hasGameRef.current = true;
    setGame(g);
    // The first snapshot is history. Later snapshots can carry a message the live event missed.
    absorbChat(g.chat ?? [], chatHydrated.current);
    chatHydrated.current = true;
    setMessages((prev) => {
      const map = new Map<string, ChatMessage>();
      for (const m of g.chat ?? []) map.set(m.id, m);
      for (const m of prev) if (!map.has(m.id)) map.set(m.id, m);
      return [...map.values()].sort((a, b) => a.at - b.at);
    });
    if (g.status === 'waiting') setStatus('Waiting');
    else if (g.status === 'finished') setStatus(g.result || 'Over');
    else {
      const turnLabel = g.turn === 'w' ? 'White' : 'Black';
      setStatus(g.isCheck ? `${turnLabel} · check` : turnLabel);
    }
  }, [absorbChat]);

  const rejoin = useCallback((force = false) => {
    const s = sessionRef.current;
    if (!s) return;
    if (force) resumeLiveSocket();
    const socket = getSocket();
    const emit = () => {
      if (rejoinTimer.current) clearTimeout(rejoinTimer.current);
      rejoinTimer.current = setTimeout(() => {
        if (!hasGameRef.current) setError((current) => current || 'Could not reopen your game');
      }, 8000);
      socket.emit(
        'rejoinGame',
        { gameId: s.gameId, playerId: s.playerId },
        (res) => {
          if (rejoinTimer.current) clearTimeout(rejoinTimer.current);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setError('');
          applyGame(res.game, force);
          void saveSession({ ...s, code: res.game.code });
        },
      );
    };
    if (socket.connected) emit();
    else {
      socket.connect();
      socket.once('connect', emit);
    }
  }, [applyGame]);

  useEffect(() => {
    const socket = getSocket();
    const onGame = (g: PublicGame) => applyGame(g);
    const onChat = (msg: ChatMessage) => {
      absorbChat([msg], true);
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
  }, [absorbChat, applyGame, rejoin]);

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
    const wake = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      rejoin(true);
    };
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') wake();
    };
    const sub = AppState.addEventListener('change', onChange);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', wake);
      window.addEventListener('pageshow', wake);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', wake);
        window.removeEventListener('pageshow', wake);
      }
    };
  }, [rejoin]);

  const copyInvite = async () => {
    if (!game?.code) return;
    await Clipboard.setStringAsync(buildInviteLink(game.code));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  useEffect(() => {
    if (game?.status !== 'waiting' || sharePrompted.current) return;
    sharePrompted.current = true;
    setMenuOpen(true);
  }, [game?.status]);

  useEffect(() => {
    if (game?.status === 'active') setMenuOpen(false);
  }, [game?.status]);

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!session || !game) return;
    pendingMoveRef.current = true;
    const startedRev = revisionRef.current;
    try {
      const draft = new Chess(game.fen);
      const opts: { from: string; to: string; promotion?: string } = { from, to };
      if (promotion) opts.promotion = promotion;
      const local = draft.move(opts as Parameters<Chess['move']>[0]);
      if (local) {
        hasGameRef.current = true;
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

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      if (pendingMoveRef.current && revisionRef.current === startedRev) {
        pendingMoveRef.current = false;
        rejoin(true);
      }
    }, 4500);

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
        settled = true;
        clearTimeout(timer);
        if (!res.ok) {
          pendingMoveRef.current = false;
          setError(res.error);
          rejoin(true);
          return;
        }
        setError('');
        applyGame(res.game);
      },
    );
  };

  useEffect(() => {
    if (!chatPreview) return;
    const timer = setTimeout(() => setChatPreview(null), 4500);
    return () => clearTimeout(timer);
  }, [chatPreview]);

  const openChat = () => {
    chatOpenRef.current = true;
    setChatOpen(true);
    setUnread(0);
    setChatPreview(null);
  };

  const toggleChat = () => {
    if (chatOpenRef.current) {
      chatOpenRef.current = false;
      setChatOpen(false);
      return;
    }
    openChat();
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
        {error ? (
          <>
            <Text
              style={{
                color: theme.colors.danger,
                fontFamily: fontFamilyFor(theme, 'body'),
                textAlign: 'center',
                paddingHorizontal: 24,
              }}
            >
              {error}
            </Text>
            <Pressable
              onPress={() => {
                setError('');
                rejoin(true);
              }}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: theme.colors.text, fontFamily: fontFamilyFor(theme, 'body', 'bold') }}>
                Back to the game
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.colors.accent} />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body'),
                marginTop: 12,
              }}
            >
              Opening your game…
            </Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  const myTurn = game.status === 'active' && game.turn === session.color;
  const opponent =
    session.color === 'w' ? game.players.b?.name : game.players.w?.name;
  const bottomInset = Math.max(insets.bottom, 8);
  const hPad = 10;
  const areaW = bodyBox.w || winW;
  const areaH = bodyBox.h || Math.max(280, winH - insets.top - 64);
  const contentW = Math.max(0, areaW - hPad * 2);
  const contentH = Math.max(0, areaH - bottomInset);
  const footerH = error ? 36 : 0;
  const captureRowH = 26;
  const availW = contentW;
  const availH = contentH - footerH - captureRowH * 2 - 8;
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
          <Text numberOfLines={1} style={{ marginTop: 2 }}>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body'),
                fontSize: 13,
              }}
            >
            {copied
              ? 'Invite copied'
              : `${session.color === 'w' ? 'White' : 'Black'}${opponent ? ` vs ${opponent}` : ''}`}
            </Text>
            {myTurn ? (
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                  fontSize: 13,
                }}
              >
                {'  ·  your move'}
              </Text>
            ) : null}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? `Open chat, ${unread} new` : chatOpen ? 'Close chat' : 'Open chat'
          }
          onPress={toggleChat}
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
          {unread > 0 && (
            <View
              style={[
                styles.unread,
                { backgroundColor: theme.colors.danger, borderColor: theme.colors.background },
              ]}
            >
              <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
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
        {chatPreview && !chatOpen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`New message from ${chatPreview.name}`}
            onPress={openChat}
            style={[styles.chatNote, { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent }]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 14,
              }}
            >
              {chatPreview.name}: {chatPreview.text}
            </Text>
          </Pressable>
        )}
        <View style={styles.boardSlot}>
        <View style={[styles.boardColumn, { width: boardSize }]}>
          <PlayerCaptureRow fen={game.fen} lostBy={session.color} width={boardSize} />
          <View
            style={[
              styles.boardFrame,
              {
                width: boardSize,
                borderColor:
                  theme.boardSkin === 'cyber' ? theme.colors.accent : theme.colors.text,
                backgroundColor: theme.colors.surface,
                boxShadow:
                  theme.boardSkin === 'cyber'
                    ? '0 0 18px rgba(0, 240, 255, 0.4)'
                    : undefined,
              },
            ]}
          >
            <ChessBoard
              fen={game.fen}
              orientation={session.color}
              interactive={myTurn}
              lastMove={game.lastMove}
              onMove={onMove}
              onPromote={(from, to) => setPromo({ from, to })}
            />
          </View>
          <PlayerCaptureRow
            fen={game.fen}
            lostBy={session.color === 'w' ? 'b' : 'w'}
            width={boardSize}
          />
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
            <View style={styles.sheetBar}>
              <View style={styles.sheetBarSide} />
              <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close chat"
                onPress={() => setChatOpen(false)}
                style={styles.sheetClose}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                    fontSize: 15,
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>
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

      {promo && (
        <View style={styles.promoLayer}>
          <Pressable style={styles.promoBackdrop} onPress={() => setPromo(null)} />
          <View
            style={[
              styles.promoSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                marginBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'display', 'bold'),
                fontSize: 22,
                textAlign: 'center',
              }}
            >
              Choose a piece
            </Text>
            <View style={styles.promoRow}>
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityLabel={
                    type === 'q' ? 'Queen' : type === 'r' ? 'Rook' : type === 'b' ? 'Bishop' : 'Knight'
                  }
                  onPress={() => {
                    const choice = promo;
                    setPromo(null);
                    onMove(choice.from, choice.to, type);
                  }}
                  style={({ pressed }) => [
                    styles.promoChoice,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.background,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <ChessPiece type={type} color={session.color} size={48} />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                      fontSize: 12,
                    }}
                  >
                    {type === 'q' ? 'Queen' : type === 'r' ? 'Rook' : type === 'b' ? 'Bishop' : 'Knight'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        code={game.code}
        subtitle={game.status === 'waiting' ? 'Share this code' : undefined}
        items={[
          { label: copied ? 'Invite copied' : 'Copy invite link', onPress: () => void copyInvite() },
          { label: 'Themes', onPress: () => navigation.navigate('Themes') },
          {
            label: chatOpen ? 'Hide chat' : unread > 0 ? `Show chat (${unread})` : 'Show chat',
            onPress: toggleChat,
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
  unread: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  chatNote: {
    marginHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  boardSlot: {
    flex: 1,
    justifyContent: 'center',
  },
  boardColumn: {
    alignSelf: 'center',
    gap: 4,
  },
  promoLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 30,
  },
  promoBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  promoSheet: {
    marginHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  promoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  promoChoice: {
    flex: 1,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  boardFrame: {
    borderWidth: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  footer: {
    justifyContent: 'flex-end',
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
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetBarSide: {
    width: 64,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetClose: {
    width: 64,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
