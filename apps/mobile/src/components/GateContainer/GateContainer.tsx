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
} from '@salmon/shared';
import { Thermocline } from '../Thermocline';
import type { GateContainerProps, GateState } from './types';
import { curve, timing } from '../../utils/motion';
import {
  CHROME_SCALE,
  SINK_FLOAT_TRAVEL,
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
  // The collapsed slice is the redesign's screen top: safe area, then
  // `screenTop`, then the header row itself. It is deliberately unscaled —
  // `useTabChrome` computes the same three terms so the Home content starts
  // exactly where this ends (see `headerContentOffset`).
  const headerTopPadding = insets.top + spacing.screenTop;
  const headerHeight = headerTopPadding + componentSizes.walletHeaderRowHeight;

  // On Android with 3-button navigation, useWindowDimensions().height may report
  // the content-area height (excluding the nav bar) while the gate's rendered
  // height ('100%') includes the area behind the nav bar. Capture the real height
  // via onLayout so collapsedY positions the gate correctly on all nav bar modes.
  const [gateHeight, setGateHeight] = useState(screenHeight);
  const collapsedY = -(gateHeight - headerHeight);

  // The gate is only chrome once it has finished moving. While the unlock
  // slide is still in flight the surface still covers the screen, so letting
  // touches through (`box-none`) hands taps to whatever is underneath a gate
  // that is visibly still there — a press on the lock screen landing on the
  // home behind it. Directly-mounted collapsed there is no slide, so it starts
  // settled.
  const [isSettled, setIsSettled] = useState(state === 'collapsed');
  const collapsedPointerEvents = state === 'collapsed' && isSettled ? 'box-none' : 'auto';

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
  // 800ms, longer than `tide` — and nothing in the app is allowed to take that
  // kind of time. The header swapping under it is a state change in place, so
  // it crossfades on `swell`.
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
        setIsSettled(false);
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
        // Arriving from somewhere else means a slide is about to play, and the
        // gate keeps every touch until it lands. Re-running for a geometry
        // change (`collapsedY`) while already collapsed is not a transition.
        if (prevState !== 'collapsed') setIsSettled(false);
        if (prevState === 'locked') {
          // Unlock: slide up to header position, then fade in header
          translateY.value = withTiming(collapsedY, slideIn, (finished) => {
            if (finished) {
              headerContentOpacity.value = withTiming(1, headerFade);
              runOnJS(setIsSettled)(true);
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
              runOnJS(setIsSettled)(true);
              // Clear snapshot after slide + fade complete
              runOnJS(setLastExpandedContent)(null);
            }
          });
          backdropOpacity.value = withTiming(0, slideOut);
        }
        break;

      case 'settings':
      case 'wallets':
        setIsSettled(false);
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

  // The header is no longer a gate. It used to lift the whole surface one
  // headerHeight further up while a task window owned the screen — the
  // "compuerta". In the redesign the header sits on the same plane as the
  // balance, so a task engaging is a plain content swap: the row leaves and
  // returns with the same sink/float verb the Home content uses, at chrome
  // scale. `translateY` is owned solely by the state effect above now.
  const headerConcealed = state === 'collapsed' && concealed;

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
        // Collapsed AND settled, the gate is chrome sitting on the same plane
        // as the content below it: it must never swallow a touch aimed at the
        // balance block it no longer covers. Mid-slide it still covers that
        // block, so it keeps every touch until the animation lands.
        pointerEvents={collapsedPointerEvents}
        style={[styles.gate, gateAnimatedStyle]}
        onLayout={(e) => setGateHeight(e.nativeEvent.layout.height)}
      >
        {/* Shared visual surface. The ground is the material, the same thick
            tier every sheet grounds on — the gate no longer keeps a ground of
            its own. Collapsed it paints nothing at all: no band, no rounded
            bottom edge, no shadow, because the header row is on the balance's
            own plane. While locked the lock content mounts its own ground. */}
        <View
          testID="gate-surface"
          pointerEvents={collapsedPointerEvents}
          style={[
            styles.surface,
            showExpanded && styles.surfaceFloor,
            DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.gateSurface },
          ]}
        >
          {showExpanded && <Thermocline tier="thick" style={styles.thermocline} />}

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

          {/* Header content — pinned to the bottom of the gate, which is the
              only part visible while collapsed. Height is the same slot the
              collapse math reserves (safe area + `screenTop` + the row), so
              the row starts flush under the screen's top padding and the Home
              content below it begins exactly where this ends.

              Task engaged: the row leaves and returns with the content's own
              verb at chrome scale — a conditional mount, the same mechanism
              the Home content uses, so the sink plays on unmount and the
              float on remount. Locked owns the whole screen and has no row. */}
          {state !== 'locked' && !headerConcealed && (
            <View
              pointerEvents="box-none"
              style={[styles.headerContentContainer, { height: headerHeight }]}
            >
              <View
                style={[
                  { height: headerTopPadding },
                  DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.headerTopSpacer },
                ]}
              />
              <Animated.View
                testID="gate-header-bar"
                entering={floatEntering(isReduceMotionEnabled, {
                  distance: SINK_FLOAT_TRAVEL / 2,
                  scale: CHROME_SCALE,
                  durationMs: motionMs.drift,
                })}
                exiting={sinkExiting(isReduceMotionEnabled, {
                  distance: SINK_FLOAT_TRAVEL / 2,
                  scale: CHROME_SCALE,
                  durationMs: motionMs.ebb,
                })}
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
    // Radii and shadow moved to `surfaceFloor` — they belong to the expanded
    // panel, which is a sheet. Collapsed, the header has no edge of its own.
    backgroundColor: 'transparent',
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
    // 24 is a documented off-scale one-off (the scale's "header corners"
    // annotation) — deliberate, not a missed r-step.
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
    // Horizontal padding lives in HeaderContent (its sole consumer), which
    // now uses `spacing.screenGutter` — the same gutter the Home content below
    // it uses, so the thumb and the balance share one left edge.
    // The row is exactly as tall as its own content — the 38px account thumb.
    // It used to be `componentSizes.headerHeight` (56), a slot the row's 38px
    // content was centred inside: 9px of that slack sat *above* the thumb, so
    // the header started at `safe area + screenTop + 9` instead of
    // `safe area + screenTop`, and the collapse math handed the content below
    // 18px it did not need.
    // NOT `vs()`. Every other expression defining this row is the raw token:
    // the collapse math, the slot itself and `useTabChrome`'s
    // `headerChromeHeight`. `vs` is a ratio against a 956dp reference, so on
    // anything shorter the row underfilled its slot and on a taller one it
    // overflowed.
    height: componentSizes.walletHeaderRowHeight,
    // No fill and no edge. The header sits on the balance's own plane now:
    // whatever the water column is painting behind it is the ground.
    backgroundColor: 'transparent',
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
