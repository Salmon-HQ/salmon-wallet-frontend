import type { Testable } from './testable';

/** One arrangeable Home sub-tab: the key Home renders by, and its label. */
export interface HomeTabOrderTab {
  key: string;
  label: string;
}

/**
 * The surface where the user arranges Home's sub-tabs.
 *
 * Order, and — for a Powerup's tab — removal. Portfolio and NFTs are the
 * wallet itself and carry no remove control; a Powerup's tab does, and
 * removing it uninstalls the Powerup. The new order is reported as it is
 * dropped, not on a Save: there is no draft state here, so there is nothing
 * to commit.
 */
export interface HomeTabOrderSheetPropsBase extends Testable {
  visible: boolean;
  onClose: () => void;
  /** The tabs Home offers, already in the order it is drawing them. */
  tabs: HomeTabOrderTab[];
  /** The keys in their new order, reported on every drop. */
  onOrderChange: (order: string[]) => void;
  /** The tabs that may be taken away — a Powerup's, never Portfolio or NFTs. */
  removableKeys?: readonly string[];
  /** Take a removable tab away; the Powerup that owns it is uninstalled. */
  onRemove?: (key: string) => void;
}
