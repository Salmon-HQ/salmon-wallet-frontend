/**
 * The SKR tab as kit blocks (spec 040), built once so each twin only renders
 * the list (`BlockList`): the stake card, the daily estimate, the rewards,
 * and About SKR (price and supply).
 */
import type { KitBlock } from '../../types/ui/block-list';
import type { PillTone } from '../../types/ui/pill';
import type { PriceChartPropsBase } from '../../types/ui/price-chart';
import { formatLargeNumber, formatPercent } from '../../utils/formatting';
import type { SkrView } from './skrView';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** What CoinGecko says about SKR, already formatted where it is shown as is. */
export interface SkrMarket {
  logo?: string;
  price: string | null;
  /** The price change over the chart's period. */
  change: { label: string; tone: PillTone } | null;
  totalSupply: number | null;
  circulatingSupply: number | null;
}

export interface SkrScreenInput {
  state: 'loading' | 'error' | 'empty' | 'ready';
  view: SkrView | null;
  market: SkrMarket;
  chart: Omit<PriceChartPropsBase<never>, 'style'>;
  refresh: () => Promise<void> | void;
}

const SKR = 'SKR';

function stakeCard(view: SkrView, t: Translate): KitBlock {
  const blocks: KitBlock[] = [
    {
      kind: 'stats',
      key: 'staked',
      props: {
        items: [
          {
            key: 'staked',
            label: t('skr.stake.title'),
            value: view.staked.value,
            unit: SKR,
            caption: view.staked.caption,
            size: 'hero',
          },
        ],
      },
    },
    { kind: 'divider', key: 'staked-divider' },
    {
      kind: 'stats',
      key: 'split',
      props: {
        items: [
          {
            key: 'earned',
            label: t('skr.stake.earned'),
            value: view.earned.value,
            unit: SKR,
            caption: view.earned.caption,
            tone: 'positive',
          },
          {
            key: 'available',
            label: t('skr.stake.available'),
            value: view.available.value,
            unit: SKR,
            caption: view.available.caption,
          },
        ],
      },
    },
  ];
  if (view.unstaking) {
    blocks.push({
      kind: 'stats',
      key: 'unstaking',
      props: {
        items: [
          {
            key: 'amount',
            label: t('skr.stake.unstaking'),
            value: view.unstaking.value,
            unit: SKR,
          },
          { key: 'date', label: t('skr.stake.withdrawable'), value: view.unstaking.withdrawable },
        ],
      },
    });
  }
  for (const guardian of view.guardians) {
    blocks.push({
      kind: 'row',
      key: `guardian-${guardian.key}`,
      props: {
        tone: 'ink',
        leading: { icon: 'ShieldCheck' },
        title: guardian.name,
        ...(guardian.commission ? { subtitle: guardian.commission } : {}),
        ...(guardian.active === null
          ? {}
          : {
              pill: guardian.active
                ? { label: t('skr.guardian.active'), tone: 'success' as const, dot: true }
                : { label: t('skr.guardian.inactive'), tone: 'neutral' as const, dot: true },
            }),
      },
    });
  }
  return { kind: 'card', key: 'stake', props: { testID: 'skr-stake', tone: 'featured' }, blocks };
}

function dailyBlocks(view: SkrView, t: Translate): KitBlock[] {
  const items = [
    ...(view.perDay
      ? [
          {
            key: 'per-day',
            label: t('skr.daily.perDay'),
            value: view.perDay.value,
            unit: SKR,
            caption: view.perDay.caption,
            tone: 'positive' as const,
          },
        ]
      : []),
    ...(view.days === null
      ? []
      : [
          {
            key: 'days',
            label: t('skr.daily.stakedFor'),
            value: String(view.days),
            unit: t('skr.daily.days', { count: view.days }),
          },
        ]),
  ];
  if (items.length === 0) return [];
  return [
    {
      kind: 'label',
      key: 'daily-title',
      props: {
        variant: 'title',
        children: t('skr.daily.title'),
        ...(view.perDay ? { trailing: t('skr.daily.estimate') } : {}),
      },
    },
    {
      kind: 'card',
      key: 'daily',
      props: {},
      blocks: [{ kind: 'stats', key: 'daily-stats', props: { items } }],
    },
  ];
}

function rewardBlocks(view: SkrView, t: Translate): KitBlock[] {
  return [
    {
      kind: 'label',
      key: 'rewards-title',
      props: {
        variant: 'title',
        children: t('skr.rewards.title'),
        trailing: view.earnedTotal,
        trailingTone: 'positive',
      },
    },
    ...(view.history.length > 0
      ? view.history.map((row): KitBlock => ({
          kind: 'row',
          key: row.key,
          props: {
            leading: { icon: 'Gift' },
            title: row.date,
            subtitle: t('skr.rewards.recorded'),
            value: { value: row.value, caption: row.caption },
          },
        }))
      : [
          {
            kind: 'state',
            key: 'history-empty',
            props: { testID: 'skr-history-empty', tone: 'empty', title: t('skr.history.empty') },
          } satisfies KitBlock,
        ]),
  ];
}

function aboutBlocks(
  view: SkrView,
  market: SkrMarket,
  chart: SkrScreenInput['chart'],
  t: Translate
): KitBlock[] {
  // The price is not boxed: the chart keeps the token screen's own look.
  const price: KitBlock[] = [
    {
      kind: 'stats',
      key: 'price',
      props: {
        items: [
          {
            key: 'price',
            label: t('skr.about.price'),
            value: market.price ?? '-',
            size: 'hero',
            ...(market.change ? { pill: market.change } : {}),
          },
        ],
      },
    },
    { kind: 'chart', key: 'chart', props: chart },
  ];
  const supply: KitBlock[] = [];
  if (market.totalSupply !== null || market.circulatingSupply !== null) {
    supply.push({
      kind: 'stats',
      key: 'supply-figures',
      props: {
        items: [
          {
            key: 'total',
            label: t('skr.about.totalSupply'),
            value: formatLargeNumber(market.totalSupply),
          },
          {
            key: 'circulating',
            label: t('skr.about.circulating'),
            value: formatLargeNumber(market.circulatingSupply),
          },
        ],
      },
    });
  }
  if (view.totalStaked !== null) {
    const share = market.circulatingSupply ? view.totalStaked / market.circulatingSupply : null;
    if (supply.length > 0) supply.push({ kind: 'divider', key: 'supply-divider' });
    supply.push({
      kind: 'stats',
      key: 'network-staked',
      props: {
        items: [
          {
            key: 'staked',
            label: t('skr.about.staked'),
            value: formatLargeNumber(view.totalStaked),
            unit: SKR,
            ...(share === null
              ? {}
              : {
                  note: {
                    text: t('skr.about.ofCirculating', { value: formatPercent(share * 100) }),
                    tone: 'accent' as const,
                  },
                }),
          },
        ],
      },
    });
    if (share !== null && market.circulatingSupply !== null) {
      supply.push({
        kind: 'progress',
        key: 'staked-share',
        props: {
          value: share,
          startLabel: t('skr.about.stakedLegend', { value: formatLargeNumber(view.totalStaked) }),
          endLabel: t('skr.about.liquidLegend', {
            value: formatLargeNumber(Math.max(0, market.circulatingSupply - view.totalStaked)),
          }),
          accessibilityLabel: t('skr.about.shareLabel'),
        },
      });
    }
  }
  return [
    {
      kind: 'label',
      key: 'about-title',
      props: { variant: 'title', children: t('skr.about.title') },
    },
    ...price,
    ...(supply.length > 0
      ? [{ kind: 'card', key: 'supply', props: {}, blocks: supply } satisfies KitBlock]
      : []),
  ];
}

export function skrBlocks(
  { state, view, market, chart, refresh }: SkrScreenInput,
  t: Translate
): KitBlock[] {
  if (state === 'loading') {
    return [
      { kind: 'skeleton', key: 'loading', props: { testID: 'skr-loading', count: 4, lines: 2 } },
    ];
  }
  if (state === 'error' || !view) {
    return [
      {
        kind: 'state',
        key: 'error',
        props: {
          testID: 'skr-error',
          tone: 'error',
          title: t('skr.error.title'),
          onRetry: () => void refresh(),
          retryLabel: t('actions.retry'),
        },
      },
    ];
  }
  if (state === 'empty') {
    return [
      {
        kind: 'state',
        key: 'empty',
        props: {
          testID: 'skr-empty',
          tone: 'empty',
          title: t('skr.empty.title'),
          body: t('skr.empty.body'),
        },
      },
    ];
  }
  return [
    {
      kind: 'row',
      key: 'header',
      props: {
        testID: 'skr-header',
        leading: { token: { uri: market.logo, symbol: SKR } },
        title: SKR,
        subtitle: t('skr.header.subtitle'),
        // The tab's own heading, laid out as a row but not boxed as one.
        tone: 'clear',
        padding: 'none',
        emphasis: 'strong',
        ...(view.apy
          ? { pill: { label: t('skr.apy', { value: view.apy }), tone: 'accent', icon: 'Percent' } }
          : {}),
      },
    },
    stakeCard(view, t),
    ...dailyBlocks(view, t),
    ...rewardBlocks(view, t),
    ...aboutBlocks(view, market, chart, t),
  ];
}
