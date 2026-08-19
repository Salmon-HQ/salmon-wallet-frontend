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
 * - **Feedback lives in `assist`** (spec 013 FR-005): the wrong-password
 *   error and the throttle message both land in the band reserved for them,
 *   so neither displaces the field above nor the action below. The throttle
 *   wins when both hold — it is the one that explains why typing is off.
 * - **The action never moves.** While the wallet is throttled the button is
 *   disabled in place and the assist band says when the next attempt is
 *   allowed. Focus follows the notice in both directions so a screen-reader
 *   user is never left wondering why the button went dead.
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
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
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
  fontSize: fontSize.bodyLg,
  fontFamily: fontFamily.sans,
  backgroundColor: colors.input.background,
  border: `1px solid ${$hasError ? semantic.status.danger : colors.input.border}`,
  borderRadius: componentSizes.inputRadius,
  color: colors.text.primary,
  transition: 'border-color 0.15s ease',
  '&.Mui-focused': {
    borderColor: $hasError ? semantic.status.danger : colors.accent.primary,
  },
}));

const ErrorText = styled(Typography)({
  color: semantic.status.danger,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  textAlign: 'center',
});

/**
 * The error's shape in the warning ink — a message, not a card. The full
 * WarningNotice is ~94px against the assist band's 60, and a card that
 * overflows its band moves the very controls the grid exists to pin.
 */
const ThrottleText = styled(Typography)({
  color: semantic.status.warning,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  textAlign: 'center',
});

const ForgotRow = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  marginTop: spacing.sm,
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
        /*
          `lock`, not `credential`: the same cluster as the create flow's
          password screen, but the always-empty description band collapses so
          the title sits one title line above the input — the same air that
          separates the fish from the title (owner decision, 2026-08-18). The
          subtitle came off with it, mirroring mobile, which never carried one:
          the collapsed band holds no line of copy.
        */
        variant="lock"
        background={<WaterColumn />}
        title={<OnboardingTitle>{t('lock.title')}</OnboardingTitle>}
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
            {/* The escape hatch belongs to the field it escapes from, so it
                sits directly under it rather than in a band of its own. */}
            <ForgotRow>
              <TextButton
                onClick={() => setShowResetDialog(true)}
                disabled={isUnlocking}
                testID="lock-forgot-password-button"
              >
                {t('lock.forgot_password')}
              </TextButton>
            </ForgotRow>
          </Box>
        }
        assist={
          throttled ? (
            <Box
              ref={throttleRef}
              tabIndex={-1}
              aria-live="polite"
              data-testid="lock-throttle-notice"
            >
              <ThrottleText>
                {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
              </ThrottleText>
            </Box>
          ) : error ? (
            <ErrorText aria-live="polite" data-testid="lock-error">
              {error}
            </ErrorText>
          ) : null
        }
        action={
          <Box ref={unlockRef} tabIndex={-1}>
            <PrimaryButton
              onClick={() => void handleSubmit()}
              disabled={!password.trim() || throttled}
              loading={isUnlocking}
              fullWidth
              testID="lock-unlock-button"
            >
              {t('lock.unlock')}
            </PrimaryButton>
          </Box>
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
