import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  BackHandler,
  Dimensions,
  Keyboard,
  Animated,
  StyleProp,
  ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import { BlurTargetView } from 'expo-blur';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import {
  shadows,
  borderRadius,
  borderWidth,
  componentSizes,
  motionMs,
  vs,
  s,
  spacing,
  withAlpha,
  type Semantic,
  type BottomSheetContainerPropsBase,
  SheetHeightContext,
  SheetParentContext,
  useSheetParent,
  type SheetParentHandle,
  SHEET_EXIT_MS,
  SHEET_EXIT_WATCHDOG_GRACE_MS,
} from '@salmon/shared';
import { BlurTargetProvider } from '../BlurContainer';
import { Thermocline } from '../Thermocline';
import { curve, timing } from '../../utils/motion';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

// ============================================================================
// Constants
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// The backdrop is drawn at its token's full alpha (`overlay.backdrop`), the
// same on both twins — the token is the whole effect.
const BACKDROP_OPACITY = 1;

/**
 * The drag handle, redrawn: 44x5 rather than 70x6.
 *
 * A handle is a grip, not a rule across the sheet — the wide bar read as a
 * divider and pushed the sheet's first line down. 44 is also the minimum
 * touch target, so the grip is exactly as wide as it needs to be grabbable.
 */
const HANDLE_WIDTH = 44;
const HANDLE_HEIGHT = 5;
const DRAG_THRESHOLD = 150;
/**
 * The drag-release spring — the one animation in the app with no `motionMs`
 * duration at all, and a deliberate exception to the duration vocabulary
 * rather than an oversight. A gesture release has to follow the finger's
 * velocity at the moment it lets go, which a fixed duration cannot express:
 * a spring is the only model that takes that velocity as an input.
 */
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

// ============================================================================
// Types
// ============================================================================

/**
 * How long the sheet takes to leave.
 *
 * Exported because sequencing a passage around the sheet's departure used to
 * mean guessing — `SendSheet` carried its own `ANIMATION_DURATION = 300`,
 * which did not match this at all.
 */
export { SHEET_EXIT_MS };

export interface BottomSheetContainerProps extends BottomSheetContainerPropsBase {
  /** Whether to show the top fade gradient driven by scroll offset */
  showFadeGradient?: boolean;
  /**
   * RN Animated.Value representing the current scroll offset.
   * Required (and used) only when showFadeGradient is true.
   * Drive it by calling `.setValue(offset)` inside your onScroll handler.
   */
  scrollOffsetValue?: Animated.Value;
  /**
   * Absolute `top` position for the fade gradient.
   * Must account for handle height + title/header height so the gradient
   * starts just below the drag area. Each sheet knows its own header
   * height, so this is the caller's responsibility.
   * Only meaningful when showFadeGradient is true.
   */
  fadeGradientTop?: number;
  /** Additional style for the sheet container */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional background element that replaces the sheet's default
   * thermocline ground — mounted absolutely behind everything else in the
   * sheet. Used when a sheet carries its own variant of the material
   * (e.g. the Receive sheet).
   */
  background?: React.ReactNode;
  /** Additional style for the drag area */
  dragAreaStyle?: StyleProp<ViewStyle>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * BottomSheetContainer – shared infrastructure for all bottom sheet modals.
 *
 * Encapsulates:
 *  - Slide-up/slide-down animation
 *  - Animated backdrop with tap-to-dismiss
 *  - Drag-to-dismiss pan gesture (header area only)
 *  - Android hardware back button handling
 *  - Drag handle bar
 *  - Optional title / custom header content
 *  - Optional top fade gradient (for scrollable content)
 *  - Thermocline ground (thick tier) unless the caller passes its own
 *    `background`
 *
 * @example
 * ```tsx
 * <BottomSheetContainer
 *   visible={visible}
 *   onClose={onClose}
 *   title="My Sheet"
 *   showFadeGradient
 *   scrollOffsetValue={topFadeOpacity}
 * >
 *   <MyContent />
 * </BottomSheetContainer>
 * ```
 */
export const BottomSheetContainer: React.FC<BottomSheetContainerProps> = ({
  visible,
  onClose,
  onClosed,
  children,
  title,
  headerContent,
  showFadeGradient = false,
  scrollOffsetValue,
  fadeGradientTop,
  style,
  background,
  dragAreaStyle,
  dismissible = true,
  maxHeight,
  height,
  testID,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { surface } = useSemantic();
  const blurTargetRef = useRef<View>(null);
  const [isRendered, setIsRendered] = useState(visible);

  // The ceiling a sheet opens with is the ceiling it keeps (owner,
  // 2026-09-16): whatever the app under it does while it is up — Home
  // leaving focus mode, a balance block floating back — the sheet does not
  // follow. The caller's `height` / `maxHeight` are read once, on the
  // render that shows the sheet, and released once it has left, so the next
  // opening measures afresh. Render-time setState, the same pattern the
  // shell uses: refs cannot be read during render.
  const [held, setHeld] = useState<{ height?: number; maxHeight?: number } | null>(null);
  if (visible && held === null) setHeld({ height, maxHeight });
  const sheetHeight = held ? held.height : height;
  const sheetMaxHeight = held ? held.maxHeight : maxHeight;

  // What this sheet is drawn at, for the sheets it opens: a nested sheet
  // reads it and rises to exactly this (`useParentSheetHeight`).
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const handleSheetLayout = useCallback((event: LayoutChangeEvent) => {
    setMeasuredHeight(event.nativeEvent.layout.height);
  }, []);

  // The thermocline is the sheet material: every sheet whose caller passes
  // no explicit `background` grounds on the thick tier — same fill-and-clip
  // geometry the Receive sheet pioneered. A caller with its own `background`
  // still wins.
  const resolvedBackground = background ?? <Thermocline tier="thick" style={styles.thermocline} />;

  // Where "gone" is: one sheet-height below its resting place, the way a
  // native sheet leaves (UIKit's sheet and Material's bottom sheet both
  // translate by their own height, so every sheet takes the same time to
  // go whatever its size — owner, 2026-09-17: the short Activity detail
  // read faster than the tall catalogue when both crossed the whole screen).
  // The first-ever rise starts from the screen's edge, before any layout.
  const restingBelow = sheetHeight ?? measuredHeight ?? SCREEN_HEIGHT;

  // Reanimated shared values for the sheet and backdrop
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // A sheet is a `rise`; its dismissal is an `ebb`, deliberately shorter,
  // because an exit is latency between a decision and its result. Under
  // reduce motion both resolve to 0 and the sheet is simply there or gone —
  // and the backdrop goes straight to its final scrim rather than sliding to
  // it, which is the parallel mapping, not a hole.
  const isReduceMotionEnabled = useReducedMotion();
  const enter = timing(motionMs.rise, isReduceMotionEnabled);
  const exit = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);

  // A fresh departure may report again.
  useEffect(() => {
    if (visible) closedReportedRef.current = false;
  }, [visible]);

  // Sequential, never stacked (see `SheetParentContext`): with a parent
  // sheet, this one rises only after the parent has slid down, draws no
  // backdrop of its own, and hands the parent back when it leaves. As a
  // parent, `yielded` keeps this sheet mounted, off-screen, backdrop up,
  // while its child is showing — even if it is dismissed meanwhile.
  const parent = useSheetParent();
  const [yielded, setYielded] = useState(false);
  const yieldedRef = useRef(false);
  // True from asking the parent to yield until giving its turn back.
  const holdsParentRef = useRef(false);
  const childEnterDelayMs = parent && !isReduceMotionEnabled ? SHEET_EXIT_MS : 0;

  // Worklet-safe close reference
  const closeSheet = useCallback(() => {
    onClose();
  }, [onClose]);

  const closedReportedRef = useRef(false);
  const completeClose = useCallback(() => {
    setIsRendered(false);
    setHeld(null);
    dragY.value = 0;
    backdropOpacity.value = 0;
    // Reported once per departure: the watchdog below and the animation's own
    // callback both land here, and whichever arrives second must stay quiet.
    if (closedReportedRef.current) return;
    closedReportedRef.current = true;
    onClosed?.();
    if (holdsParentRef.current) {
      holdsParentRef.current = false;
      parent?.releaseFromChild();
    }
  }, [dragY, backdropOpacity, onClosed, parent]);

  // What the stable handle and the open/close effect read at call time.
  const latest = useRef({
    visible,
    onClose,
    completeClose,
    parent,
    childEnterDelayMs,
    restingBelow,
    enter,
    exit,
  });
  latest.current = {
    visible,
    onClose,
    completeClose,
    parent,
    childEnterDelayMs,
    restingBelow,
    enter,
    exit,
  };
  const completeCloseLatest = useCallback(() => latest.current.completeClose(), []);

  // A child that unmounts while it still holds the parent's turn — the
  // detail sheet drops its content the moment it closes, and the explorer
  // picker inside it goes without ever running its exit — gives the turn
  // back on the way out, or the parent stays yielded with its backdrop up
  // (owner, 2026-09-17).
  useEffect(
    () => () => {
      if (holdsParentRef.current) latest.current.parent?.releaseFromChild();
    },
    []
  );

  // Animate in / out when `visible` changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      dragY.value = 0;
      const { parent: parentNow, childEnterDelayMs: delay } = latest.current;
      parentNow?.yieldToChild();
      holdsParentRef.current = parentNow !== null;
      translateY.value = withDelay(delay, withTiming(0, enter));
      if (!parentNow) backdropOpacity.value = withTiming(BACKDROP_OPACITY, enter);
    } else if (isRendered) {
      // A yielded parent waits for its child to leave (`releaseFromChild`).
      if (yieldedRef.current) return undefined;
      translateY.value = withTiming(restingBelow, exit, (finished) => {
        if (finished) {
          runOnJS(completeCloseLatest)();
        }
      });
      backdropOpacity.value = withTiming(0, exit);

      // The callback above only fires on `finished === true`: an animation
      // cancelled mid-exit — a re-show, a shared-value reassignment — used to
      // leave the sheet mounted with no way back. The watchdog closes it
      // anyway, a beat after the exit was due.
      const watchdog = setTimeout(
        completeCloseLatest,
        SHEET_EXIT_MS + SHEET_EXIT_WATCHDOG_GRACE_MS
      );
      return () => clearTimeout(watchdog);
    }
    return undefined;
    // Only the state that opens or closes re-runs this; the rest is read
    // through `latest`, so a parent render never restarts the rise — a nested
    // sheet used to rise and fall in a loop that way (owner, 2026-09-17).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isRendered]);

  // The parent's side of the handshake, for the sheet this one opens. One
  // object for the sheet's whole life: a child keys its open effect on it,
  // so it must not change identity with the caller's `onClose`.
  const parentHandle = useMemo<SheetParentHandle>(
    () => ({
      yieldToChild: () => {
        yieldedRef.current = true;
        setYielded(true);
        translateY.value = withTiming(latest.current.restingBelow, latest.current.exit);
      },
      releaseFromChild: () => {
        yieldedRef.current = false;
        setYielded(false);
        if (latest.current.visible) {
          translateY.value = withTiming(0, latest.current.enter);
          return;
        }
        // Dismissed while the child was up: the sheet is already down, so
        // only the backdrop has to go.
        backdropOpacity.value = withTiming(0, latest.current.exit);
        setTimeout(completeCloseLatest, SHEET_EXIT_MS + SHEET_EXIT_WATCHDOG_GRACE_MS);
      },
      dismissWithChild: () => latest.current.onClose(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissible) onClose();
      // Swallow the event either way: while non-dismissible the sheet stays.
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose, dismissible]);

  // Pan gesture – drag handle area only
  const panGesture = Gesture.Pan()
    .enabled(dismissible)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      // Only allow dragging downward
      if (event.translationY > 0) {
        dragY.value = event.translationY;
        if (parent) return;
        backdropOpacity.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT * 0.5],
          [BACKDROP_OPACITY, 0]
        );
      }
    })
    .onEnd((event) => {
      isDragging.value = false;
      if (event.translationY > DRAG_THRESHOLD || event.velocityY > 500) {
        translateY.value = withTiming(restingBelow, exit);
        if (!parent) backdropOpacity.value = withTiming(0, exit);
        runOnJS(closeSheet)();
      } else {
        dragY.value = withSpring(0, SPRING_CONFIG);
        if (!parent) backdropOpacity.value = withSpring(BACKDROP_OPACITY, SPRING_CONFIG);
      }
    });

  // A tap outside while typing means "put the keyboard away", not "leave":
  // the sheet closes on the next tap, once the field has let go.
  const handleBackdropPress = useCallback(() => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    if (!dismissible) return;
    onClose();
    // Under a child the backdrop is the parent's: a tap on it closes both.
    parent?.dismissWithChild();
  }, [onClose, dismissible, parent]);

  const handleRequestClose = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [onClose, dismissible]);

  // Animated styles
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isRendered) {
    return null;
  }

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
      // targetSdk 36 makes edge-to-edge mandatory, but an RN Modal is its own
      // window and does not inherit it: without this the sheet is inset by the
      // navigation bar and its backdrop stops short of the bottom edge.
      navigationBarTranslucent
      testID={testID}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.overlay}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <Reanimated.View
              style={[styles.backdrop, backdropAnimatedStyle]}
              testID={testID ? `${testID}-backdrop` : undefined}
              pointerEvents={visible ? 'auto' : 'none'}
            />
          </TouchableWithoutFeedback>

          {/* Sheet */}
          <Reanimated.View
            style={[
              styles.sheetContainer,
              // A ceiling in pixels, when the caller measured one: Home's
              // catalogue stops just below the Send / Receive / Activity row
              // instead of covering it.
              sheetMaxHeight != null && { maxHeight: sheetMaxHeight },
              // A fixed height, when the caller measured one: Home's
              // catalogue rises exactly to the sub-tab row however little it
              // has to show.
              sheetHeight != null && { height: sheetHeight },
              sheetAnimatedStyle,
              style,
            ]}
            onLayout={handleSheetLayout}
            accessibilityElementsHidden={yielded}
            importantForAccessibility={yielded ? 'no-hide-descendants' : 'auto'}
            testID={yielded ? 'sheet-yielded' : undefined}
          >
            {resolvedBackground}
            <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
              {/* No scales. Every sheet in the app mounts through here —
                  send, receive, seed backup, approval, settings — so this one
                  call site was painting the motif behind addresses, seed
                  words, inputs and amounts at once. */}
            </BlurTargetView>

            <SheetHeightContext.Provider value={sheetHeight ?? measuredHeight}>
              <SheetParentContext.Provider value={parentHandle}>
                <BlurTargetProvider value={blurTargetRef}>
                  {/* Draggable area: handle + header content */}
                  <GestureDetector gesture={panGesture}>
                    <Reanimated.View style={[styles.dragArea, dragAreaStyle]}>
                      {/* Drag handle bar */}
                      <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                      </View>

                      {/* Header: custom content wins, otherwise plain title */}
                      {headerContent ?? title ?? null}
                    </Reanimated.View>
                  </GestureDetector>

                  {/* Sheet body */}
                  {children}
                </BlurTargetProvider>
              </SheetParentContext.Provider>
            </SheetHeightContext.Provider>

            {/* Top fade gradient for scrollable content */}
            {showFadeGradient && scrollOffsetValue && (
              <Animated.View
                style={[
                  styles.topFadeGradient,
                  { opacity: scrollOffsetValue },
                  fadeGradientTop != null && { top: fadeGradientTop },
                ]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={[surface.raised, withAlpha(surface.raised, 0)]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            )}
          </Reanimated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.overlay.backdrop,
    },
    sheetContainer: {
      // The background element (thermocline by default) carries the material;
      // the container itself stays transparent.
      borderTopLeftRadius: borderRadius.header,
      borderTopRightRadius: borderRadius.header,
      // The edge follows the two top corners: a one-side border stops where
      // the curve starts, so the stroke is drawn on top and both sides
      // (the sides sit on the screen's own edge) and left off the bottom,
      // where the sheet meets the device (owner, 2026-09-17).
      borderWidth: borderWidth.sheet,
      borderBottomWidth: 0,
      borderColor: t.border.default,
      // No minHeight: a sheet hugs its content (a short receipt ends where it
      // ends); tall content is bounded by maxHeight and scrolls inside.
      maxHeight: '92%',
      ...shadows.sheet,
    },
    // The material fills the sheet and clips itself to the sheet's own top
    // corners.
    thermocline: {
      ...StyleSheet.absoluteFillObject,
      borderTopLeftRadius: borderRadius.header,
      borderTopRightRadius: borderRadius.header,
    },
    dragArea: {
      // Gesture is attached here; keep it empty so consumers can add dragAreaStyle
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: vs(spacing.md),
      paddingBottom: vs(spacing.sm),
    },
    handle: {
      width: s(HANDLE_WIDTH),
      height: vs(HANDLE_HEIGHT),
      borderRadius: borderRadius.full,
      backgroundColor: t.sheet.handle,
      opacity: componentSizes.sheetHandleOpacity,
    },
    topFadeGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      // Positioned by caller via absolute placement; default sits just below handle
      top: vs(spacing.md) + vs(8),
      height: componentSizes.sheetFadeGradientHeight,
      zIndex: 1,
    },
  });

export default BottomSheetContainer;
