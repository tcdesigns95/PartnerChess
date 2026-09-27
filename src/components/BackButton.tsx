import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, fontFamilyFor } from '../context/ThemeContext';

type BackButtonProps = {
  onPress?: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  hideWhenRoot?: boolean;
};

export function BackButton({
  onPress,
  label = 'Back',
  style,
  hideWhenRoot = true,
}: BackButtonProps) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const canGoBack = navigation.canGoBack();

  if (hideWhenRoot && !canGoBack && !onPress) {
    return null;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (canGoBack) {
      navigation.goBack();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.chevron, { color: theme.colors.text }]}>‹</Text>
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.text,
            fontFamily: fontFamilyFor(theme, 'body', 'bold'),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chevron: {
    fontSize: 28,
    lineHeight: 28,
    marginTop: -2,
  },
  label: {
    fontSize: 16,
  },
});
