import type { ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import type Reanimated from 'react-native-reanimated';
import type { Testable } from '@salmon/shared';

/** What Reanimated accepts for `entering` / `exiting`. */
type LayoutVerb = ComponentProps<typeof Reanimated.View>['entering'];

export interface PortfolioSubTab {
  key: string;
  label: string;
}

export interface PortfolioSubTabsProps extends Testable {
  tabs: PortfolioSubTab[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Opens the sheet where the user arranges the tabs. */
  onOrderPress?: () => void;
  /**
   * Remount key for the tabs region alone. A reorder changes it so the
   * tabs sink and float; the order button beside them never moves (owner,
   * 2026-09-02). A tab switch keeps the key, so the underline keeps sliding.
   */
  tabsKey?: string;
  /** The verb the tabs region plays on remount, if any. */
  tabsEntering?: LayoutVerb;
  tabsExiting?: LayoutVerb;
  style?: ViewStyle;
}
