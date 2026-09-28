import type { ViewStyle } from 'react-native';
import type { PortfolioSubTabsPropsBase } from '@salmon/shared';

export type { PortfolioSubTab } from '@salmon/shared';

/** The mobile half of `PortfolioSubTabsPropsBase`: the contract plus RN-only extras. */
export interface PortfolioSubTabsProps extends PortfolioSubTabsPropsBase {
  style?: ViewStyle;
}
