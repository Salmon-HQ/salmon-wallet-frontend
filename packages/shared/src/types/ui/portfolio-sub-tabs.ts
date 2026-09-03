import type { Testable } from './testable';

export interface PortfolioSubTab {
  key: string;
  label: string;
}

export interface PortfolioSubTabsPropsBase extends Testable {
  tabs: PortfolioSubTab[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Opens the sheet where the user arranges the tabs. */
  onOrderPress?: () => void;
  /**
   * Remount key for the tabs region alone. A reorder changes it so the tabs
   * sink and float; the order button beside them never moves.
   */
  tabsKey?: string;
}
