/**
 * SettingsScreenLayout - Reusable layout component for settings screens
 *
 * Every settings panel is a stack screen now, so the layout draws the chrome
 * the gate used to draw for it: the kit's `ScreenHeader` (a 38pt back well and
 * the title), the safe area on both edges, an optional subtitle, and the
 * scrollable body with the screen gutter.
 *
 * `showHeader` stays for the rare body that owns its own header row; it
 * defaults to on, because a screen without a back well has no way out.
 *
 * `footer` renders outside the `ScrollView`, on the safe area, for a panel
 * that pins a `PrimaryButton` (or similar committing action) below the
 * scrollable body instead of letting it scroll away with the content.
 */

import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';
import { ScreenHeader } from '../ScreenHeader';

import { spacing, contentPadding, fontSize, fontFamilyNative, lineHeight, s, semantic, vs } from '@salmon/shared';

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
  /** Whether to render the screen header. Default: true */
  showHeader?: boolean;
  /** Sticky action band rendered below the scrollable body, on the safe area. */
  footer?: ReactNode;
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
  showHeader = true,
  footer,
}: SettingsScreenLayoutProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/* Pushed over the tab shell, so the screen paints its own water — the
          same two layers every non-Home screen mounts. Painted per screen
          rather than once by the sub-stack, so the cards stay opaque and the
          list never ghosts through a panel sliding in over it. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

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
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {showHeader && (
            <ScreenHeader
              onBack={onBack}
              backLabel={t('accessibility.go_back', 'Go back')}
              title={title}
              subtitle={subtitle}
            />
          )}

          {subtitle && !showHeader && (
            <Text style={[styles.subtitle, styles.subtitleStandalone]}>{subtitle}</Text>
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

          {footer && <View style={styles.footer}>{footer}</View>}
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
  subtitle: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    paddingHorizontal: contentPadding.screen,
    marginBottom: vs(spacing.screenGutter),
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
  // The component gap (DESIGN.md §Layout): every top-level block a panel
  // hands in is a sibling component, 20 from the next, ending on the same 20.
  // The header block already ends 20 above the content; a headerless body
  // still owns its own top padding.
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.screenGutter),
    gap: vs(spacing.screenGutter),
  },
  scrollContentHeaderless: {
    paddingTop: spacing.md,
  },
  footer: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
  },
});
