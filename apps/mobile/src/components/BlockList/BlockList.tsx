/**
 * BlockList — a column of kit blocks built as data in shared (`KitBlock`),
 * the component gap apart. DOM twin: `packages/ui/src/components/BlockList`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing, vs, type KitBlock } from '@salmon/shared';

import { FactsCard } from '../FactsCard';
import { SectionLabel } from '../SectionLabel';
import { SkeletonRow } from '../SkeletonRow';
import { StateBlock } from '../StateBlock';
import { TokenListItem } from '../TokenList';
import type { BlockListProps } from './types';

function Block({ block }: { block: KitBlock }) {
  if (block.kind === 'facts') return <FactsCard {...block.props} />;
  if (block.kind === 'label') return <SectionLabel {...block.props} />;
  if (block.kind === 'skeleton') return <SkeletonRow {...block.props} />;
  if (block.kind === 'state') return <StateBlock {...block.props} />;
  return <TokenListItem {...block.props} />;
}

export function BlockList({ blocks, testID }: BlockListProps) {
  return (
    <View testID={testID} style={styles.column}>
      {blocks.map((block) => (
        <Block key={block.key} block={block} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ column: { gap: vs(spacing.screenGutter) } });
