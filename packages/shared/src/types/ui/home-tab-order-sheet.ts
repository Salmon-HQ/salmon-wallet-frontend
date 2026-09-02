import type { Testable } from './testable';

/** One arrangeable Home sub-tab: the key Home renders by, and its label. */
export interface HomeTabOrderTab {
  key: string;
  label: string;
}

/**
 * The surface where the user arranges Home's sub-tabs.
 *
 * Order only — hiding a tab is a separate decision and this contract makes no
 * room for it. The new order is reported as it is dropped, not on a Save:
 * there is no draft state here, so there is nothing to commit.
 */
export interface HomeTabOrderSheetPropsBase extends Testable {
  visible: boolean;
  onClose: () => void;
  /** The tabs Home offers, already in the order it is drawing them. */
  tabs: HomeTabOrderTab[];
  /** The keys in their new order, reported on every drop. */
  onOrderChange: (order: string[]) => void;
}
