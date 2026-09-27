import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';

type MenuItem = {
  label: string;
  onPress: () => void;
  danger?: boolean;
};

type GameMenuProps = {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  subtitle?: string;
};

export function MenuButton({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityLabel="Menu"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.menuBtn,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M12 8.5 A2 2 0 1 0 12 4.5 A2 2 0 1 0 12 8.5 Z M12 14.5 A2 2 0 1 0 12 10.5 A2 2 0 1 0 12 14.5 Z M12 20.5 A2 2 0 1 0 12 16.5 A2 2 0 1 0 12 20.5 Z"
          fill={theme.colors.text}
        />
      </Svg>
    </Pressable>
  );
}

export function GearIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.61 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.73 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4c.24 0 .44-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.23.1.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
        fill={color}
      />
    </Svg>
  );
}

export function GameMenu({ open, onClose, items, subtitle }: GameMenuProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 12) + 16,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHead}>
            <GearIcon color={theme.colors.text} />
            <Text
              style={{
                marginLeft: 10,
                fontSize: 18,
                color: theme.colors.text,
                fontFamily: fontFamilyFor(theme, 'display', 'bold'),
              }}
            >
              Menu
            </Text>
          </View>
          {!!subtitle && (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body'),
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {subtitle}
            </Text>
          )}
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: item.danger ? theme.colors.danger : theme.colors.text,
                  fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                  fontSize: 16,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.close,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: fontFamilyFor(theme, 'body', 'bold'),
                fontSize: 16,
              }}
            >
              Close
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Tiny chat toggle icon. */
export function ChatIcon({
  color,
  dotColor = '#FAF7F1',
  size = 22,
}: {
  color: string;
  dotColor?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        fill={color}
      />
      <Circle cx="8" cy="10.5" r="1.2" fill={dotColor} />
      <Circle cx="12" cy="10.5" r="1.2" fill={dotColor} />
      <Circle cx="16" cy="10.5" r="1.2" fill={dotColor} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    justifyContent: 'center',
  },
  close: {
    marginTop: 4,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
