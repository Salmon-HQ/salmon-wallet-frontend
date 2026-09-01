import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  spacing,
  isPositivePerformance,
  PRICE_CHART_PERIODS,
  fontSize,
  motionMs,
  opacity,
  s,
  type Semantic,
} from '@salmon/shared';
import { curve, timing } from '../../utils/motion';
import type { PriceChartPeriod, PriceDataPoint } from '@salmon/shared';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { ShimmerRect } from '../ShimmerRect';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PriceChartProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** The current-price point at the right tip — the `.pen`'s dot and its halo. */
const ENDPOINT_DOT_RADIUS = 3.5;
const ENDPOINT_HALO_RADIUS = 9;
/**
 * The pulse's config, built once at module scope. Reanimated worklets must not
 * allocate a fresh easing object per frame — `timing()` returns one holding an
 * `Easing` instance, and constructing it inside a worklet crashes.
 */
// Reduce motion is handled by not looping at all, so the flag is false here.
const PULSE_TIMING = timing(motionMs.tide, false, curve.settle);

/**
 * Default colors for positive/negative performance
 */
const chartColorsFor = (t: Semantic) => ({
  positive: t.status.success,
  negative: t.status.danger,
});

/**
 * Calculate min and max values from data
 */
const getDataBounds = (data: PriceDataPoint[]): { min: number; max: number } => {
  if (data.length === 0) return { min: 0, max: 0 };

  let min = data[0].price;
  let max = data[0].price;

  for (const point of data) {
    if (point.price < min) min = point.price;
    if (point.price > max) max = point.price;
  }

  // Add padding to bounds
  const padding = (max - min) * 0.1;
  return {
    min: min - padding,
    max: max + padding,
  };
};

/**
 * Fixed sample count for the animated curve. Every period's series is
 * resampled to this many points so two periods always yield same-length
 * arrays — which is what makes the curve *interpolable* when the range
 * changes, instead of a hard swap.
 */
const RESAMPLE_POINTS = 64;

/**
 * Resample a series to `RESAMPLE_POINTS` y-pixel values (linear interpolation
 * over the index space, already scaled into chart coordinates).
 */
export const resampleYs = (
  data: PriceDataPoint[],
  height: number,
  bounds: { min: number; max: number }
): number[] => {
  if (data.length === 0) return [];

  const { min, max } = bounds;
  const range = max - min || 1;
  const ys: number[] = [];

  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    const pos = data.length === 1 ? 0 : (i / (RESAMPLE_POINTS - 1)) * (data.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, data.length - 1);
    const frac = pos - lo;
    const price = data[lo].price + (data[hi].price - data[lo].price) * frac;
    ys.push(height - ((price - min) / range) * height);
  }

  return ys;
};

/**
 * Build the smooth quadratic-bezier line path from resampled y values.
 * Runs on the UI thread during the period transition, hence the worklet.
 */
export const buildLinePath = (ys: number[], width: number): string => {
  'worklet';
  if (ys.length === 0) return '';

  const step = width / (ys.length - 1);
  let path = `M 0 ${ys[0]}`;

  for (let i = 1; i < ys.length; i++) {
    const prevX = (i - 1) * step;
    const midX = prevX + step / 2;
    path += ` Q ${prevX} ${ys[i - 1]} ${midX} ${(ys[i - 1] + ys[i]) / 2}`;
  }

  path += ` L ${width} ${ys[ys.length - 1]}`;
  return path;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * ChartSkeleton - Loading placeholder for the chart
 */
const ChartSkeleton: React.FC<{ height: number; width: number }> = ({ height, width }) => (
  <ShimmerRect width={width} height={height} borderRadius={0} />
);

/**
 * PeriodSelectorSkeleton - Loading placeholder for period buttons
 */
const PeriodSelectorSkeleton: React.FC = () => {
  const buttonWidth = 36;
  const buttonHeight = 24;
  const styles = useThemedStyles(stylesFor);

  return (
    <View style={styles.periodContainer}>
      {PRICE_CHART_PERIODS.map((period) => (
        <ShimmerRect key={period} width={buttonWidth} height={buttonHeight} borderRadius={12} />
      ))}
    </View>
  );
};

/**
 * PriceChart component for displaying token price history
 *
 * Features:
 * - Full-width line chart with gradient fill (edge to edge)
 * - Time period selector centered below the chart
 * - Color changes based on period performance
 * - Loading state with skeleton
 *
 * CoinGecko Free Tier periods: 1H, 1D, 1W, 1M, 3M, 1Y
 * (All period requires paid tier)
 *
 * @example
 * ```tsx
 * const priceData = [
 *   { timestamp: 1704067200000, price: 100.50 },
 *   { timestamp: 1704153600000, price: 102.30 },
 *   // ... more data points
 * ];
 *
 * <PriceChart
 *   data={priceData}
 *   selectedPeriod="1D"
 *   onPeriodChange={(period) => setPeriod(period)}
 *   loading={false}
 * />
 * ```
 */
export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  selectedPeriod,
  onPeriodChange,
  loading = false,
  error = false,
  color,
  height = 200,
  style,
  bleed = false,
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const CHART_COLORS = useMemo(() => chartColorsFor(semantic), [semantic]);
  // Edge to edge. `bleed` is the home Bitcoin column's variant: the chart
  // escapes the column's left gutter to sit on the physical screen edge and
  // stops one gutter short of the right one, so the curve reads as water
  // running off the left of the screen rather than as one more inset card.
  const chartWidth = bleed ? SCREEN_WIDTH - spacing.screenGutter : SCREEN_WIDTH;
  const chartHeight = height;
  // The line stops a halo short of the box so the endpoint's glow is not
  // clipped by the container (which hides overflow to keep the fill inside).
  const lineWidth = chartWidth - ENDPOINT_HALO_RADIUS;

  // Determine chart color based on performance
  const chartColor = useMemo(() => {
    if (color) return color;
    return isPositivePerformance(data) ? CHART_COLORS.positive : CHART_COLORS.negative;
  }, [data, color, CHART_COLORS]);

  // Calculate data bounds
  const bounds = useMemo(() => getDataBounds(data), [data]);

  // Resample the series to a fixed point count so period-to-period curves
  // are interpolable, then morph between them on the UI thread.
  const isReduceMotionEnabled = useReducedMotion();
  const targetYs = useMemo(
    () => resampleYs(data, chartHeight, bounds),
    [data, chartHeight, bounds]
  );

  const fromYs = useSharedValue<number[]>(targetYs);
  const toYs = useSharedValue<number[]>(targetYs);
  const progress = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (targetYs.length === 0 || toYs.value.length !== targetYs.length) {
      // Nothing to morph between (empty ↔ data): snap.
      fromYs.value = targetYs;
      toYs.value = targetYs;
      progress.value = 1;
      return;
    }
    fromYs.value = toYs.value;
    toYs.value = targetYs;
    progress.value = 0;
    // A period change is an in-place layout change of the same element, so it
    // takes `drift` on the default curve. Reduce motion resolves it to 0ms —
    // the previous hard swap.
    progress.value = withTiming(1, timing(motionMs.drift, isReduceMotionEnabled));
  }, [targetYs, isReduceMotionEnabled, fromYs, toYs, progress]);

  const lineD = useDerivedValue(() => {
    const to = toYs.value;
    if (to.length === 0) return '';
    const from = fromYs.value.length === to.length ? fromYs.value : to;
    const p = progress.value;
    const ys = new Array<number>(to.length);
    for (let i = 0; i < to.length; i++) {
      ys[i] = from[i] + (to[i] - from[i]) * p;
    }
    return buildLinePath(ys, lineWidth);
  });

  // The last resampled y, so the dot rides the same morph as the line.
  const endpointY = useDerivedValue(() => {
    const to = toYs.value;
    if (to.length === 0) return 0;
    const from = fromYs.value.length === to.length ? fromYs.value : to;
    const i = to.length - 1;
    return from[i] + (to[i] - from[i]) * progress.value;
  });

  // One shared value drives both halo props. Reduce motion rests it at the
  // visible end (1) instead of looping — the point still reads as "now".
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isReduceMotionEnabled) {
      pulse.value = 1;
      return;
    }
    pulse.value = 1;
    pulse.value = withRepeat(withTiming(0, PULSE_TIMING), -1, true);
  }, [isReduceMotionEnabled, pulse]);

  const dotAnimatedProps = useAnimatedProps(() => ({ cy: endpointY.value }));
  const haloAnimatedProps = useAnimatedProps(() => ({
    cy: endpointY.value,
    r: ENDPOINT_DOT_RADIUS + (ENDPOINT_HALO_RADIUS - ENDPOINT_DOT_RADIUS) * pulse.value,
    opacity: opacity.faint * (1 - pulse.value),
  }));

  const lineAnimatedProps = useAnimatedProps(() => ({ d: lineD.value }));
  const areaAnimatedProps = useAnimatedProps(() => ({
    d:
      lineD.value === ''
        ? ''
        : `${lineD.value} L ${lineWidth} ${chartHeight} L 0 ${chartHeight} Z`,
  }));

  // Built here, not at module scope: tests mock the shared barrel partially.
  const periodTabs = useMemo(
    () => PRICE_CHART_PERIODS.map((period) => ({ key: period, label: period })),
    []
  );

  // Handle period selection
  const handlePeriodPress = useCallback(
    (period: PriceChartPeriod) => {
      onPeriodChange(period);
    },
    [onPeriodChange]
  );

  return (
    <View
      style={[
        styles.wrapper,
        { width: chartWidth },
        bleed && { marginLeft: -spacing.screenGutter },
        style,
      ]}
    >
      {/* Chart area - full width */}
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        {loading ? (
          <ChartSkeleton height={chartHeight} width={chartWidth} />
        ) : data.length > 0 ? (
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={chartColor} stopOpacity={0.3} />
                <Stop offset="1" stopColor={chartColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* Area fill — morphs with the line so the gradient never flickers */}
            <AnimatedPath animatedProps={areaAnimatedProps} fill="url(#areaGradient)" />

            {/* Line */}
            <AnimatedPath
              animatedProps={lineAnimatedProps}
              stroke={chartColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current price point: the halo breathes, the dot holds. */}
            <AnimatedCircle
              animatedProps={haloAnimatedProps}
              cx={lineWidth}
              fill={chartColor}
            />
            <AnimatedCircle
              animatedProps={dotAnimatedProps}
              cx={lineWidth}
              r={ENDPOINT_DOT_RADIUS}
              fill={chartColor}
            />
          </Svg>
        ) : (
          <View style={styles.emptyState} testID={error ? 'price-chart-error' : undefined}>
            <Text style={styles.emptyStateText}>
              {error
                ? t('token.chart.loadError', "Couldn't load chart data")
                : t('token.chart.noData', 'No data available')}
            </Text>
          </View>
        )}
      </View>

      {/* Period selector - centered below chart */}
      {loading ? (
        <PeriodSelectorSkeleton />
      ) : (
        // Selection is an underline, never a pill (DESIGN.md §Selection):
        // the same travelling rule the sub-tabs and the activity filters use.
        <UnderlineTabs
          size="sm"
          tabs={periodTabs}
          activeKey={selectedPeriod}
          onChange={(key) => handlePeriodPress(key as PriceChartPeriod)}
          tabTestIDPrefix="price-chart-period"
          style={styles.periodTabs}
        />
      )}
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    wrapper: {
      width: SCREEN_WIDTH,
    },
    chartContainer: {
      width: SCREEN_WIDTH,
      overflow: 'hidden',
    },
    periodContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    periodTabs: {
      alignSelf: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateText: {
      fontSize: s(fontSize.body),
      color: t.text.secondary,
    },
  });

export default PriceChart;
