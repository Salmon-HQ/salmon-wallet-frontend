/**
 * AddressForm — the address-book form, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressForm`. Add and Edit
 * are the same three fields — each a `Card`, the placeholder carrying the
 * label — a network card and the save button; the panels differ only in their
 * words and in what saving does, which they pass in.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { Card } from '../Card';
import { InputAddress } from '../InputAddress';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { TextInput } from '../TextInput';
import { WarningNotice } from '../WarningNotice';
import type { AddressFormProps } from './types';

export function AddressForm({
  title,
  subtitle,
  networkLabel,
  form,
  onSave,
  onBack,
  errorText,
  testID,
}: AddressFormProps): React.ReactElement {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <SettingsPanelContent title={title} subtitle={subtitle} onBack={onBack} testID={testID}>
      <TextInput
        testID="address-book-label-input"
        value={form.label}
        onChangeText={form.setLabel}
        placeholder={t('settings.addressbook.label', 'Label')}
      />

      <InputAddress
        address={form.address}
        onChange={form.setAddress}
        onValidation={form.handleValidation}
        label={t('general.address', 'Address')}
        testID="address-book-address"
      />

      <Card padding="md" accessibilityLabel={t('settings.addressbook.network')}>
        <span
          style={{
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
          }}
        >
          {networkLabel}
        </span>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <PrimaryButton
          onPress={() => void onSave()}
          disabled={!form.canSave}
          testID="address-book-save-button"
        >
          {t('settings.addressbook.save', 'Save Address')}
        </PrimaryButton>
        {errorText && (
          <div data-testid="address-book-save-error">
            <WarningNotice tone="error" title={errorText} />
          </div>
        )}
      </div>
    </SettingsPanelContent>
  );
}
