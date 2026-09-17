/**
 * UnderlineTabs — the product's one selection language for lateral choices.
 *
 * A horizontal set of mutually exclusive options: the selected one carries an
 * accent underline that slides from the previous option to the new one —
 * translateX and width driven by each tab's measured `onLayout`, so any number
 * of tabs just works with no hardcoded width. The label itself crossfades
 * weight and color between inactive (secondary, semibold) and active (primary,
 * bold) over the same `drift` beat — reduced motion collapses both to a snap
 * via `resolveMotionMs`, no special-casing needed at the call site.
 *
 * Two sizes, one behaviour: `md` for in-page sub-tabs (16pt labels), `sm` for
 * a filter row (11/700 uppercase). Nothing here fills or boxes the selected
 * option — see DESIGN.md §Navigation.
 *
 * **Static while it fits, a carousel when it does not.** The row measures its
 * own container alongside its tabs; when the labels plus their gaps overrun
 * the width they are given, the same row is handed to a horizontal
 * `ScrollView` — underline included, so the selection idiom is unchanged —
 * and the active tab is scrolled into view on every change. This is measured,
 * not a breakpoint: a wide phone holds still, a narrow one scrolls, and a
 * rotation or a font-scale change re-measures and flips either way. A row
 * whose parent does not constrain it (`alignSelf` rather than `flex: 1`)
 * measures its container as exactly its content and therefore never scrolls,
 * which is the correct answer for the filter rows.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  letterSpacing,
  lineHeight,
  motionEasing,
  motionMs,
  s,
  spacing,
  vs,
  withAlpha,
  type Semantic,
  overflowEdges,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { timing } from '../../utils/motion';
import { CHROME_SCALE, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import type { UnderlineTabsProps, UnderlineTabsSize } from './types';

const UNDERLINE_WIDTH = 48;
const UNDERLINE_HEIGHT = 2;

/**
 * The trailing cut in overflow mode. A hard edge reads as the end of the set;
 * a fade of at most one section step reads as "there is more this way".
 */
const OVERFLOW_FADE_WIDTH = spacing['2xl'];

/** How much of the previous tab stays visible when one is scrolled into view. */
const SCROLL_INTO_VIEW_MARGIN = spacing.md;

/** Sub-pixel slack before a row counts as overrunning its container, pt. */
const OVERFLOW_TOLERANCE = 1;

type SizeMetrics = {
  font: number;
  gap: number;
  uppercase: boolean;
  letterSpacing: number;
};

const SIZES: Record<UnderlineTabsSize, SizeMetrics> = {
  md: {
    font: fontSize.bodyLg,
    gap: spacing.xl,
    uppercase: false,
    letterSpacing: 0,
  },
  sm: {
    font: fontSize.caption,
    gap: spacing.md,
    uppercase: true,
    letterSpacing: letterSpacing.label,
  },
};

const AnimatedText = Animated.createAnimatedComponent(Text);

type TabLayoutMeasure = { x: number; width: number };

type TabMotion = Pick<ComponentProps<typeof Animated.View>, 'layout' | 'entering' | 'exiting'>;

interface UnderlineTabProps extends TabMotion {
  tabKey: string;
  label: string;
  isActive: boolean;
  isReduceMotionEnabled: boolean;
  metrics: SizeMetrics;
  testID?: string;
  onLayoutMeasured: (key: string, layout: TabLayoutMeasure) => void;
  onPress: () => void;
}

/**
 * One tab's label. Owns its own weight/color crossfade — kept per-tab so
 * each label's progress lives in its own shared value rather than a single
 * hook shared awkwardly across an array.
 */
const UnderlineTab: React.FC<UnderlineTabProps> = ({
  tabKey,
  label,
  isActive,
  isReduceMotionEnabled,
  metrics,
  testID,
  onLayoutMeasured,
  onPress,
  layout,
  entering,
  exiting,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, timing(motionMs.drift, isReduceMotionEnabled));
  }, [isActive, isReduceMotionEnabled, progress]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [text.secondary, text.primary]),
    // fontFamily cannot interpolate — the weight switches at the crossfade's
    // midpoint, timed alongside the color it lands with.
    fontFamily: progress.value > 0.5 ? fontFamilyNative.bold : fontFamilyNative.semiBold,
  }));

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      onLayoutMeasured(tabKey, { x, width });
    },
    [tabKey, onLayoutMeasured]
  );

  // The tab's own motion lives on this wrapper — the frame Reanimated
  // animates is the view that holds the prop — and so does the measurement,
  // so the underline reads the tab where the row finally puts it.
  return (
    <Animated.View
      layout={layout}
      entering={entering}
      exiting={exiting}
      onLayout={handleLayout}
      style={styles.tab}
    >
      <TouchableOpacity
        testID={testID}
        style={styles.tab}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <AnimatedText
          style={[
            {
              fontSize: s(metrics.font),
              lineHeight: s(metrics.font) * lineHeight.snug,
              letterSpacing: metrics.letterSpacing,
            },
            metrics.uppercase && styles.uppercase,
            animatedTextStyle,
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCap.chrome}
        >
          {label}
        </AnimatedText>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  size = 'md',
  tabTestIDPrefix,
  underlineTestID,
  settled = true,
  style,
  testID,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { water } = useSemantic();
  const isReduceMotionEnabled = useReducedMotion();
  const metrics = SIZES[size];

  const [layouts, setLayouts] = useState<Record<string, TabLayoutMeasure>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const hasMeasuredActive = useRef(false);
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(UNDERLINE_WIDTH);

  // A change in the SET of tabs moves only the tabs concerned (owner,
  // 2026-09-16): a tab that joins floats in where it lands, one that leaves
  // sinks out and the ones after it slide over on `layout`; a reorder is the
  // same slide. The first mount owes no verb — every tab is simply there —
  // so the entrance is armed only after it. State, not a ref: a ref cannot be
  // read during render.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  // A set still being read (`settled` false) changes without motion, the
  // same as the first mount: hydration owes no verb.
  const tabMotion: TabMotion = {
    layout:
      isReduceMotionEnabled || !settled
        ? undefined
        : LinearTransition.duration(motionMs.drift).easing(
            Easing.bezier(...motionEasing.current.native)
          ),
    entering:
      hasMounted && settled
        ? floatEntering(isReduceMotionEnabled, { scale: CHROME_SCALE, durationMs: motionMs.drift })
        : undefined,
    exiting: sinkExiting(isReduceMotionEnabled, { scale: CHROME_SCALE, durationMs: motionMs.ebb }),
  };

  const handleLayoutMeasured = useCallback((key: string, layout: TabLayoutMeasure) => {
    setLayouts((prev) => {
      const existing = prev[key];
      if (existing && existing.x === layout.x && existing.width === layout.width) {
        return prev;
      }
      return { ...prev, [key]: layout };
    });
  }, []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth((prev) => (prev === width ? prev : width));
  }, []);

  // RN's default `flexShrink` is 0, so a row that does not fit its parent
  // overflows rather than squeezing: every tab's measured width is its
  // natural one whether or not the set fits, which is what makes this
  // comparison stable in both modes instead of oscillating between them.
  const { contentWidth, isOverflowing } = useMemo(() => {
    const measured = tabs.map(({ key }) => layouts[key]);
    if (measured.some((layout) => !layout)) {
      return { contentWidth: 0, isOverflowing: false };
    }
    const width =
      measured.reduce((sum, layout) => sum + (layout?.width ?? 0), 0) +
      s(metrics.gap) * Math.max(tabs.length - 1, 0);
    // One point of tolerance: measured widths round, and a row that fits by
    // a fraction must not flip into a carousel.
    return {
      contentWidth: width,
      isOverflowing: containerWidth > 0 && width > containerWidth + OVERFLOW_TOLERANCE,
    };
  }, [tabs, layouts, metrics.gap, containerWidth]);

  useEffect(() => {
    const activeLayout = layouts[activeKey];
    if (!activeLayout) return;

    if (!hasMeasuredActive.current || !settled) {
      // First measurement — or one during hydration: land on it directly.
      underlineX.value = activeLayout.x;
      underlineWidth.value = activeLayout.width;
      hasMeasuredActive.current = true;
      return;
    }

    const config = timing(motionMs.drift, isReduceMotionEnabled);
    underlineX.value = withTiming(activeLayout.x, config);
    underlineWidth.value = withTiming(activeLayout.width, config);
  }, [activeKey, layouts, isReduceMotionEnabled, underlineX, underlineWidth, settled]);

  // In overflow mode the newly active tab may be off-screen — including the
  // one restored at mount — so the row brings it in rather than leaving the
  // underline to travel somewhere the user cannot see.
  useEffect(() => {
    if (!isOverflowing) return;
    const activeLayout = layouts[activeKey];
    if (!activeLayout) return;

    const maxOffset = Math.max(contentWidth - containerWidth, 0);
    const target = Math.min(Math.max(activeLayout.x - s(SCROLL_INTO_VIEW_MARGIN), 0), maxOffset);
    scrollRef.current?.scrollTo({ x: target, animated: !isReduceMotionEnabled });
  }, [activeKey, layouts, isOverflowing, contentWidth, containerWidth, isReduceMotionEnabled]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  }, []);

  // A fade only where content is hidden: none at the start while the row
  // rests on its first tab, none at the end once the last one is in view.
  const edges = overflowEdges({
    offset: scrollOffset,
    contentWidth,
    containerWidth,
    tolerance: OVERFLOW_TOLERANCE,
  });

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineWidth.value,
  }));

  const activeTab = tabs.find((tab) => tab.key === activeKey);

  const row = (
    <View style={[styles.tabs, { gap: s(metrics.gap) }]}>
      {tabs.map(({ key, label }) => (
        <UnderlineTab
          key={key}
          tabKey={key}
          label={label}
          isActive={key === activeKey}
          isReduceMotionEnabled={isReduceMotionEnabled}
          metrics={metrics}
          testID={tabTestIDPrefix ? `${tabTestIDPrefix}-${key}` : undefined}
          onLayoutMeasured={handleLayoutMeasured}
          onPress={() => handlePress(key)}
          {...tabMotion}
        />
      ))}
      <Animated.View
        testID={underlineTestID}
        style={[
          styles.underline,
          underlineStyle,
          activeTab?.underlineColor ? { backgroundColor: activeTab.underlineColor } : null,
        ]}
      />
    </View>
  );

  // One tree at both widths: the row always sits in a horizontal scroll view
  // that is only *enabled* once the measured tabs overrun the width the parent
  // gave it. Switching between a bare row and a scroll view remounted the
  // tabs (and their measurements) on every flip, and a horizontal scroll view
  // left to its defaults grew to fill the parent's height — on Activity it
  // swallowed the list under it (owner, on device, 2026-09-02). The scroll
  // view takes no vertical flex and hugs its content, so a caller that
  // aligns the row to the start gets a row exactly as wide as its tabs.
  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout} testID={testID}>
      <ScrollView
        ref={scrollRef}
        horizontal
        scrollEnabled={isOverflowing}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID={testID ? `${testID}-scroll` : undefined}
      >
        {row}
      </ScrollView>

      {/* The cut at the trailing edge: the ground arriving from nothing, so
          the row reads as continuing rather than as ending. The row sits
          near the top of the water ramp, so the ground it fades into is the
          ramp's top stop (spec 022: what tops the ground reads stop 0),
          never the flat `depth.column`. */}
      {isOverflowing && edges.leading && (
        <LinearGradient
          testID={testID ? `${testID}-fade-leading` : undefined}
          colors={[water.gradient[0], withAlpha(water.gradient[0], 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.leadingFade}
          pointerEvents="none"
        />
      )}
      {isOverflowing && edges.trailing && (
        <LinearGradient
          testID={testID ? `${testID}-fade` : undefined}
          colors={[withAlpha(water.gradient[0], 0), water.gradient[0]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.trailingFade}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      position: 'relative',
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      flexGrow: 0,
    },
    tabs: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      position: 'relative',
      paddingBottom: vs(spacing.xxs) + vs(UNDERLINE_HEIGHT),
    },
    tab: {
      alignItems: 'center',
    },
    uppercase: {
      textTransform: 'uppercase',
    },
    underline: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: vs(UNDERLINE_HEIGHT),
      borderRadius: borderRadius.r1,
      backgroundColor: t.accent.fill,
    },
    trailingFade: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      width: s(OVERFLOW_FADE_WIDTH),
    },
    leadingFade: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: s(OVERFLOW_FADE_WIDTH),
    },
  });

export default UnderlineTabs;
