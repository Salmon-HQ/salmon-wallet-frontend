import type { FactsCardPropsBase } from './facts-card';
import type { PriceChartPropsBase } from './price-chart';
import type { SectionLabelPropsBase } from './section-label';
import type { SkeletonRowPropsBase } from './skeleton';
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
  | { kind: 'token'; key: string; props: TokenListItemPropsBase };

/** A column of kit blocks, the component gap apart. */
export interface BlockListPropsBase extends Testable {
  blocks: readonly KitBlock[];
}
