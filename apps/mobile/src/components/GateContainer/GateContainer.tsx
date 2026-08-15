/**
 * GateContainer — Unified animated surface for the top "gate/curtain"
 *
 * Manages a single translateY animation across four states:
 * - locked:    Full screen (translateY = 0), shows lock content
 * - collapsed: Header bar only (translateY = -(screenH - headerH)), shows header content
 * - settings:  Expanded (translateY = 0, full height), shows settings with backdrop
 * - wallets:   Expanded (translateY = 0, full height), shows wallets with backdrop
 *
 * The surface (background, scales) is shared across all states for visual continuity.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useWindowDimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamilyNative,
  fontSize,
  spacing,
  borderRadius,
  componentSizes,
  shadows,
  s,
} from '@salmon/shared';
import type { GateContainerProps, GateState } from './types';

// ============================================================================
// Constants
// ============================================================================

const SLIDE_DURATION = 800;
const HEADER_FADE_DURATION = 350;
const BACKDROP_OPACITY = 0.5;

// ============================================================================
// Component
// ============================================================================

export function GateContainer({
  state,
  lockContent,
  headerContent,
  settingsContent,
  walletsContent,
  expandedHeader,
  onBackdropPress,
  onUnlockAnimationComplete,
}: GateContainerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + componentSizes.headerHeight;

  // On Android with 3-button navigation, useWindowDimensions().height may report
  // the content-area height (excluding the nav bar) while the gate's rendered
  // height ('100%') includes the area behind the nav bar. Capture the real height
  // via onLayout so collapsedY positions the gate correctly on all nav bar modes.
  const [gateHeight, setGateHeight] = useState(screenHeight);
  const collapsedY = -(gateHeight - headerHeight);

  const prevStateRef = useRef<GateState>(state);
  // Track last expanded content/header so we can keep them visible during close animation
  const [lastExpandedContent, setLastExpandedContent] = useState<'settings' | 'wallets' | null>(
    state === 'settings' || state === 'wallets' ? state : null
  );
  const lastExpandedHeaderRef = useRef(expandedHeader);

  // Animation values
  const translateY = useSharedValue(state === 'locked' ? 0 : collapsedY);
  const backdropOpacity = useSharedValue(0);
  const headerContentOpacity = useSharedValue(state === 'collapsed' ? 1 : 0);

  // Animate state transitions
  useEffect(() => {
    const prevState = prevStateRef.current;
    prevStateRef.current = state;

    switch (state) {
      case 'locked':
        // Drop the close-animation snapshot: locking is not a close, so no
        // expanded panel may survive it. Without this the settings/wallets
        // subtree stays mounted next to the lock content — visible, and fully
        // touchable, behind the password prompt.
        setLastExpandedContent(null);
        // Instant — no animation
        translateY.value = 0;
        backdropOpacity.value = 0;
        headerContentOpacity.value = 0;
        break;

      case 'collapsed':
        if (prevState === 'locked') {
          // Unlock: slide up to header position, then fade in header
          translateY.value = withTiming(
            collapsedY,
            {
              duration: SLIDE_DURATION,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                headerContentOpacity.value = withTiming(1, { duration: HEADER_FADE_DURATION });
                if (onUnlockAnimationComplete) {
                  runOnJS(onUnlockAnimationComplete)();
                }
              }
            }
          );
          backdropOpacity.value = 0;
        } else {
          // Close settings/wallets: slide up (content stays as snapshot),
          // then fade in header, then clear expanded content
          translateY.value = withTiming(
            collapsedY,
            {
              duration: SLIDE_DURATION,
              easing: Easing.in(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                headerContentOpacity.value = withTiming(1, { duration: HEADER_FADE_DURATION });
                // Clear snapshot after slide + fade complete
                runOnJS(setLastExpandedContent)(null);
              }
            }
          );
          backdropOpacity.value = withTiming(0, { duration: SLIDE_DURATION });
        }
        break;

      case 'settings':
      case 'wallets':
        // Track which content is expanded (for snapshot on close)
        setLastExpandedContent(state);
        lastExpandedHeaderRef.current = expandedHeader;
        // Expand: fade out header and slide down simultaneously
        headerContentOpacity.value = withTiming(0, { duration: HEADER_FADE_DURATION });
        translateY.value = withTiming(0, {
          duration: SLIDE_DURATION,
          easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(BACKDROP_OPACITY, { duration: SLIDE_DURATION });
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, collapsedY]);

  // Android back button for expanded states
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (state !== 'settings' && state !== 'wallets') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackdropPress?.();
      return true;
    });
    return () => handler.remove();
  }, [state, onBackdropPress]);

  // Animated styles
  const gateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const headerFadeStyle = useAnimatedStyle(() => ({
    opacity: headerContentOpacity.value,
  }));

  const handleBackdropPress = useCallback(() => {
    onBackdropPress?.();
  }, [onBackdropPress]);

  // Determine what content to show
  const isExpanded = state === 'settings' || state === 'wallets';
  // Use current expanded content, or the snapshot (lastExpandedContent) during close animation
  const activeExpandedType = isExpanded ? state : lastExpandedContent;
  const expandedContent =
    activeExpandedType === 'settings'
      ? settingsContent
      : activeExpandedType === 'wallets'
        ? walletsContent
        : null;
  // `locked` covers the whole screen and must be the only thing rendered:
  // the snapshot is cleared on lock, but this guard also closes the commit
  // between the state change and that effect, when the snapshot is still set.
  const showExpanded = state !== 'locked' && (isExpanded || lastExpandedContent !== null);
  const showBackdrop = showExpanded;
  // Use current header if expanded, or snapshot header during close animation
  const activeExpandedHeader = isExpanded ? expandedHeader : lastExpandedHeaderRef.current;

  return (
    <>
      {/* Backdrop — visible during expand and close animation */}
      {showBackdrop && (
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[styles.backdrop, backdropAnimatedStyle]}
            pointerEvents={isExpanded ? 'auto' : 'none'}
          />
        </TouchableWithoutFeedback>
      )}

      {/* The Gate surface */}
      <Animated.View
        style={[styles.gate, gateAnimatedStyle]}
        onLayout={(e) => setGateHeight(e.nativeEvent.layout.height)}
      >
        {/* Shared visual surface — solid color, no scales */}
        <View style={styles.surface}>
          {/* Lock content — full screen */}
          {state === 'locked' && <View style={styles.lockContentContainer}>{lockContent}</View>}

          {/* Expanded content — settings or wallets (kept mounted for snapshot during close) */}
          {showExpanded && (
            <View style={styles.expandedContentContainer}>
              <View style={{ height: insets.top }} />
              {/* Header bar with title, back, close */}
              {activeExpandedHeader && (
                <View style={styles.expandedHeader}>
                  {activeExpandedHeader.onBack ? (
                    <TouchableOpacity
                      testID="screen-header-back-button"
                      onPress={activeExpandedHeader.onBack}
                      style={styles.headerButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.headerButtonPlaceholder} />
                  )}
                  <Text style={styles.expandedHeaderTitle} numberOfLines={1}>
                    {activeExpandedHeader.title || ''}
                  </Text>
                  <TouchableOpacity
                    testID="sheet-close-button"
                    onPress={activeExpandedHeader.onClose}
                    style={styles.headerButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {/* Expanded body */}
              <View style={styles.expandedBody}>{expandedContent}</View>
            </View>
          )}

          {/* Header content — always rendered at the bottom (the "floor"), fades in/out */}
          {state !== 'locked' && (
            <View style={styles.headerContentContainer}>
              <View style={{ height: insets.top }} />
              <Animated.View style={[styles.headerBar, headerFadeStyle]}>
                {headerContent}
              </Animated.View>
            </View>
          )}
        </View>
      </Animated.View>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dialog.overlay,
    zIndex: 999,
  },
  gate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Height is full screen so it can cover everything when locked
    // and only the top portion is visible when collapsed
    height: '100%',
    zIndex: 1000,
  },
  surface: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    ...shadows.topSheet,
  },
  lockContentContainer: {
    flex: 1,
  },
  headerContentContainer: {
    // Position at the bottom of the gate (which is the visible part when collapsed)
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.headerPadding),
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: borderRadius.header,
    borderBottomRightRadius: borderRadius.header,
    ...Platform.select({
      ios: {
        shadowColor: shadows.header.shadowColor,
        shadowOffset: shadows.header.shadowOffset,
        shadowOpacity: shadows.header.shadowOpacity,
        shadowRadius: shadows.header.shadowRadius,
      },
      android: {
        elevation: shadows.header.elevation,
      },
      default: {},
    }),
  },
  expandedContentContainer: {
    flex: 1,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  expandedHeaderTitle: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.iconLg,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  expandedBody: {
    flex: 1,
    minHeight: 0,
  },
});

export default GateContainer;
