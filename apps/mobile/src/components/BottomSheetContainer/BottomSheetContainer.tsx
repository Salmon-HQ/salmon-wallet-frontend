import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  BackHandler,
  Dimensions,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurTargetView } from 'expo-blur';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  shadows,
  borderRadius,
  borderWidth,
  componentSizes,
  motionMs,
  vs,
  s,
  spacing,
} from '@salmon/shared';
import { BlurTargetProvider } from '../BlurContainer';
import { Thermocline } from '../Thermocline';
import { curve, timing } from '../../utils/motion';

// ============================================================================
// Constants
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BACKDROP_OPACITY = 0.8;
const DRAG_THRESHOLD = 150;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

// ============================================================================
// Types
// ============================================================================

export interface BottomSheetContainerProps {
  /** Controls sheet visibility */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Content to render inside the sheet */
  children: React.ReactNode;
  /**
   * Optional title rendered below the handle, inside the drag area.
   * Mutually exclusive with headerContent – if both are provided,
   * headerContent takes precedence.
   */
  title?: React.ReactNode;
  /**
   * Optional custom header content that replaces the title.
   * The full row rendered inside the drag area (below the handle).
   */
  headerContent?: React.ReactNode;
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
  /**
   * Whether the sheet may be dismissed by backdrop tap, swipe-down, or the
   * Android hardware back button. Defaults to `true`.
   *
   * Set it to `false` while an irreversible operation is in flight. The
   * sheet's own Cancel/Confirm controls already disable themselves, but the
   * three dismissal paths live here and knew nothing about that state — so a
   * backdrop tap during signing unmounted the only screen that would ever
   * report whether the money moved. One guard here covers every sheet in the
   * app instead of each caller re-deriving it.
   */
  dismissible?: boolean;
  /** For testing */
  testID?: string;
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
  testID,
}) => {
  const blurTargetRef = useRef<View>(null);
  const [isRendered, setIsRendered] = useState(visible);

  // The thermocline is the sheet material: every sheet whose caller passes
  // no explicit `background` grounds on the thick tier — same fill-and-clip
  // geometry the Receive sheet pioneered. A caller with its own `background`
  // still wins.
  const resolvedBackground = background ?? <Thermocline tier="thick" style={styles.thermocline} />;

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

  // Worklet-safe close reference
  const closeSheet = useCallback(() => {
    onClose();
  }, [onClose]);

  const completeClose = useCallback(() => {
    setIsRendered(false);
    dragY.value = 0;
    backdropOpacity.value = 0;
  }, [dragY, backdropOpacity]);

  // Animate in / out when `visible` changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      dragY.value = 0;
      translateY.value = withTiming(0, enter);
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, enter);
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, exit, (finished) => {
        if (finished) {
          runOnJS(completeClose)();
        }
      });
      backdropOpacity.value = withTiming(0, exit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isRendered, completeClose]);

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
        translateY.value = withTiming(SCREEN_HEIGHT, exit);
        backdropOpacity.value = withTiming(0, exit);
        runOnJS(closeSheet)();
      } else {
        dragY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withSpring(BACKDROP_OPACITY, SPRING_CONFIG);
      }
    });

  const handleBackdropPress = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [onClose, dismissible]);

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
              pointerEvents={visible ? 'auto' : 'none'}
            />
          </TouchableWithoutFeedback>

          {/* Sheet */}
          <Reanimated.View style={[styles.sheetContainer, sheetAnimatedStyle, style]}>
            {resolvedBackground}
            <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
              {/* No scales. Every sheet in the app mounts through here —
                  send, receive, seed backup, approval, settings — so this one
                  call site was painting the motif behind addresses, seed
                  words, inputs and amounts at once. */}
            </BlurTargetView>

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
                  colors={[colors.background.secondary, 'transparent']}
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.sheet.backdrop,
  },
  sheetContainer: {
    // The background element (thermocline by default) carries the material;
    // the container itself stays transparent.
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
    borderTopWidth: borderWidth.sheet,
    borderTopColor: colors.border.default,
    minHeight: '70%',
    maxHeight: '92%',
    ...shadows.sheet,
  },
  // The material fills the sheet and clips itself to the sheet's own top
  // corners.
  thermocline: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: borderRadius.card,
    borderTopRightRadius: borderRadius.card,
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
    width: s(componentSizes.sheetHandleWidth),
    height: vs(componentSizes.sheetHandleHeight),
    borderRadius: borderRadius.full,
    backgroundColor: colors.sheet.handle,
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
