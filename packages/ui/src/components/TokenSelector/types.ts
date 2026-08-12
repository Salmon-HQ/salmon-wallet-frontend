import type { CSSProperties } from 'react';
import type {
  TokenSelectorToken,
  TokenSelectorPropsBase,
  TokenSelectorModalPropsBase,
  UseTokenSearchResult,
} from '@salmon/shared';

// Re-export shared types for convenience
export type { TokenSelectorToken, UseTokenSearchResult };

/**
 * Props for the TokenSelector component (Web/Extension)
 */
export interface TokenSelectorProps extends TokenSelectorPropsBase<CSSProperties> {
  /** Additional CSS class name */
  className?: string;
}

/**
 * Props for the TokenSelectorModal component (Web/Extension)
 */
export interface TokenSelectorModalProps extends TokenSelectorModalPropsBase<CSSProperties> {
  /** Additional CSS class name */
  className?: string;
}
