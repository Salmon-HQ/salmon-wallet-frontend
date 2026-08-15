/**
 * PasswordInput - Secure text input with visibility toggle
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  componentSizes,
  spacing,
  borderWidth,
  fontSize,
  fontFamilyNative,
  semantic,
} from '@salmon/shared';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  testID?: string;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  autoFocus,
  onSubmitEditing,
  testID,
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return semantic.status.danger;
    if (isFocused) return colors.accent.primary;
    return colors.input.border;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, { borderColor: getBorderColor() }]}>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t('lock.password_placeholder')}
          placeholderTextColor={colors.text.tertiary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="done"
        />
        <TouchableOpacity
          testID={testID ? `${testID}-toggle` : undefined}
          accessibilityRole="button"
          accessibilityLabel={
            showPassword ? t('general.hide_password') : t('general.show_password')
          }
          onPress={() => setShowPassword(!showPassword)}
          style={styles.toggleButton}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={componentSizes.iconSizeMedium}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: componentSizes.inputHeight,
    paddingVertical: spacing.xs,
    backgroundColor: colors.input.background,
    borderWidth: borderWidth.thin,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
