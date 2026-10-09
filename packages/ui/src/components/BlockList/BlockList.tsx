/**
 * BlockList — a column of kit blocks built as data in shared (`KitBlock`),
 * the component gap apart; a `card` block holds its own column. The renderer
 * is shared (`createBlockList`); this twin supplies its components. Mobile
 * twin: `apps/mobile/src/components/BlockList`.
 */
import React from 'react';
import { borderWidth, createBlockList, spacing } from '@salmon/shared';

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
import { useSemantic } from '../../theme/ThemeProvider';

function Divider() {
  const t = useSemantic();
  return <div style={{ height: borderWidth.thin, backgroundColor: t.border.hairline }} />;
}

function Column({ testID, children }: { testID?: string; children: React.ReactNode }) {
  return (
    <div
      data-testid={testID}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.screenGutter }}
    >
      {children}
    </div>
  );
}

const identity = (size: number) => size;

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
  scale: identity,
});
