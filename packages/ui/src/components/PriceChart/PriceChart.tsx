/**
 * PriceChart — a token's price history, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PriceChart/PriceChart.tsx`,
 * on the same `PriceChartPropsBase`: a full-width line over a gradient fill,
 * the current-price point at the right tip with a breathing halo, and the
 * period selector under it as `UnderlineTabs` — an underline, never a pill
 * (DESIGN.md §Selection). Colour follows the period's performance:
 * `status.success` up, `status.danger` down.
 *
 * Every period's series is resampled to a fixed point count so two periods
 * yield same-length paths; the line morphs between them on the `drift` beat
 * (CSS transitions the `d` property where the engine supports it, and snaps
 * elsewhere), which is mobile's Reanimated morph on the DOM. A period whose
 * series is still in flight attenuates the drawn one (`pending`) rather than
 * collapsing it to a skeleton. Reduce motion collapses both to a step.
 */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  isPositivePerformance,
  motionDuration,
  motionEasing,
  motionMs,
  opacity,
  PRICE_CHART_PERIODS,
  resolveMotionDuration,
  spacing,
  type PriceChartPeriod,
  type Semantic,
  buildLinePath,
  getDataBounds,
  resampleYs,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { injectKeyframes } from '../../utils/injectKeyframes';
import { ShimmerRect } from '../ShimmerRect';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PriceChartProps } from './types';

/** The current-price point at the right tip — the `.pen`'s dot and its halo. */
const ENDPOINT_DOT_RADIUS = 3.5;
const ENDPOINT_HALO_RADIUS = 9;

/** The chart's default height — mobile's. */
const DEFAULT_HEIGHT = 200;

/** Width assumed until the container has been measured — a side panel's floor. */
const UNMEASURED_WIDTH = 320;

const PULSE_KEYFRAMES = 'sw-price-chart-pulse';

const chartColorsFor = (t: Semantic) => ({
  positive: t.status.success,
  negative: t.status.danger,
});

/** The container's width, live — the chart is edge to edge in whatever holds it. */
function useMeasuredWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(UNMEASURED_WIDTH);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const next = node.getBoundingClientRect().width;
      if (next > 0) setWidth(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function PriceChart({
  data,
  selectedPeriod,
  onPeriodChange,
  loading = false,
  pending = false,
  error = false,
  color,
  height = DEFAULT_HEIGHT,
  style,
  className,
}: PriceChartProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartWidth = useMeasuredWidth(wrapperRef);
  const gradientId = `${useId().replace(/:/g, '')}-price-chart-fill`;

  // The line stops a halo short of the box so the endpoint's glow is not
  // clipped by the container (which hides overflow to keep the fill inside).
  const lineWidth = Math.max(chartWidth - ENDPOINT_HALO_RADIUS, 0);

  const chartColor = useMemo(() => {
    if (color) return color;
    const palette = chartColorsFor(semantic);
    return isPositivePerformance(data) ? palette.positive : palette.negative;
  }, [data, color, semantic]);

  const bounds = useMemo(() => getDataBounds(data), [data]);
  const ys = useMemo(() => resampleYs(data, height, bounds), [data, height, bounds]);
  const lineD = useMemo(() => buildLinePath(ys, lineWidth), [ys, lineWidth]);
  const areaD = lineD === '' ? '' : `${lineD} L ${lineWidth} ${height} L 0 ${height} Z`;
  const endpointY = ys.length > 0 ? ys[ys.length - 1] : 0;

  useEffect(() => {
    injectKeyframes(
      PULSE_KEYFRAMES,
      `@keyframes ${PULSE_KEYFRAMES} {
        from { r: ${ENDPOINT_HALO_RADIUS}px; opacity: 0; }
        to { r: ${ENDPOINT_DOT_RADIUS}px; opacity: ${opacity.faint}; }
      }`
    );
  }, []);

  // A period change is an in-place layout change of the same element, so it
  // takes `drift` on the default curve; reduce motion resolves it to a step.
  const morph = `${resolveMotionDuration(motionDuration.drift, reduceMotion)} ${motionEasing.current.css}`;
  const attenuate = `opacity ${resolveMotionDuration(motionDuration.swell, reduceMotion)} ${motionEasing.current.css}`;

  const periodTabs = useMemo(
    () => PRICE_CHART_PERIODS.map((period) => ({ key: period, label: period })),
    []
  );
  const handlePeriodChange = useCallback(
    (key: string) => onPeriodChange(key as PriceChartPeriod),
    [onPeriodChange]
  );

  return (
    <div
      ref={wrapperRef}
      data-testid="price-chart"
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, ...style }}
      className={className}
    >
      <div
        aria-busy={pending || loading}
        style={{
          width: '100%',
          height,
          overflow: 'hidden',
          // The old series attenuates while the new one is in flight — it is
          // never taken away.
          opacity: pending && !loading ? opacity.faint : opacity.full,
          transition: attenuate,
        }}
      >
        {loading ? (
          <ShimmerRect width={chartWidth} height={height} borderRadius={0} />
        ) : data.length > 0 ? (
          <svg
            data-testid="price-chart-line"
            width={chartWidth}
            height={height}
            viewBox={`0 0 ${chartWidth} ${height}`}
            role="img"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="1" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Area fill — morphs with the line so the gradient never flickers */}
            <path
              d={areaD}
              fill={`url(#${gradientId})`}
              style={{ transition: `d ${morph}`, d: `path("${areaD}")` } as React.CSSProperties}
            />
            <path
              d={lineD}
              stroke={chartColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: `d ${morph}`, d: `path("${lineD}")` } as React.CSSProperties}
            />
            {/* Current price point: the halo breathes, the dot holds. Reduce
                motion rests the halo at its visible end — the point still
                reads as "now". */}
            <circle
              cx={lineWidth}
              cy={endpointY}
              r={ENDPOINT_DOT_RADIUS}
              fill={chartColor}
              opacity={opacity.faint}
              style={{
                transition: `cy ${morph}`,
                animation: reduceMotion
                  ? 'none'
                  : `${PULSE_KEYFRAMES} ${motionMs.tide}ms ${motionEasing.settle.css} infinite alternate`,
              }}
            />
            <circle
              cx={lineWidth}
              cy={endpointY}
              r={ENDPOINT_DOT_RADIUS}
              fill={chartColor}
              style={{ transition: `cy ${morph}` }}
            />
          </svg>
        ) : (
          <div
            data-testid={error ? 'price-chart-error' : 'price-chart-empty'}
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fontFamily.sans,
              fontSize: fontSize.body,
              color: semantic.text.secondary,
            }}
          >
            {error
              ? t('token.chart.loadError', "Couldn't load chart data")
              : t('token.chart.noData', 'No data available')}
          </div>
        )}
      </div>

      {/* Period selector — centred under the chart. */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          {PRICE_CHART_PERIODS.map((period) => (
            <ShimmerRect key={period} width={36} height={24} borderRadius={12} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <UnderlineTabs
            size="sm"
            tabs={periodTabs}
            activeKey={selectedPeriod}
            onChange={handlePeriodChange}
            tabTestIDPrefix="price-chart-period"
          />
        </div>
      )}
    </div>
  );
}
