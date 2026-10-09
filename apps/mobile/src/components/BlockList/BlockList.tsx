/**
 * BlockList — a column of kit blocks built as data in shared (`KitBlock`),
 * the component gap apart; a `card` block holds its own column. The renderer
 * is shared (`createBlockList`); this twin supplies its components. DOM twin:
 * `packages/ui/src/components/BlockList`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { borderWidth, createBlockList, s, spacing, vs, type Semantic } from '@salmon/shared';

import { Card } from '../Card';
import { FactsCard } from '../FactsCard';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { Pill } from '../Pill';
import { PriceChart } from '../PriceChart';
import { ProgressBar } from '../ProgressBar';
import { SectionLabel } from '../SectionLabel';
import { SkeletonRow } from '../SkeletonRow';
import { StatGrid, StatTile } from '../StatTile';
import { StateBlock } from '../StateBlock';
import { TokenListItem } from '../TokenList';
import { TokenLogo } from '../TokenLogo';
import { powerupIcons } from '../../icons';
import { useThemedStyles } from '../../theme/useThemedStyles';

function Divider() {
  return <View style={useThemedStyles(stylesFor).divider} />;
}

function Column({ testID, children }: { testID?: string; children: React.ReactNode }) {
  return (
    <View testID={testID} style={column.style}>
      {children}
    </View>
  );
}

export const BlockList = createBlockList({
  Card,
  FactsCard,
  IconBubble,
  ListRow,
  Pill,
  PriceChart,
  ProgressBar,
  SectionLabel,
  SkeletonRow,
  StatGrid,
  StatTile,
  StateBlock,
  TokenListItem,
  TokenLogo,
  Divider,
  Column,
  icons: powerupIcons,
  scale: s,
});

const column = StyleSheet.create({ style: { gap: vs(spacing.screenGutter) } });

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    divider: { height: borderWidth.thin, backgroundColor: t.border.hairline },
  });
