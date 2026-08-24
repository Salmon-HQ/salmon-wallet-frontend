/**
 * SettingsScreenLayout - Reusable layout component for settings screens
 *
 * Provides a consistent layout structure for all settings screens including:
 * - Gradient background
 * - Safe area handling
 * - Header with back navigation
 * - Title and optional subtitle
 * - Scrollable content area
 *
 * This component eliminates ~150 lines of duplicated code per settings screen.
 */

import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeftIcon } from '../../icons';

import {
  spacing,
  contentPadding,
  fontSize,
  fontFamilyNative,
  componentSizes,
  letterSpacing,
  lineHeight,
  semantic,
} from '@salmon/shared';

// ============================================================================
// Types
// ============================================================================

export interface SettingsScreenLayoutProps {
  /** The main title of the screen */
  title: string;
  /** Optional subtitle text shown below the title */
  subtitle?: string;
  /** Content to render in the scrollable area */
  children: ReactNode;
  /** Back navigation handler (required) */
  onBack: () => void;
  /** Whether to show vertical scroll indicator. Default: false */
  showsVerticalScrollIndicator?: boolean;
  /** Whether layout should provide its own ScrollView wrapper. Default: true */
  scrollable?: boolean;
  /** Optional style override for the content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to render the internal header. Default: false */
  showHeader?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsScreenLayout({
  title,
  subtitle,
  children,
  onBack,
  showsVerticalScrollIndicator = false,
  scrollable = true,
  contentContainerStyle,
  showHeader = false,
}: SettingsScreenLayoutProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/*
        Settings panels host the label, address, seed and password fields.
        iOS floats the keyboard over the app, so the fields and their save
        buttons need padding pushed in from below; Android already shrinks the
        window via `windowSoftInputMode="adjustResize"`, so it opts out.
      */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        // Android needs an explicit behavior too: left undefined, the view is
        // inert and a field near the bottom of the scroll area stays under the
        // keyboard, with no way to see what is being typed.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {showHeader && (
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                // backButtonSize is 40 — the slop takes the touch target
                // past the 44pt minimum.
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t('accessibility.go_back', 'Go back')}
                accessibilityRole="button"
              >
                <CaretLeftIcon size={componentSizes.iconSizeMedium} color={semantic.text.primary} />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            </View>
          )}

          {subtitle && (
            <Text style={[styles.subtitle, !showHeader && styles.subtitleStandalone]}>
              {subtitle}
            </Text>
          )}

          {scrollable ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                !showHeader && styles.scrollContentHeaderless,
                contentContainerStyle,
              ]}
              showsVerticalScrollIndicator={showsVerticalScrollIndicator}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.staticContent,
                styles.scrollContent,
                !showHeader && styles.scrollContentHeaderless,
                contentContainerStyle,
              ]}
            >
              {children}
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: componentSizes.backButtonSize,
    height: componentSizes.backButtonSize,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  // The `title` role (600, 20, −0.12): a panel title is a card/panel-level
  // heading on the type scale, not the 18/bold one-off it used to be.
  title: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.title,
    letterSpacing: letterSpacing.snug,
    flex: 1,
  },
  subtitle: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.snug,
    paddingHorizontal: contentPadding.screen,
    marginBottom: spacing.lg,
  },
  subtitleStandalone: {
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: contentPadding.screen,
    paddingBottom: spacing['2xl'],
  },
  scrollContentHeaderless: {
    paddingTop: spacing.md,
  },
});
