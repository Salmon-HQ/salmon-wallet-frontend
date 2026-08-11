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
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  spacing,
  contentPadding,
  fontSize,
  fontFamilyNative,
  componentSizes,
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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {showHeader && (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityLabel={t('accessibility.go_back', 'Go back')}
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-back"
                size={componentSizes.iconSizeMedium}
                color={colors.text.primary}
              />
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
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.lg,
    flex: 1,
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
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
