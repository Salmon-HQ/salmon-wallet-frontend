/**
 * AccountNamePanel - Edit account name screen
 *
 * MUI TextField pre-filled with current name, save button,
 * empty validation error, and disclaimer text.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '../../utils/styled';
import {
  colors,
  spacing,
  componentSizes,
  fontSize,
  useAccountsContext,
  type Account,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { PrimaryButton } from '../Button';
import type { AccountNamePanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: colors.interactive.surface,
    // The control radius: a field and the button under it are one shape
    // (DESIGN.md §The Control Radius Rule). It was 8.
    borderRadius: componentSizes.inputRadius,
    color: colors.text.primary,
    fontSize: fontSize.body,
    '& fieldset': {
      borderColor: colors.border.default,
    },
    '&:hover fieldset': {
      borderColor: colors.text.secondary,
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.accent.primary,
    },
  },
  '& .MuiInputLabel-root': {
    color: colors.text.secondary,
  },
});

// ============================================================================
// Component
// ============================================================================

export function AccountNamePanel({ accountId, onBack }: AccountNamePanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [accountState, accountActions] = useAccountsContext();
  const account =
    accountState.accounts.find((a: Account) => a.id === accountId) || accountState.activeAccount;

  const [name, setName] = useState(account?.name || '');
  const [error, setError] = useState('');

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('settings.wallets.edit_name_empty'));
      return;
    }
    setError('');
    await accountActions.editAccount(accountId, { name: trimmed });
    onBack();
  }, [name, accountId, accountActions, onBack, t]);

  return (
    <SettingsPanelContent title={t('settings.account_edit.name_section')} onBack={onBack}>
      <Box sx={{ padding: `0 ${spacing.lg}px` }}>
        <StyledTextField
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          placeholder={t('settings.account_add.set_name_placeholder')}
          aria-label={t('settings.account_edit.name_section')}
          error={!!error}
          helperText={error}
          autoFocus
          inputProps={{ maxLength: 32, 'data-testid': 'account-name-input' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          sx={{ marginBottom: spacing.md }}
        />

        <Typography
          sx={{
            color: colors.text.secondary,
            fontSize: fontSize.caption,
            marginBottom: spacing.xl,
          }}
        >
          {t('settings.wallets.edit_name_disclaimer')}
        </Typography>

        {/* The system's own primary button, not a hand-rolled salmon fill —
            the settings surface joined the system (DESIGN.md §Motion). */}
        <PrimaryButton
          onClick={handleSave}
          disabled={!name.trim()}
          testID="account-name-save-button"
        >
          {t('actions.save')}
        </PrimaryButton>
      </Box>
    </SettingsPanelContent>
  );
}
