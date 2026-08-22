/**
 * AddressAddPanel - Add new contact page
 */

import React, { useCallback } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import { useTranslation } from 'react-i18next';
import {
  colors,
  semantic,
  spacing,
  fontFamily,
  fontWeight,
  useAddressBookForm,
  borderRadius,
  borderWidth,
  fontSize,
  opacity,
} from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { InputAddress } from '../InputAddress';
import type { AddressAddPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const FieldLabel = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.body,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  marginBottom: spacing.sm,
  marginTop: spacing.lg,
});

const StyledInput = styled(InputBase)({
  width: '100%',
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.r3,
  border: `${borderWidth.thin}px solid ${colors.input.border}`,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  '& .MuiInputBase-input': {
    padding: `${spacing.md}px 0`,
    '&::placeholder': {
      color: colors.text.tertiary,
      opacity: opacity.full,
    },
  },
});

const NetworkBox = styled(Box)({
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.r3,
  padding: `${spacing.md}px ${spacing.lg}px`,
});

const NetworkText = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.bodyLg,
  fontFamily: fontFamily.sans,
});

const ErrorText = styled(Typography)({
  fontSize: fontSize.caption,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: semantic.status.danger,
  marginTop: spacing.sm,
});

// ============================================================================
// Component
// ============================================================================

export function AddressAddPanel({
  activeNetworkId,
  activeNetworkName: _activeNetworkName,
  activeBlockchain,
  onSave,
  onBack,
  errorText,
}: AddressAddPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const form = useAddressBookForm({ networkId: activeNetworkId });

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(form.buildInput());
  }, [form, onSave]);

  return (
    <SettingsPanelContent title={t('settings.addressbook.add', 'Add Address')} onBack={onBack}>
      <Box sx={{ px: `${spacing.lg}px` }}>
        {/* Label */}
        <FieldLabel>{t('settings.addressbook.label', 'Label')}</FieldLabel>
        <StyledInput
          value={form.label}
          onChange={(e) => form.setLabel(e.target.value)}
          placeholder={t('settings.addressbook.label', 'Label')}
          autoComplete="off"
          inputProps={{ spellCheck: false, 'data-testid': 'address-book-label-input' }}
        />

        {/* Address */}
        <Box sx={{ mt: `${spacing.lg}px` }}>
          <InputAddress
            address={form.address}
            onChange={form.setAddress}
            onValidation={form.handleValidation}
            label={t('general.address', 'Address')}
            testID="address-book-address"
          />
        </Box>

        {/* Network */}
        <FieldLabel>{t('settings.addressbook.network')}</FieldLabel>
        <NetworkBox>
          <NetworkText>
            {activeBlockchain.charAt(0).toUpperCase() + activeBlockchain.slice(1)}
          </NetworkText>
        </NetworkBox>

        {/* Save */}
        <PrimaryButton
          onClick={handleSave}
          disabled={!form.canSave}
          testID="address-book-save-button"
          style={{ marginTop: spacing['2xl'] }}
        >
          {t('settings.addressbook.save', 'Save Address')}
        </PrimaryButton>
        {errorText && <ErrorText data-testid="address-book-save-error">{errorText}</ErrorText>}
      </Box>
    </SettingsPanelContent>
  );
}
