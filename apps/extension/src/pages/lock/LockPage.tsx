import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import {
  PrimaryButton,
  ConfirmDialog,
  LoadingScreen,
  WarningNotice,
  WaterColumn,
  waterColumnHost,
} from '../../components';
import {
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  componentSizes,
  DerivedKeyCache,
  getStashItem,
  STASH_KEYS,
  useUnlockThrottle,
} from '@salmon/shared';
import { storeSessionKey, clearSessionKey } from '../../utils/sessionKeyCache';

// ============================================================================
// Types
// ============================================================================

interface LockPageProps {
  onUnlock: (password: string) => Promise<boolean>;
  onUnlockWithCachedKey: (keyCache: DerivedKeyCache) => Promise<boolean>;
  onRemoveAllAccounts: () => Promise<void>;
}

// ============================================================================
// Styled Components
// ============================================================================

/**
 * The lock screen stands in the same water as everything else: the ground is
 * the app's, not a per-screen gradient. The two-stop gradient this replaces
 * was a screen-local invention; the depth ramp is the token that says the same
 * thing, and the marine snow and deep field are what make it water rather than
 * a fade. The password field is opaque, so it occludes the motif where the
 * secret is typed.
 */
const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: spacing['2xl'],
  backgroundColor: colors.background.primary,
  fontFamily: fontFamily.sans,
  ...waterColumnHost,
});

const Content = styled(Box)({
  width: '100%',
  maxWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

const LogoImage = styled('img')({
  width: componentSizes.lockScreenLogoSizeExtension,
  height: componentSizes.lockScreenLogoSizeExtension,
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

const Form = styled('form')({
  width: '100%',
});

const InputContainer = styled(Box)({
  marginBottom: spacing.lg,
});

const StyledInput = styled(InputBase)<{
  $hasError: boolean;
}>(({ $hasError }) => ({
  width: '100%',
  padding: `${componentSizes.inputPaddingVertical}px ${spacing.lg}px`,
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

const ThrottleNotice = styled(Box)({
  marginBottom: spacing.lg,
});

const ErrorText = styled(Typography)({
  color: colors.status.error,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  marginTop: spacing.sm,
  marginLeft: spacing.xs,
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
  '&:hover:not(:disabled)': {
    color: colors.text.primary,
  },
});

// ============================================================================
// Component
// ============================================================================

export function LockPage({
  onUnlock,
  onUnlockWithCachedKey: _onUnlockWithCachedKey,
  onRemoveAllAccounts,
}: LockPageProps) {
  const { t } = useTranslation();
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
        const success = await onUnlock(password);
        if (!success) {
          refreshThrottle();
          setError(t('lock.error.invalid_password', 'Invalid password'));
          setPassword('');
          setShowLoadingScreen(false);
        } else {
          try {
            const derivedKey = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);
            if (derivedKey) {
              await storeSessionKey(derivedKey);
            }
          } catch (cacheError) {
            console.warn('Failed to cache session key:', cacheError);
          }
        }
      } catch {
        setError(t('lock.error.unlock_failed', 'Failed to unlock wallet'));
        setShowLoadingScreen(false);
      } finally {
        setIsUnlocking(false);
      }
    },
    [password, onUnlock, t, refreshThrottle]
  );

  const handleForgotPassword = useCallback(() => {
    setShowResetDialog(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    setShowResetDialog(false);
    setShowConfirmDialog(true);
  }, []);

  const handleFinalConfirm = useCallback(async () => {
    try {
      await onRemoveAllAccounts();
    } catch (err) {
      console.error('Failed to reset wallet:', err);
      setError(t('lock.error.reset_failed', 'Failed to reset wallet. Please try again.'));
    }
  }, [onRemoveAllAccounts, t]);

  return (
    <>
      <Container>
        <WaterColumn />
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
              onClick={handleForgotPassword}
              disabled={isUnlocking}
              data-testid="lock-forgot-password-button"
            >
              {t('lock.forgot_password', 'I forgot my password')}
            </ForgotPasswordButton>
          </Form>
        </Content>

        {/* Reset Wallet Dialog - Step 1 */}
        <ConfirmDialog
          visible={showResetDialog}
          onClose={() => setShowResetDialog(false)}
          title={t('lock.reset_wallet.title', 'Reset Wallet')}
          message={t(
            'lock.reset_wallet.message',
            'If you forgot your password, you will need to reset your wallet. This will permanently delete all accounts and data. You can restore your wallet using your seed phrase after resetting.'
          )}
          confirmText={t('lock.reset_wallet.reset', 'Reset Wallet')}
          cancelText={t('lock.reset_wallet.cancel', 'Cancel')}
          isDanger
          onConfirm={handleResetConfirm}
        />

        {/* Final Confirmation Dialog - Step 2 */}
        <ConfirmDialog
          visible={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          title={t('lock.confirm_reset.title', 'Are you sure?')}
          message={t(
            'lock.confirm_reset.message',
            'This action cannot be undone. All wallet data will be permanently deleted.'
          )}
          confirmText={t('lock.confirm_reset.confirm', 'Delete All Data')}
          cancelText={t('lock.confirm_reset.cancel', 'Cancel')}
          isDanger
          onConfirm={handleFinalConfirm}
        />
      </Container>

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking')}
        showTips={true}
        tipInterval={3000}
      />
    </>
  );
}

export default LockPage;
