import type { ViewStyle } from 'react-native';
import type { Testable } from '@salmon/shared';

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
  style?: ViewStyle;
}
