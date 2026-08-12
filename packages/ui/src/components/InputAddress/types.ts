/**
 * InputAddress types for web version
 *
 * Adapted from the React Native InputAddress types for use in
 * browser extension with standard HTML input elements.
 *
 * Hook-related types (BlockchainType, ValidationState, ValidationCallbackResult,
 * UseAddressValidationResult, UseAddressValidationParams) are now defined in
 * @salmon/shared and re-exported from the barrel index.ts for backwards compat.
 */

import type { CSSProperties } from 'react';
import type { InputAddressPropsBase } from '@salmon/shared';

/**
 * Props for the InputAddress component (Web/Extension)
 */
export interface InputAddressProps extends InputAddressPropsBase<CSSProperties> {
  /** Additional CSS class */
  className?: string;
}
