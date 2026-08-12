/**
 * AddressEditPanel - Edit existing contact page
 */

import React, { useCallback } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  fontFamily,
  fontWeight,
  useAddressBookForm,
  borderRadius,
  borderWidth,
  fontSize,
  opacity,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { InputAddress } from '../InputAddress';
import type { AddressEditPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const FieldLabel = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  marginBottom: spacing.sm,
  marginTop: spacing.lg,
});

const StyledInput = styled(InputBase)({
  width: '100%',
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${colors.input.border}`,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
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
  borderRadius: borderRadius.lg,
  padding: `${spacing.md}px ${spacing.lg}px`,
});

const NetworkText = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
});

const SaveButton = styled(Button)({
  width: '100%',
  marginTop: spacing['2xl'],
  padding: `${spacing.md}px`,
  borderRadius: borderRadius.lg,
  textTransform: 'none',
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  backgroundColor: colors.accent.primary,
  color: colors.text.primary,
  '&:hover': {
    backgroundColor: colors.accent.primary,
    opacity: opacity.soft,
  },
  '&:disabled': {
    backgroundColor: colors.accent.primary,
    color: colors.text.primary,
    opacity: opacity.faint,
  },
});

const ErrorText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.status.error,
  marginTop: spacing.sm,
});

// ============================================================================
// Component
// ============================================================================

export function AddressEditPanel({
  contact,
  activeBlockchain: _activeBlockchain,
  onSave,
  onBack,
  errorText,
}: AddressEditPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const form = useAddressBookForm({
    label: contact.name,
    address: contact.domain || contact.address,
    networkId: contact.networkId,
    resolvedAddress: contact.address,
    isDomain: !!contact.domain,
  });

  const handleSave = useCallback(async () => {
    if (!form.canSave) return;
    await onSave(contact.address, form.buildInput());
  }, [form, onSave, contact.address]);

  return (
    <SettingsPanelContent title={t('settings.addressbook.edit', 'Edit Address')} onBack={onBack}>
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
            {contact.networkId.split('-')[0].charAt(0).toUpperCase() +
              contact.networkId.split('-')[0].slice(1)}
          </NetworkText>
        </NetworkBox>

        {/* Save */}
        <SaveButton
          onClick={handleSave}
          disabled={!form.canSave}
          data-testid="address-book-save-button"
        >
          {t('settings.addressbook.save', 'Save Address')}
        </SaveButton>
        {errorText && <ErrorText data-testid="address-book-save-error">{errorText}</ErrorText>}
      </Box>
    </SettingsPanelContent>
  );
}
