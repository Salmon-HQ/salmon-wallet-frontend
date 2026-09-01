import type { ViewStyle } from 'react-native';

export interface DerivedAccountCardProps {
  address: string;
  networkName: string;
  path: string;
  balanceFormatted: string;
  selected: boolean;
  dimmed: boolean;
  onToggle: () => void;
  blockchain?: 'solana' | 'bitcoin' | 'ethereum';
  style?: ViewStyle;
  testID?: string;
}
