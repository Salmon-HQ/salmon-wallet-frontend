/**
 * The one renderer of `KitBlock` lists (spec 040), made once from a
 * platform's kit components. Each twin's `BlockList` passes its own
 * components and its own divider and column, so which component draws which
 * block — and how a row's mark and end are chosen — cannot drift between
 * mobile and the DOM (`docs/POWERUPS-UI.md` §1.10, rule 3).
 */
import React, { type ComponentType, type ReactNode } from 'react';

import type {
  BlockListPropsBase,
  KitBlock,
  KitCardPropsBase,
  KitRowPropsBase,
} from '../types/ui/block-list';
import type { CardPropsBase } from '../types/ui/card';
import type { FactsCardPropsBase } from '../types/ui/facts-card';
import type { IconBubblePropsBase } from '../types/ui/icon-bubble';
import type { ListRowPropsBase } from '../types/ui/list-row';
import type { PillPropsBase } from '../types/ui/pill';
import type { PowerupIconName } from '../types/ui/powerup-icon';
import type { PriceChartPropsBase } from '../types/ui/price-chart';
import type { ProgressBarPropsBase } from '../types/ui/progress-bar';
import type { SectionLabelPropsBase } from '../types/ui/section-label';
import type { SkeletonRowPropsBase } from '../types/ui/skeleton';
import type { StatGridPropsBase, StatTilePropsBase } from '../types/ui/stat-tile';
import type { StateBlockPropsBase } from '../types/ui/state-block';
import type { TokenListItemPropsBase } from '../types/ui/token-list';
import type { TokenLogoPropsBase } from '../types/ui/token-logo';
import { borderRadius, componentSizes, spacing } from '../theme';

const CARD_GAPS = { none: 0, md: spacing.md, lg: spacing.lg } as const;

export interface BlockKit {
  Card: ComponentType<CardPropsBase>;
  FactsCard: ComponentType<FactsCardPropsBase>;
  IconBubble: ComponentType<IconBubblePropsBase>;
  ListRow: ComponentType<ListRowPropsBase>;
  Pill: ComponentType<PillPropsBase>;
  PriceChart: ComponentType<Omit<PriceChartPropsBase<never>, 'style'>>;
  ProgressBar: ComponentType<ProgressBarPropsBase>;
  SectionLabel: ComponentType<SectionLabelPropsBase>;
  SkeletonRow: ComponentType<SkeletonRowPropsBase>;
  StatGrid: ComponentType<StatGridPropsBase>;
  StatTile: ComponentType<StatTilePropsBase>;
  StateBlock: ComponentType<StateBlockPropsBase>;
  TokenListItem: ComponentType<TokenListItemPropsBase>;
  TokenLogo: ComponentType<TokenLogoPropsBase & { borderRadius: number }>;
  /** The hairline between two blocks of a card. */
  Divider: ComponentType;
  /** The list's own column, the component gap apart. */
  Column: ComponentType<{ testID?: string; children: ReactNode }>;
  icons: Record<PowerupIconName, NonNullable<IconBubblePropsBase['icon']>>;
  /** The platform's size scaler (mobile `s`/`vs`; identity on the DOM). */
  scale: (size: number) => number;
}

export function createBlockList(kit: BlockKit): ComponentType<BlockListPropsBase> {
  function Row({ leading, value, pill, ...row }: KitRowPropsBase) {
    const mark =
      'icon' in leading ? (
        <kit.IconBubble
          size={componentSizes.iconBubbleSm}
          shape="rounded"
          tone="accent-tint"
          icon={kit.icons[leading.icon]}
        />
      ) : (
        <kit.TokenLogo
          uri={leading.token.uri}
          symbol={leading.token.symbol}
          size={kit.scale(KIT_ROW_TOKEN_MARK)}
          borderRadius={borderRadius.full}
        />
      );
    const trailing = pill ? (
      <kit.Pill {...pill} />
    ) : value ? (
      <kit.StatTile size="sm" align="end" {...value} />
    ) : undefined;
    return <kit.ListRow {...row} leading={mark} trailing={trailing} />;
  }

  function Card({ props, blocks }: { props: KitCardPropsBase; blocks: readonly KitBlock[] }) {
    const { gap = 'lg', ...card } = props;
    return (
      <kit.Card {...card} gap={kit.scale(CARD_GAPS[gap])}>
        {blocks.map((child) => (
          <Block key={child.key} block={child} />
        ))}
      </kit.Card>
    );
  }

  function Block({ block }: { block: KitBlock }): React.ReactElement {
    switch (block.kind) {
      case 'chart':
        return <kit.PriceChart {...block.props} />;
      case 'facts':
        return <kit.FactsCard {...block.props} />;
      case 'label':
        return <kit.SectionLabel {...block.props} />;
      case 'skeleton':
        return <kit.SkeletonRow {...block.props} />;
      case 'state':
        return <kit.StateBlock {...block.props} />;
      case 'stats':
        return <kit.StatGrid {...block.props} />;
      case 'row':
        return <Row {...block.props} />;
      case 'progress':
        return <kit.ProgressBar {...block.props} />;
      case 'divider':
        return <kit.Divider />;
      case 'card':
        return <Card props={block.props} blocks={block.blocks} />;
      default:
        return <kit.TokenListItem {...block.props} />;
    }
  }

  return function BlockList({ blocks, testID }: BlockListPropsBase) {
    return (
      <kit.Column testID={testID}>
        {blocks.map((block) => (
          <Block key={block.key} block={block} />
        ))}
      </kit.Column>
    );
  };
}

/** A token mark in a kit row: the token list row's own logo size, so the two read alike. */
export const KIT_ROW_TOKEN_MARK = 44;
