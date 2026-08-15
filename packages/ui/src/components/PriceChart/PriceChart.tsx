/**
 * PriceChart - Token price history chart component
 *
 * Web version using recharts and MUI for browser extension
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import type { PriceChartPeriod, PriceDataPoint } from '@salmon/shared';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  fontFamily,
  fontWeight,
  formatFiatIntl,
  isPositivePerformance,
  PRICE_CHART_PERIODS,
  spacing,
  useCurrencyContext,
  fontSize,
  shadowsCSS,
  durationMs,
  tabularNums,
  semantic,
} from '@salmon/shared';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { styled } from '../../utils/styled';
import type { PriceChartProps } from './types';

/**
 * Default colors for positive/negative performance
 */
const CHART_COLORS = {
  positive: colors.status.success,
  negative: colors.status.error,
} as const;

// formatPrice is defined inside the component to use currency context

/**
 * Format timestamp for tooltip display
 */
const formatTimestamp = (timestamp: number, locale?: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const Container = styled(Box)({
  backgroundColor: 'transparent',
});

const ChartContainer = styled(Box)<{ $height: number }>(({ $height }) => ({
  width: '100%',
  height: $height,
  marginBottom: spacing.lg,
  borderRadius: borderRadius.md,
  overflow: 'hidden',
}));

const PeriodContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: spacing.xs,
});

const PeriodButton = styled(Button)<{ $selected?: boolean }>(({ $selected }) => ({
  ...tabularNums.css,
  minWidth: componentSizes.backButtonSize,
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: borderRadius.full,
  // The selected period is a *state*, so it takes warm ink on the accent tint
  // rather than a hard white puck. `accent.tint` is a tinted ground that sits
  // under salmon ink (5.29:1 composite), not a salmon fill — the one-fill rule
  // is untouched and the chart keeps its own fill budget free.
  backgroundColor: $selected ? semantic.accent.tint : 'transparent',
  color: $selected ? semantic.text.accent : colors.text.secondary,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: $selected ? semantic.accent.tintHover : colors.card.border,
  },
}));

const SkeletonContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: spacing.xs,
});

const EmptyState = styled(Box)<{ $height: number }>(({ $height }) => ({
  height: $height,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const EmptyStateText = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
});

const TooltipContainer = styled(Box)({
  backgroundColor: colors.background.primary,
  borderRadius: borderRadius.md,
  padding: spacing.sm,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  boxShadow: shadowsCSS.lg,
});

const TooltipPrice = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.xxs,
});

const TooltipDate = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

/**
 * Custom tooltip component for the chart
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PriceDataPoint;
    value: number;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const [{ currency }] = useCurrencyContext();
  const { i18n } = useTranslation();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <TooltipContainer>
      <TooltipPrice>{formatFiatIntl(data.price, currency)}</TooltipPrice>
      <TooltipDate>{formatTimestamp(data.timestamp, i18n.language)}</TooltipDate>
    </TooltipContainer>
  );
}

/**
 * ChartSkeleton - Loading placeholder for the chart
 */
function ChartSkeleton({ height }: { height: number }) {
  return (
    <Skeleton
      variant="rounded"
      width="100%"
      height={height}
      sx={{ backgroundColor: colors.skeleton.base }}
    />
  );
}

/**
 * PeriodSelectorSkeleton - Loading placeholder for period buttons
 */
function PeriodSelectorSkeleton() {
  return (
    <SkeletonContainer>
      {PRICE_CHART_PERIODS.map((_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          width={42}
          height={28}
          sx={{
            backgroundColor: colors.skeleton.base,
            borderRadius: borderRadius.full,
          }}
        />
      ))}
    </SkeletonContainer>
  );
}

/**
 * PriceChart component for displaying token price history
 *
 * Features:
 * - Line chart with gradient fill using recharts
 * - Time period selector (1H, 1D, 1W, 1M, 3M, 1Y, All)
 * - Color changes based on period performance
 * - Loading state with skeleton
 * - Custom tooltip with price and timestamp
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
export function PriceChart({
  data,
  selectedPeriod,
  onPeriodChange,
  loading = false,
  error = false,
  color,
  height = componentSizes.chartHeight,
  style,
  className,
}: PriceChartProps) {
  const { t } = useTranslation();
  // Determine chart color based on performance
  const chartColor = useMemo(() => {
    if (color) return color;
    return isPositivePerformance(data) ? CHART_COLORS.positive : CHART_COLORS.negative;
  }, [data, color]);

  // Generate gradient ID unique to this instance (useId for stable IDs)
  const gradientId = useId().replace(/:/g, '') + 'priceChartGradient';

  // Handle period selection
  const handlePeriodPress = useCallback(
    (period: PriceChartPeriod) => {
      onPeriodChange(period);
    },
    [onPeriodChange]
  );

  return (
    <Container style={style} className={className}>
      {/* Chart area */}
      <ChartContainer $height={height}>
        {loading ? (
          <ChartSkeleton height={height} />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: colors.text.secondary,
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                animationDuration={durationMs.debounce}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState $height={height}>
            <EmptyStateText data-testid={error ? 'price-chart-error' : undefined}>
              {error
                ? t('token.chart.loadError', "Couldn't load chart data")
                : t('token.chart.noData', 'No data available')}
            </EmptyStateText>
          </EmptyState>
        )}
      </ChartContainer>

      {/* Period selector */}
      {loading ? (
        <PeriodSelectorSkeleton />
      ) : (
        <PeriodContainer>
          {PRICE_CHART_PERIODS.map((period) => {
            const isSelected = period === selectedPeriod;
            return (
              <PeriodButton
                key={period}
                $selected={isSelected}
                onClick={() => handlePeriodPress(period)}
                aria-label={t('accessibility.select_period', 'Select {{period}} time period', {
                  period,
                })}
                aria-pressed={isSelected}
              >
                {period}
              </PeriodButton>
            );
          })}
        </PeriodContainer>
      )}
    </Container>
  );
}
