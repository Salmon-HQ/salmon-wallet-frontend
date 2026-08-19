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
  useReducedMotion,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CaretLeftIcon, XIcon, iconSize } from '../../icons';
import {
  colors,
  fontFamilyNative,
  fontSize,
  spacing,
  borderRadius,
  componentSizes,
  motionMs,
  semantic,
  shadows,
  vs,
} from '@salmon/shared';
import { Thermocline } from '../Thermocline';
import type { GateContainerProps, GateState } from './types';
import { curve, timing } from '../../utils/motion';
import {
  CHROME_SCALE,
  FLOAT_IN_MS,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  floatEntering,
  sinkExiting,
} from '../../utils/sinkAndFloat';
import { useTaskChrome } from '../../contexts/TaskChromeContext';
import { DEBUG_LAYER_COLORS, DEBUG_LAYER_COLOR } from '../../debug/layerColors';

// ============================================================================
// Constants
// ============================================================================

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
  // The compuerta signal: true while a task window (swap review/success)
  // owns the screen. Published by SwapScreen through TaskChromeContext.
  const { isTaskEngaged: concealed } = useTaskChrome();
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

  // The gate is a sheet: it presents on `rise` and recedes on `ebb`. It ran at
  // 800ms, which is longer than The Surfacing — the one thing in the app
  // allowed to take that kind of time. The header swapping under it is a state
  // change in place, so it crossfades on `swell`.
  const isReduceMotionEnabled = useReducedMotion();
  const slideIn = timing(motionMs.rise, isReduceMotionEnabled);
  const slideOut = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);
  const headerFade = timing(motionMs.swell, isReduceMotionEnabled);

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
          translateY.value = withTiming(collapsedY, slideIn, (finished) => {
            if (finished) {
              headerContentOpacity.value = withTiming(1, headerFade);
              if (onUnlockAnimationComplete) {
                runOnJS(onUnlockAnimationComplete)();
              }
            }
          });
          backdropOpacity.value = 0;
        } else {
          // Close settings/wallets: slide up (content stays as snapshot),
          // then fade in header, then clear expanded content
          translateY.value = withTiming(collapsedY, slideOut, (finished) => {
            if (finished) {
              headerContentOpacity.value = withTiming(1, headerFade);
              // Clear snapshot after slide + fade complete
              runOnJS(setLastExpandedContent)(null);
            }
          });
          backdropOpacity.value = withTiming(0, slideOut);
        }
        break;

      case 'settings':
      case 'wallets':
        // Track which content is expanded (for snapshot on close)
        setLastExpandedContent(state);
        lastExpandedHeaderRef.current = expandedHeader;
        // Expand: fade out header and slide down simultaneously
        headerContentOpacity.value = withTiming(0, headerFade);
        translateY.value = withTiming(0, slideIn);
        backdropOpacity.value = withTiming(BACKDROP_OPACITY, slideIn);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, collapsedY]);

  // The compuerta: while a task window owns the screen, the collapsed header
  // leaves upward — the whole gate travels one headerHeight further up, on
  // the verb's own numbers (sink out, float back). It runs after the state
  // effect above so that on a same-commit change the concealment wins.
  // Reduce motion: `timing` resolves to a cut. Only the collapsed state
  // conceals — every other state owns translateY through the effect above.
  //
  // It may only touch translateY when `concealed` actually flips. This effect
  // also re-runs on every collapsedY/gateHeight change and on the
  // locked→collapsed transition, and reassigning a shared value cancels the
  // animation in flight — which fired the unlock slideIn's completion
  // callback with finished=false, so headerContentOpacity never faded in and
  // the home header rendered as an empty dark band (owner bug, 2026-08-18).
  const prevConcealedRef = useRef(false);
  useEffect(() => {
    if (state !== 'collapsed') return;
    if (concealed === prevConcealedRef.current) return;
    prevConcealedRef.current = concealed;
    if (concealed) {
      translateY.value = withTiming(
        -gateHeight,
        timing(SINK_OUT_MS, isReduceMotionEnabled, curve.sink)
      );
    } else {
      translateY.value = withTiming(collapsedY, timing(FLOAT_IN_MS, isReduceMotionEnabled));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concealed, state, collapsedY, gateHeight, isReduceMotionEnabled]);

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

  // The header title's verb (chrome scale, like HeaderContent's account line):
  // the first title a session shows floats with no delay — nothing sank —
  // while every later swap waits out the old title's sink plus a beat.
  const expandedTitle = activeExpandedHeader?.title || '';
  const [titleSwap, setTitleSwap] = useState({ title: expandedTitle, hasPrior: false });
  if (titleSwap.title !== expandedTitle) {
    setTitleSwap({ title: expandedTitle, hasPrior: true });
  }

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
        testID="gate-root"
        style={[styles.gate, gateAnimatedStyle]}
        onLayout={(e) => setGateHeight(e.nativeEvent.layout.height)}
      >
        {/* Shared visual surface. The ground is the material, the same thick
            tier every sheet grounds on — the gate no longer keeps a ground of
            its own. While locked the lock content mounts its own ground (the
            water column), so nothing is painted over it. */}
        <View
          testID="gate-surface"
          style={[
            styles.surface,
            state === 'locked' && styles.surfaceLocked,
            showExpanded && styles.surfaceFloor,
            DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.gateSurface },
          ]}
        >
          {state !== 'locked' && <Thermocline tier="thick" style={styles.thermocline} />}

          {/* Lock content — full screen */}
          {state === 'locked' && <View style={styles.lockContentContainer}>{lockContent}</View>}

          {/* Expanded content — settings or wallets (kept mounted for snapshot during close) */}
          {showExpanded && (
            <View style={styles.expandedContentContainer}>
              <View style={{ height: insets.top }} />
              {/* Header bar with title, back, close */}
              {activeExpandedHeader && (
                <View style={styles.expandedHeader}>
                  {/* The back chevron speaks the same chrome-scale verb as the
                      title. What changes per navigation is its *presence* —
                      between panels the affordance is visually identical, so
                      only the appear (stack gains depth) and disappear (back
                      to the menu root) travel; the placeholder keeps the slot
                      so nothing reflows. */}
                  {activeExpandedHeader.onBack ? (
                    <Animated.View
                      testID="gate-back-verb"
                      entering={floatEntering(isReduceMotionEnabled, {
                        distance: SINK_FLOAT_TRAVEL / 2,
                        scale: CHROME_SCALE,
                        durationMs: motionMs.drift,
                        delayMs: titleSwap.hasPrior ? motionMs.ebb + motionMs.stagger : 0,
                      })}
                      exiting={sinkExiting(isReduceMotionEnabled, {
                        distance: SINK_FLOAT_TRAVEL / 2,
                        scale: CHROME_SCALE,
                        durationMs: motionMs.ebb,
                      })}
                    >
                      <TouchableOpacity
                        testID="screen-header-back-button"
                        onPress={activeExpandedHeader.onBack}
                        style={styles.headerButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                      >
                        <CaretLeftIcon size={iconSize.lg} color={semantic.text.primary} />
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <View style={styles.headerButtonPlaceholder} />
                  )}
                  {/* The title speaks the verb at chrome scale, like the home
                      header's account line: keyed on the string so a panel
                      change sinks the old title and floats the new one. Only
                      the text travels — the back/close buttons stay mounted. */}
                  <Animated.View
                    key={expandedTitle}
                    testID="gate-expanded-title"
                    style={styles.expandedHeaderTitleWrapper}
                    entering={floatEntering(isReduceMotionEnabled, {
                      distance: SINK_FLOAT_TRAVEL / 2,
                      scale: CHROME_SCALE,
                      durationMs: motionMs.drift,
                      delayMs: titleSwap.hasPrior ? motionMs.ebb + motionMs.stagger : 0,
                    })}
                    exiting={sinkExiting(isReduceMotionEnabled, {
                      distance: SINK_FLOAT_TRAVEL / 2,
                      scale: CHROME_SCALE,
                      durationMs: motionMs.ebb,
                    })}
                  >
                    <Text style={styles.expandedHeaderTitle} numberOfLines={1}>
                      {expandedTitle}
                    </Text>
                  </Animated.View>
                  <TouchableOpacity
                    testID="sheet-close-button"
                    onPress={activeExpandedHeader.onClose}
                    style={styles.headerButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                  >
                    <XIcon size={iconSize.lg} color={semantic.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {/* Expanded body */}
              <View style={styles.expandedBody}>{expandedContent}</View>
            </View>
          )}

          {/* Header content — always rendered at the bottom (the "floor"), fades in/out.
              Height is pinned to the same slot used for the collapse math
              (insets.top + headerHeight) so the row starts flush at insets.top
              instead of leaving unaccounted space above it: the row is shorter
              than headerHeight, and without an explicit height the bottom-pinned
              container shrinks to fit its content, pushing that slack above the
              spacer instead of below the row. */}
          {state !== 'locked' && (
            <View
              style={[
                styles.headerContentContainer,
                { height: insets.top + componentSizes.headerHeight },
              ]}
            >
              <View
                style={[
                  { height: insets.top },
                  DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.headerTopSpacer },
                ]}
              />
              <Animated.View
                testID="gate-header-bar"
                style={[
                  styles.headerBar,
                  headerFadeStyle,
                  DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.headerBar },
                ]}
              >
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
    // No fill of its own: the Thermocline mounted inside carries the ground,
    // the same thick tier `BottomSheetContainer` hardwires for every sheet.
    // Radii and shadow stay here — the material clips itself to them.
    backgroundColor: 'transparent',
    // 24 is a documented off-scale one-off (the scale's "header corners"
    // annotation) — deliberate, not a missed r-step.
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    ...shadows.topSheet,
  },
  // The material fills the gate and clips itself to the gate's own bottom
  // corners — the mirror of the sheet container's `thermocline` style.
  thermocline: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
  },
  // The gate's scrim floor. A sheet veils content the user has already left,
  // so the thick tier's alpha over live pixels is enough there; the gate
  // covers nearly the whole screen and has to *replace* the home, not veil
  // it — without a floor the amount, the token rows and the tab bar stayed
  // legible straight through the settings list. Per DESIGN.md §The scrim
  // floor a membrane only guarantees its ratios over a defined backdrop, so
  // the gate gives the material one: `surface.crest`, the thick tier's own
  // nearest opaque plane — the same plane the reduce-transparency rung
  // collapses to, so the two rungs land on the same ground and the material
  // stays what it is (its ink and its scales field, now over a known floor
  // instead of the home). Only while expanded: collapsed the gate is chrome
  // over content and reads as it always has, and locked keeps its own ground.
  surfaceFloor: {
    backgroundColor: semantic.surface.crest,
  },
  surfaceLocked: {
    // The shadow goes with the ground: `surface` keeps `shadows.topSheet` for
    // the sheet states, and on iOS a shadow with a transparent background
    // composites over the lock content as a ghost band. Elevation for Android.
    shadowOpacity: 0,
    elevation: 0,
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
    // Horizontal padding lives in HeaderContent (its sole consumer) — this
    // wrapper used to double-apply spacing.headerPadding on top of it,
    // pushing the avatar/label and the icon buttons in ~2x further than
    // intended.
    // Explicit height, not content-sized: the row's natural height (~44,
    // from the avatar touch target) is shorter than componentSizes.headerHeight
    // (56) — the slot the collapse math reserves for it. Left content-sized,
    // that 12px gap fell inside headerContentContainer, below this row,
    // exposing `surface`'s own rounded-bottom-corner + shadow there — a
    // second card edge stacked under this one. Filling the slot makes this
    // row's bottom coincide with `surface`'s, so there is exactly one edge.
    height: vs(componentSizes.headerHeight),
    // Same ground as `surface` above — the gate's own shelf.
    backgroundColor: semantic.surface.shelf,
    // 24, the header-corner off-scale one-off — deliberate, see `surface`.
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
    // Per-Plane Border Rule: this divider sits above the shelf, where
    // `border.default` drops under 3:1 — `raised` clears it.
    borderBottomColor: semantic.border.raised,
  },
  expandedHeaderTitleWrapper: {
    flex: 1,
  },
  expandedHeaderTitle: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.heading,
    textAlign: 'center',
  },
  headerButton: {
    width: componentSizes.backButtonSize,
    height: componentSizes.backButtonSize,
    // 20 is a documented off-scale one-off (large icon corners) — deliberate.
    borderRadius: borderRadius.iconLg,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: componentSizes.backButtonSize,
    height: componentSizes.backButtonSize,
  },
  expandedBody: {
    flex: 1,
    minHeight: 0,
  },
});

export default GateContainer;
