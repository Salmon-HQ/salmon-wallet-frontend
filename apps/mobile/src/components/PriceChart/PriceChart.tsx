import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ContentLoader, Rect } from '@salmon/shared';
import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  fontWeight,
  isPositivePerformance,
  PRICE_CHART_PERIODS,
  fontSize,
  motionMs,
  opacity,
  semantic,
} from '@salmon/shared';
import { timing } from '../../utils/motion';
import type { PriceChartPeriod, PriceDataPoint } from '@salmon/shared';
import type { PriceChartProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Default colors for positive/negative performance
 */
const CHART_COLORS = {
  positive: semantic.status.success,
  negative: semantic.status.danger,
} as const;

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

/**
 * ChartSkeleton - Loading placeholder for the chart
 */
const ChartSkeleton: React.FC<{ height: number; width: number }> = ({ height, width }) => {
  return (
    <ContentLoader
      speed={1.5}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      backgroundColor={colors.skeleton.base}
      foregroundColor={colors.skeleton.highlight}
    >
      <Rect x="0" y="0" rx="0" ry="0" width={width} height={height} />
    </ContentLoader>
  );
};

/**
 * PeriodSelectorSkeleton - Loading placeholder for period buttons
 */
const PeriodSelectorSkeleton: React.FC = () => {
  const buttonWidth = 36;
  const buttonHeight = 24;
  const gap = spacing.xs;
  const totalWidth = PRICE_CHART_PERIODS.length * (buttonWidth + gap) - gap;

  return (
    <View style={styles.periodContainer}>
      <ContentLoader
        speed={1.5}
        width={totalWidth}
        height={buttonHeight}
        viewBox={`0 0 ${totalWidth} ${buttonHeight}`}
        backgroundColor={colors.skeleton.base}
        foregroundColor={colors.skeleton.highlight}
      >
        {PRICE_CHART_PERIODS.map((_, index) => (
          <Rect
            key={index}
            x={index * (buttonWidth + gap)}
            y="0"
            rx="12"
            ry="12"
            width={buttonWidth}
            height={buttonHeight}
          />
        ))}
      </ContentLoader>
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
}) => {
  const { t } = useTranslation();
  // Full screen width for edge-to-edge chart
  const chartWidth = SCREEN_WIDTH;
  const chartHeight = height;

  // Determine chart color based on performance
  const chartColor = useMemo(() => {
    if (color) return color;
    return isPositivePerformance(data) ? CHART_COLORS.positive : CHART_COLORS.negative;
  }, [data, color]);

  // Calculate data bounds
  const bounds = useMemo(() => getDataBounds(data), [data]);

  // Resample the series to a fixed point count so period-to-period curves
  // are interpolable, then morph between them on the UI thread.
  const isReduceMotionEnabled = useReducedMotion();
  const targetYs = useMemo(() => resampleYs(data, chartHeight, bounds), [data, chartHeight, bounds]);

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
    return buildLinePath(ys, chartWidth);
  });

  const lineAnimatedProps = useAnimatedProps(() => ({ d: lineD.value }));
  const areaAnimatedProps = useAnimatedProps(() => ({
    d: lineD.value === '' ? '' : `${lineD.value} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`,
  }));

  // Handle period selection
  const handlePeriodPress = useCallback(
    (period: PriceChartPeriod) => {
      onPeriodChange(period);
    },
    [onPeriodChange]
  );

  return (
    <View style={[styles.wrapper, style]}>
      {/* Chart area - full width */}
      <View style={[styles.chartContainer, { height: chartHeight }]}>
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
        <View style={styles.periodContainer}>
          {PRICE_CHART_PERIODS.map((period) => {
            const isSelected = period === selectedPeriod;
            return (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton, isSelected && styles.periodButtonSelected]}
                onPress={() => handlePeriodPress(period)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'accessibility.select_period',
                  'Select {{period}} time period',
                  { period }
                )}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[styles.periodButtonText, isSelected && styles.periodButtonTextSelected]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  periodButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    minWidth: 35,
    alignItems: 'center',
  },
  periodButtonSelected: {
    // A selected period is a state, not an action: `accent.tint` is a tinted
    // ground under salmon ink (5.29:1 composite), not a fill, so the chart no
    // longer spends the screen's one salmon fill on a 35px puck.
    backgroundColor: semantic.accent.tint,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    opacity: opacity.soft,
    fontFamily: fontFamilyNative.bold,
  },
  periodButtonTextSelected: {
    // Full opacity: `opacity.soft` here would drag the ink below the 5.29:1
    // salmon measures on the tint composite.
    color: semantic.text.accent,
    opacity: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.base,
    color: colors.text.secondary,
  },
});

export default PriceChart;
