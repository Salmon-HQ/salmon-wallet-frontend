import type { ViewStyle } from 'react-native';
import type {
  TokenSelectorToken,
  TokenSelectorPropsBase,
  TokenSelectorModalPropsBase,
  UseTokenSearchResult,
} from '@salmon/shared';

// Re-export shared types for convenience
export type { TokenSelectorToken, UseTokenSearchResult };

/**
 * Props for the TokenSelector component (React Native)
 */
export interface TokenSelectorProps extends TokenSelectorPropsBase<ViewStyle> {}

/**
 * Props for the TokenSelectorModal component (React Native)
 */
export interface TokenSelectorModalProps extends TokenSelectorModalPropsBase<ViewStyle> {}
