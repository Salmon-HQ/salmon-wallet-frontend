import type { ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import type Reanimated from 'react-native-reanimated';
import type { PortfolioSubTabsPropsBase } from '@salmon/shared';

export type { PortfolioSubTab } from '@salmon/shared';

/** What Reanimated accepts for `entering` / `exiting`. */
type LayoutVerb = ComponentProps<typeof Reanimated.View>['entering'];

/** The mobile half of `PortfolioSubTabsPropsBase`: the contract plus RN-only extras. */
export interface PortfolioSubTabsProps extends PortfolioSubTabsPropsBase {
  /** The verb the tabs region plays on remount, if any. */
  tabsEntering?: LayoutVerb;
  tabsExiting?: LayoutVerb;
  style?: ViewStyle;
}
