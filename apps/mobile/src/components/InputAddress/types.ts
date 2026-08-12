/**
 * InputAddress Types
 * Migrated from salmon-wallet-v2/src/features/InputAddress/InputAddress.js
 *
 * Hook-related types (BlockchainType, ValidationState, ValidationCallbackResult,
 * UseAddressValidationResult, UseAddressValidationParams) are now defined in
 * @salmon/shared and can be imported directly from there.
 */

import type { TextInputProps } from 'react-native';
import type { InputAddressPropsBase } from '@salmon/shared';

/**
 * Props for the InputAddress component (React Native)
 */
export interface InputAddressProps
  extends
    InputAddressPropsBase<TextInputProps['style']>,
    Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange' | 'style'> {}
