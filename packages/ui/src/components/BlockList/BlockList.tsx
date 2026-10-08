/**
 * BlockList — a column of kit blocks built as data in shared (`KitBlock`),
 * the component gap apart. Mobile twin: `apps/mobile/src/components/BlockList`.
 */
import React from 'react';
import { spacing, type KitBlock } from '@salmon/shared';

import { FactsCard } from '../FactsCard';
import { PriceChart } from '../PriceChart';
import { SectionLabel } from '../SectionLabel';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { TokenListItem } from '../TokenList';
import type { BlockListProps } from './types';

function Block({ block }: { block: KitBlock }) {
  if (block.kind === 'chart') return <PriceChart {...block.props} />;
  if (block.kind === 'facts') return <FactsCard {...block.props} />;
  if (block.kind === 'label') return <SectionLabel {...block.props} />;
  if (block.kind === 'skeleton') return <SkeletonRow {...block.props} />;
  if (block.kind === 'state') return <StateBlock {...block.props} />;
  return <TokenListItem {...block.props} />;
}

export function BlockList({ blocks, testID }: BlockListProps) {
  return (
    <div
      data-testid={testID}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}
    >
      {blocks.map((block) => (
        <Block key={block.key} block={block} />
      ))}
    </div>
  );
}
