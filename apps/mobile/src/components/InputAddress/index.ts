/**
 * InputAddress Component
 *
 * A text input component for entering and validating blockchain addresses.
 * Supports Solana public keys and domain names with real-time validation.
 */

export { useAddressValidation } from '@salmon/shared';
export type {
  BlockchainType,
  ValidationState,
  ValidationCallbackResult,
  UseAddressValidationResult,
  UseAddressValidationParams,
} from '@salmon/shared';
