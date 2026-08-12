/**
 * InputAddress Component
 *
 * A text input component for entering and validating blockchain addresses.
 * Supports Solana public keys and domain names with real-time validation.
 *
 * Web version using MUI and @emotion/styled for browser extension.
 */

export { InputAddress } from './InputAddress';
export { useAddressValidation } from '@salmon/shared';
export type { InputAddressProps } from './types';
export type {
  BlockchainType,
  ValidationState,
  ValidationCallbackResult,
  UseAddressValidationResult,
  UseAddressValidationParams,
} from '@salmon/shared';
