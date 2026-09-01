import type { ViewStyle } from 'react-native';
import type {
  TokenSelectorToken,
  TokenSelectorModalPropsBase,
  UseTokenSearchResult,
} from '@salmon/shared';

// Re-export shared types for convenience
export type { TokenSelectorToken, UseTokenSearchResult };

/**
 * Props for the TokenSelectorModal component (React Native)
 */
export interface TokenSelectorModalProps extends TokenSelectorModalPropsBase<ViewStyle> {}
