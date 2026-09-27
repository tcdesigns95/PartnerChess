import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ChatMessage } from '../lib/types';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';

type ChatPanelProps = {
  messages: ChatMessage[];
  myPlayerId: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Fill a bottom sheet. The board stays put underneath. */
  sheet?: boolean;
};

export function ChatPanel({
  messages,
  myPlayerId,
  onSend,
  disabled,
  sheet,
}: ChatPanelProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.wrap,
        sheet && styles.sheetWrap,
        {
          backgroundColor: sheet ? 'transparent' : theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textMuted,
            fontFamily: fontFamilyFor(theme, 'body', 'bold'),
          },
        ]}
      >
        Chat
      </Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const mine = item.playerId === myPlayerId;
          return (
            <View
              style={[
                styles.bubble,
                {
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  backgroundColor: mine
                    ? theme.colors.chatBubbleMine
                    : theme.colors.chatBubbleTheirs,
                },
              ]}
            >
              {!mine && (
                <Text
                  style={[
                    styles.name,
                    {
                      color: theme.colors.textMuted,
                      fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                    },
                  ]}
                >
                  {item.name}
                </Text>
              )}
              <Text
                style={[
                  styles.message,
                  {
                    color: mine ? theme.colors.accentText : theme.colors.chatText,
                    fontFamily: fontFamilyFor(theme, 'body'),
                  },
                ]}
              >
                {item.text}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: fontFamilyFor(theme, 'body'),
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Say hi — messages stay with the match.
          </Text>
        }
      />
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={theme.colors.textMuted}
          editable={!disabled}
          onSubmitEditing={submit}
          returnKeyType="send"
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              fontFamily: fontFamilyFor(theme, 'body'),
            },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={disabled || !text.trim()}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed || disabled || !text.trim() ? 0.6 : 1,
              minHeight: 48,
              minWidth: 72,
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.accentText,
              fontFamily: fontFamilyFor(theme, 'body', 'bold'),
            }}
          >
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  sheetWrap: {
    minHeight: 0,
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
  title: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
    gap: 6,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 2,
  },
  name: {
    fontSize: 11,
    marginBottom: 2,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  send: {
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
