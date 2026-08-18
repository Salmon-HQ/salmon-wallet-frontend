/**
 * LockScreen — the unlock screen, once, for web and extension.
 *
 * `apps/web/src/pages/lock/LockPage.tsx` and
 * `apps/extension/src/pages/lock/LockPage.tsx` were near-verbatim duplicates:
 * same element order, same styled components, same numbers, diverging in
 * exactly two places (web hardcoded `72` and `'14px 16px'` where the extension
 * read tokens). Two files kept in sync by hand drift by construction, so the
 * screen lives here and the apps supply only what is genuinely theirs — how a
 * password is checked, and where to go afterwards.
 *
 * It composes on the onboarding slot grid, which is the point: unlock is the
 * most-seen screen in the product and the one a returning user meets right
 * after onboarding, and its primary action used to sit 307px higher than the
 * onboarding password screen's. On the grid the two agree by construction.
 *
 * Two behaviours worth naming:
 *
 * - **The wrong-password error sits against the field it describes**, inside
 *   `body`, rather than in a band of its own. It used to push the mark up
 *   11.5px and the action down 11.5px every time it appeared.
 * - **The throttled notice takes the action's place.** While the wallet is
 *   throttled the button cannot be pressed anyway, so the notice occupies the
 *   exact spot the user was about to press, says when the next attempt is
 *   allowed, and nothing moves. Focus follows the swap in both directions so a
 *   screen-reader user is never left on a node that vanished.
 */
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import {
  colors,
  componentSizes,
  fontFamily,
  fontSize,
  semantic,
  spacing,
  useUnlockThrottle,
} from '@salmon/shared';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { PrimaryButton, TextButton } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingScreen } from '../LoadingScreen';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WarningNotice } from '../WarningNotice';
import { WaterColumn } from '../WaterColumn';

export interface LockScreenProps {
  /** Checks the password. Resolves true when the wallet is unlocked. */
  onUnlock: (password: string) => Promise<boolean>;
  /** Ran after a successful unlock — session-key caching, navigation. */
  onUnlocked?: () => void | Promise<void>;
  /** Ran once on mount — clearing a stale session key. */
  onMount?: () => void | Promise<void>;
  /** Wipes the wallet after the two-step confirmation. */
  onRemoveAllAccounts: () => Promise<void>;
}

const StyledInput = styled(InputBase)<{ $hasError: boolean }>(({ $hasError }) => ({
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

const ErrorText = styled(Typography)({
  color: semantic.status.danger,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  marginTop: spacing.sm,
  marginLeft: spacing.xs,
});

export function LockScreen({
  onUnlock,
  onUnlocked,
  onMount,
  onRemoveAllAccounts,
}: LockScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const mountedRef = useRef(false);
  const throttleRef = useRef<HTMLDivElement>(null);
  const unlockRef = useRef<HTMLDivElement>(null);

  // Failed attempts cost time. Show the cost instead of a prompt that has
  // quietly stopped answering.
  const {
    remainingMs: throttleRemainingMs,
    remainingSeconds: throttleRemainingSeconds,
    refresh: refreshThrottle,
  } = useUnlockThrottle();
  const throttled = throttleRemainingMs > 0;

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    void onMount?.();
  }, [onMount]);

  // The control and the notice swap in the same band. Whichever arrives takes
  // focus, so nobody is left focused on a node that no longer exists.
  const wasThrottled = useRef(throttled);
  useEffect(() => {
    if (wasThrottled.current === throttled) return;
    wasThrottled.current = throttled;
    (throttled ? throttleRef : unlockRef).current?.focus();
  }, [throttled]);

  const handleSubmit = useCallback(async () => {
    if (!password.trim()) {
      setError(t('lock.error.empty_password'));
      return;
    }

    setShowLoadingScreen(true);
    setIsUnlocking(true);
    setError(null);

    try {
      const success = await onUnlock(password);
      if (!success) {
        refreshThrottle();
        setError(t('lock.error.invalid_password'));
        setPassword('');
        setShowLoadingScreen(false);
        return;
      }
      await onUnlocked?.();
    } catch {
      setError(t('lock.error.unlock_failed'));
      setShowLoadingScreen(false);
    } finally {
      setIsUnlocking(false);
    }
  }, [onUnlock, onUnlocked, password, refreshThrottle, t]);

  const handleFinalConfirm = useCallback(async () => {
    try {
      await onRemoveAllAccounts();
    } catch {
      setError(t('lock.error.reset_failed'));
    }
  }, [onRemoveAllAccounts, t]);

  return (
    <>
      <OnboardingLayout
        testID="lock-screen"
        variant="credential"
        background={<WaterColumn />}
        title={<OnboardingTitle>{t('lock.title')}</OnboardingTitle>}
        description={<OnboardingDescription>{t('lock.subtitle')}</OnboardingDescription>}
        body={
          <Box sx={{ width: '100%' }}>
            <StyledInput
              type="password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter') void handleSubmit();
              }}
              placeholder={t('lock.password_placeholder')}
              $hasError={!!error}
              disabled={isUnlocking || throttled}
              autoFocus
              fullWidth
              inputProps={{
                'data-testid': 'lock-password-input',
                'aria-label': t('lock.password_placeholder'),
              }}
            />
            {/* Feedback about the field above it, so it sits against that
                field rather than displacing anything. */}
            {error && <ErrorText data-testid="lock-error">{error}</ErrorText>}
          </Box>
        }
        assist={
          <TextButton
            onClick={() => setShowResetDialog(true)}
            disabled={isUnlocking}
            testID="lock-forgot-password-button"
          >
            {t('lock.forgot_password')}
          </TextButton>
        }
        action={
          throttled ? (
            <Box
              ref={throttleRef}
              tabIndex={-1}
              aria-live="polite"
              data-testid="lock-throttle-notice"
            >
              <WarningNotice tone="warning" title={t('lock.throttled_title')}>
                {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
              </WarningNotice>
            </Box>
          ) : (
            <Box ref={unlockRef} tabIndex={-1}>
              <PrimaryButton
                onClick={() => void handleSubmit()}
                disabled={!password.trim()}
                loading={isUnlocking}
                fullWidth
                testID="lock-unlock-button"
              >
                {t('lock.unlock')}
              </PrimaryButton>
            </Box>
          )
        }
      />

      <ConfirmDialog
        visible={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title={t('lock.reset_wallet.title')}
        message={t('lock.reset_wallet.message')}
        confirmText={t('lock.reset_wallet.reset')}
        cancelText={t('lock.reset_wallet.cancel')}
        isDanger
        onConfirm={async () => {
          setShowResetDialog(false);
          setShowConfirmDialog(true);
        }}
      />

      <ConfirmDialog
        visible={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title={t('lock.confirm_reset.title')}
        message={t('lock.confirm_reset.message')}
        confirmText={t('lock.confirm_reset.confirm')}
        cancelText={t('lock.confirm_reset.cancel')}
        isDanger
        onConfirm={handleFinalConfirm}
      />

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking')}
        showTips
        tipInterval={3000}
      />
    </>
  );
}
