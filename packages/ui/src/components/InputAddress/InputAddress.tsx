/**
 * InputAddress — `RecipientInput` with the verdict attached.
 *
 * The address-book panels hand in an address and want a verdict back
 * (`onValidation`); this runs `useAddressValidation` against the active
 * account and draws the validator's own message under the field, the way the
 * send screens draw it — one `WarningNotice`, tone from the message type.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { durationMs, spacing, useAccountsContext, useAddressValidation } from '@salmon/shared';

import { WarningNotice } from '../WarningNotice';
import { RecipientInput } from './RecipientInput';
import type { InputAddressProps } from './types';

export function InputAddress({
  address,
  onChange,
  onValidation,
  placeholder,
  label,
  disabled = false,
  errorMessage,
  testID = 'input-address',
  className,
  style,
}: InputAddressProps) {
  const { t } = useTranslation();
  const [state] = useAccountsContext();
  const { activeBlockchainAccount } = state;

  const { validationState, isValidating, message, messageType } = useAddressValidation(
    address,
    activeBlockchainAccount,
    { debounceMs: durationMs.debounce, onValidation }
  );

  const displayMessage = errorMessage || message;
  const displayTone = errorMessage || messageType === 'error' ? 'error' : 'warning';

  return (
    <div
      data-testid={testID}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}
    >
      <RecipientInput
        testID={`${testID}-field`}
        testIDPrefix={testID}
        value={address}
        onChangeText={disabled ? () => undefined : onChange}
        placeholder={placeholder ?? label ?? t('send.enter_address_or_domain')}
        validationState={validationState}
        isValidating={isValidating}
        style={disabled ? { opacity: 0.45, pointerEvents: 'none' } : undefined}
      />
      {displayMessage && (
        <WarningNotice tone={displayTone} title={t(displayMessage)} testID={`${testID}-message`} />
      )}
    </div>
  );
}
