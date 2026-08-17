import React, { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { LoadingScreen, PrimaryButton, styled } from '@salmon/ui';
import {
  useAccountsContext,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  componentSizes,
} from '@salmon/shared';

/**
 * Gate for the standalone `/dapp/*` approval popups.
 *
 * These popups open as fresh windows, and the web stash (unlock state) is an
 * in-memory Map scoped to each window — so a popup always starts LOCKED even
 * when the main wallet tab is unlocked. Without this gate the approval screen
 * renders with no active account and its Approve button is permanently
 * disabled. When locked, the popup must let the user unlock in place (entering
 * the password here populates this window's stash); on success the account
 * hydrates and the approval route renders via <Outlet/>.
 */
const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: spacing['2xl'],
  textAlign: 'center',
  background: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 100%)`,
});

const Content = styled(Box)({
  width: '100%',
  maxWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const LogoImage = styled('img')({
  width: 64,
  height: 64,
  objectFit: 'contain',
  marginBottom: spacing.xl,
});

const Title = styled(Typography)({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.sm,
});

const Subtitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginBottom: spacing['2xl'],
});

const Form = styled('form')({ width: '100%' });

const StyledInput = styled(InputBase)<{ $hasError: boolean }>(({ $hasError }) => ({
  width: '100%',
  padding: '14px 16px',
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  backgroundColor: colors.input.background,
  border: `1px solid ${$hasError ? colors.status.error : colors.input.border}`,
  borderRadius: componentSizes.inputRadius,
  color: colors.text.primary,
  marginBottom: spacing.lg,
  '&.Mui-focused': {
    borderColor: $hasError ? colors.status.error : colors.accent.primary,
  },
}));

const ErrorText = styled(Typography)({
  color: colors.status.error,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  marginBottom: spacing.md,
});

export function DAppApprovalGate(): React.ReactElement {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;

      setUnlocking(true);
      setError(null);
      try {
        const ok = await actions.unlockAccounts(password);
        if (!ok) {
          setError(t('lock.error.invalid_password', 'Invalid password'));
          setPassword('');
        }
        // On success, state.locked flips to false and this component re-renders
        // into <Outlet/> — no navigation, so the request context is preserved.
      } catch {
        setError(t('lock.error.unlock_failed', 'Failed to unlock wallet'));
      } finally {
        setUnlocking(false);
      }
    },
    [password, actions, t]
  );

  if (!state.ready) {
    // Every other wait in the app stands in the water; this one does not.
    // It is the first frame of the dApp approval flow, and the Bedrock Rule
    // covers the whole flow rather than only the screen with the button on it.
    return <LoadingScreen visible bedrock />;
  }

  if (state.accounts.length === 0) {
    return (
      <Container>
        <Content>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('dapp.no_wallet_title', 'No wallet found')}</Title>
          <Subtitle>
            {t(
              'dapp.no_wallet_subtitle',
              'Open Salmon Wallet and set up an account, then try again.'
            )}
          </Subtitle>
        </Content>
      </Container>
    );
  }

  if (state.locked) {
    return (
      <Container>
        <Content>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('lock.title', 'Welcome Back')}</Title>
          <Subtitle>
            {t('dapp.unlock_subtitle', 'Enter your password to approve this request')}
          </Subtitle>
          <Form onSubmit={handleSubmit}>
            <StyledInput
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('lock.password_placeholder', 'Password')}
              $hasError={!!error}
              disabled={unlocking}
              autoFocus
              fullWidth
              inputProps={{
                'data-testid': 'dapp-unlock-password-input',
                'aria-label': t('lock.password_placeholder', 'Password'),
              }}
            />
            {error && <ErrorText>{error}</ErrorText>}
            <PrimaryButton
              type="submit"
              disabled={!password.trim()}
              loading={unlocking}
              fullWidth
              testID="dapp-unlock-button"
            >
              {t('lock.unlock', 'Unlock')}
            </PrimaryButton>
          </Form>
        </Content>
      </Container>
    );
  }

  return <Outlet />;
}
