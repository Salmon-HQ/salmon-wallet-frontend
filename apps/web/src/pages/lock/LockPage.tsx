import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { styled } from '@salmon/ui';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { PrimaryButton, ConfirmDialog, LoadingScreen, WarningNotice } from '@salmon/ui';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  componentSizes,
  useAccountsContext,
  type DerivedKeyCache,
  getStashItem,
  STASH_KEYS,
  useUnlockThrottle,
} from '@salmon/shared';
import { storeSessionKey, clearSessionKey } from '../../utils/sessionKeyCache';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  overflow: 'hidden',
  padding: spacing['2xl'],
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
  width: 72,
  height: 72,
  objectFit: 'contain',
  marginBottom: spacing['3xl'],
});

const Title = styled(Typography)({
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const Subtitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'center',
  marginBottom: spacing['3xl'],
});

const Form = styled('form')({ width: '100%' });

const InputContainer = styled(Box)({ marginBottom: spacing.lg });

const StyledInput = styled(InputBase)<{ $hasError: boolean }>(({ $hasError }) => ({
  width: '100%',
  padding: '14px 16px',
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  backgroundColor: colors.input.background,
  border: `1px solid ${$hasError ? colors.status.error : colors.input.border}`,
  borderRadius: componentSizes.inputRadius,
  color: colors.text.primary,
  transition: 'border-color 0.15s ease',
  '&.Mui-focused': {
    borderColor: $hasError ? colors.status.error : colors.accent.primary,
  },
}));

const ErrorText = styled(Typography)({
  color: colors.status.error,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  marginTop: spacing.sm,
  marginLeft: spacing.xs,
});

const ThrottleNotice = styled(Box)({
  marginBottom: spacing.lg,
});

const ForgotPasswordButton = styled('button')({
  marginTop: spacing.lg,
  padding: spacing.sm,
  background: 'none',
  border: 'none',
  color: colors.text.secondary,
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  cursor: 'pointer',
  width: '100%',
  textAlign: 'center',
  transition: 'color 0.15s ease',
  '&:hover:not(:disabled)': { color: colors.text.primary },
});

export function LockPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, actions] = useAccountsContext();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const sessionKeyClearRef = useRef(false);
  // Failed attempts cost time. Show the cost instead of a prompt that has
  // quietly stopped answering.
  const {
    remainingMs: throttleRemainingMs,
    remainingSeconds: throttleRemainingSeconds,
    refresh: refreshThrottle,
  } = useUnlockThrottle();
  const throttled = throttleRemainingMs > 0;

  useEffect(() => {
    if (sessionKeyClearRef.current) return;
    sessionKeyClearRef.current = true;

    void clearSessionKey();
  }, []);

  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (error) setError(null);
    },
    [error]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!password.trim()) {
        setError(t('lock.error.empty_password', 'Please enter your password'));
        return;
      }

      setShowLoadingScreen(true);
      setIsUnlocking(true);
      setError(null);

      try {
        const success = await actions.unlockAccounts(password);
        if (!success) {
          refreshThrottle();
          setError(t('lock.error.invalid_password', 'Invalid password'));
          setPassword('');
          setShowLoadingScreen(false);
        } else {
          try {
            const derivedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
            if (derivedKey) await storeSessionKey(derivedKey);
          } catch {
            /* cache miss is ok */
          }
          navigate('/home', { replace: true });
        }
      } catch {
        setError(t('lock.error.unlock_failed', 'Failed to unlock wallet'));
        setShowLoadingScreen(false);
      } finally {
        setIsUnlocking(false);
      }
    },
    [password, actions, t, navigate, refreshThrottle]
  );

  const handleFinalConfirm = useCallback(async () => {
    try {
      await actions.removeAllAccounts();
      navigate('/auth/select', { replace: true });
    } catch {
      setError(t('lock.error.reset_failed', 'Failed to reset wallet.'));
    }
  }, [actions, navigate, t]);

  return (
    <>
      <Container>
        <Content>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('lock.title', 'Welcome Back')}</Title>
          <Subtitle>{t('lock.subtitle', 'Enter your password to unlock your wallet')}</Subtitle>

          <Form onSubmit={handleSubmit}>
            {throttled && (
              <ThrottleNotice data-testid="lock-throttle-notice">
                <WarningNotice tone="warning" title={t('lock.throttled_title')}>
                  {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
                </WarningNotice>
              </ThrottleNotice>
            )}

            <InputContainer>
              <StyledInput
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder={t('lock.password_placeholder', 'Password')}
                $hasError={!!error}
                disabled={isUnlocking || throttled}
                autoFocus
                fullWidth
                inputProps={{
                  'data-testid': 'lock-password-input',
                  'aria-label': t('lock.password_placeholder', 'Password'),
                }}
              />
              {error && <ErrorText>{error}</ErrorText>}
            </InputContainer>
            <PrimaryButton
              type="submit"
              disabled={!password.trim() || throttled}
              loading={isUnlocking}
              fullWidth
              testID="lock-unlock-button"
            >
              {t('lock.unlock', 'Unlock')}
            </PrimaryButton>
            <ForgotPasswordButton
              type="button"
              onClick={() => setShowResetDialog(true)}
              disabled={isUnlocking}
              data-testid="lock-forgot-password-button"
            >
              {t('lock.forgot_password', 'I forgot my password')}
            </ForgotPasswordButton>
          </Form>
        </Content>

        <ConfirmDialog
          visible={showResetDialog}
          onClose={() => setShowResetDialog(false)}
          title={t('lock.reset_wallet.title', 'Reset Wallet')}
          message={t(
            'lock.reset_wallet.message',
            'This will permanently delete all accounts and data. You can restore using your seed phrase.'
          )}
          confirmText={t('lock.reset_wallet.reset', 'Reset Wallet')}
          cancelText={t('lock.reset_wallet.cancel', 'Cancel')}
          isDanger
          onConfirm={async () => {
            setShowResetDialog(false);
            setShowConfirmDialog(true);
          }}
        />

        <ConfirmDialog
          visible={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          title={t('lock.confirm_reset.title', 'Are you sure?')}
          message={t('lock.confirm_reset.message', 'This action cannot be undone.')}
          confirmText={t('lock.confirm_reset.confirm', 'Delete All Data')}
          cancelText={t('lock.confirm_reset.cancel', 'Cancel')}
          isDanger
          onConfirm={handleFinalConfirm}
        />
      </Container>

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking')}
        showTips
        tipInterval={3000}
      />
    </>
  );
}
