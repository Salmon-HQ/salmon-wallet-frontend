import type { BarChartPropsBase } from './bar-chart';
import type { ButtonPropsBase } from './button';
import type { CardPadding, CardTone } from './card';
import type { ListRowPadding } from './list-row';
import type { FactsCardPropsBase } from './facts-card';
import type { PillPropsBase } from './pill';
import type { PowerupIconName } from './powerup-icon';
import type { ProgressBarPropsBase } from './progress-bar';
import type { PriceChartPropsBase } from './price-chart';
import type { SectionLabelPropsBase } from './section-label';
import type { SkeletonRowPropsBase } from './skeleton';
import type { StatGridPropsBase, StatTilePropsBase } from './stat-tile';
import type { StateBlockPropsBase } from './state-block';
import type { TokenListItemPropsBase } from './token-list';
import type { Testable } from './testable';

/**
 * One kit block, as data: which block and the props of its contract. A screen
 * whose content is a column of existing blocks builds this list once in
 * shared, and each twin only renders it — so the twins cannot drift apart
 * and do not repeat the same tree (`docs/POWERUPS-UI.md` §1.10, rule 3).
 */
export type KitBlock =
  | { kind: 'chart'; key: string; props: Omit<PriceChartPropsBase<never>, 'style'> }
  | { kind: 'facts'; key: string; props: FactsCardPropsBase }
  | { kind: 'label'; key: string; props: SectionLabelPropsBase }
  | { kind: 'skeleton'; key: string; props: SkeletonRowPropsBase }
  | { kind: 'state'; key: string; props: StateBlockPropsBase }
  | { kind: 'token'; key: string; props: TokenListItemPropsBase }
  | { kind: 'stats'; key: string; props: StatGridPropsBase }
  | { kind: 'row'; key: string; props: KitRowPropsBase }
  | { kind: 'progress'; key: string; props: ProgressBarPropsBase }
  | { kind: 'bars'; key: string; props: BarChartPropsBase }
  /** A secondary button: an action on the content above it. */
  | { kind: 'button'; key: string; props: ButtonPropsBase }
  | { kind: 'divider'; key: string }
  /** A `Card` holding its own column of blocks. */
  | { kind: 'card'; key: string; props: KitCardPropsBase; blocks: readonly KitBlock[] };

/** A `ListRow` as data: a mark, two lines, and a figure or a pill at the end. */
export interface KitRowPropsBase extends Testable {
  leading: { icon: PowerupIconName } | { token: { uri?: string; symbol: string } };
  title: string;
  subtitle?: string;
  /** A figure at the row's end, right-aligned. */
  value?: StatTilePropsBase;
  pill?: PillPropsBase;
  emphasis?: 'default' | 'strong';
  /** A row is a card of its own; `ink` sinks it into the card it sits in. */
  tone?: CardTone;
  /** `none` with the `clear` tone: a heading row flush with the column. */
  padding?: ListRowPadding;
}

export interface KitCardPropsBase extends Testable {
  tone?: CardTone;
  padding?: CardPadding;
  /** `none` for a list whose rows carry their own padding. */
  gap?: 'none' | 'md' | 'lg';
}

/** A column of kit blocks, the component gap apart. */
export interface BlockListPropsBase extends Testable {
  blocks: readonly KitBlock[];
}
