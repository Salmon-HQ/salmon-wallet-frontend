/**
 * LockScreen — the unlock screen, once, for the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/LockOverlay/LockContent.tsx`;
 * this screen carries the same anatomy on the same slot grid — the coral mark
 * on the water, "Welcome back", the field, the forgot affordance against it,
 * every piece of feedback in `assist`, the action bottom-most — and the same
 * copy keys, so the two read as one screen. Only what is genuinely the
 * app's is supplied by the caller: how a password is checked, and where to go
 * afterwards. Biometric unlock is mobile-only (spec 013, decision 8).
 *
 * Every ink is read off the live mode: the mark is `accent.fill` (the brand
 * accent, the same ink as the crest it throws — owner, 2026-09-02), the field
 * is `input.ground` inside `input.edge`, the forgot link is `text.primary`.
 *
 * Two behaviours worth naming:
 *
 * - **Feedback lives in `assist`** (spec 013 FR-005): the wrong-password
 *   error and the throttle message both land in the band reserved for them,
 *   so neither displaces the field above nor the action below. The throttle
 *   wins when both hold — it is the one that explains why typing is off.
 * - **The unlock passage is sequential and counted** (DESIGN.md §The wait):
 *   the form sinks to make room for the wait, the wait leaves on its own last
 *   wave, and only then is the release the caller parked — navigation, session
 *   caching — allowed to run. Releasing earlier unmounts this screen mid-wave,
 *   which is the cut `useWaitExit` exists to prevent; here there is no route to
 *   park on, so the release is what parks.
 * - **The action never moves.** While the wallet is throttled the button is
 *   disabled in place and the assist band says when the next attempt is
 *   allowed. Focus follows the notice in both directions so a screen-reader
 *   user is never left wondering why the button went dead.
 */
import styled from '@emotion/styled';
import {
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  opacity,
  spacing,
  useUnlockThrottle,
  useWaitExit,
} from '@salmon/shared';
import type { LockScreenPropsBase } from '@salmon/shared';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, FIELD_SHELL_ERROR_CLASS } from '../../theme';
import { PrimaryButton, TextButton } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingScreen } from '../LoadingScreen';
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';

export interface LockScreenProps extends LockScreenPropsBase {
  /** Ran after a successful unlock — session-key caching, navigation. */
  onUnlocked?: () => void | Promise<void>;
  /** Ran once on mount — clearing a stale session key. */
  onMount?: () => void | Promise<void>;
}

/**
 * The system input, not a variant of it: `componentSizes.inputHeight` tall,
 * `input.ground` fill, the sheet stroke, the control radius — the same field
 * the mobile lock draws.
 */
const Field = styled('input')<{
  $edge: string;
  $ground: string;
  $ink: string;
  $placeholder: string;
}>(({ $edge, $ground, $ink, $placeholder }) => ({
  boxSizing: 'border-box',
  width: '100%',
  height: componentSizes.inputHeight,
  backgroundColor: $ground,
  border: `${borderWidth.sheet}px solid ${$edge}`,
  borderRadius: componentSizes.inputRadius,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  color: $ink,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.bodyLg,
  '&::placeholder': {
    color: $placeholder,
    opacity: opacity.full,
  },
}));

export function LockScreen({
  onUnlock,
  onUnlocked,
  onMount,
  onRemoveAllAccounts,
}: LockScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const { accent, input, status, text } = useSemantic();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  /**
   * Held from a successful unlock until this screen is released: the form sank
   * to make room for the wait and has no right to come back up while the last
   * wave is still leaving.
   */
  const [submerged, setSubmerged] = useState(false);
  const mountedRef = useRef(false);
  const throttleRef = useRef<HTMLDivElement>(null);
  const unlockRef = useRef<HTMLDivElement>(null);

  // The wait stays mounted with `visible={false}` — which is what starts its
  // exit — until it reports its closing wave has left the screen.
  const { held, onExited } = useWaitExit(showLoadingScreen);
  /**
   * Set on a successful unlock instead of releasing immediately: the release
   * unmounts this screen, and an unmounted wait is a wave cut mid-crossing.
   * Consumed exactly once by `handleWaitExited`, whose arrival the wait's own
   * watchdog guarantees, so the release can never be stranded.
   */
  const pendingUnlockRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    onExited();
    if (!pendingUnlockRef.current) return;
    pendingUnlockRef.current = false;
    void onUnlocked?.();
  }, [onExited, onUnlocked]);

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
      setError(t('lock.enter_password_error'));
      return;
    }

    setShowLoadingScreen(true);
    setIsUnlocking(true);
    setError(null);

    try {
      const success = await onUnlock(password);
      if (!success) {
        refreshThrottle();
        setError(t('lock.wrong_password'));
        setPassword('');
        setShowLoadingScreen(false);
        return;
      }
      // Unlocked — but nothing may leave yet. The release is parked and the
      // wave is handed its exit; the form stays down for good.
      pendingUnlockRef.current = true;
      setSubmerged(true);
      setShowLoadingScreen(false);
    } catch {
      setError(t('lock.unlock_failed'));
      setShowLoadingScreen(false);
    } finally {
      setIsUnlocking(false);
    }
  }, [onUnlock, password, refreshThrottle, t]);

  const handleFinalConfirm = useCallback(async () => {
    try {
      await onRemoveAllAccounts();
    } catch {
      setError(t('lock.reset_failed'));
    }
  }, [onRemoveAllAccounts, t]);

  // The field is its own shape owner, so it wears the shell class directly:
  // the accent edge on focus and the keyboard ring are the shared rule's, and
  // only the error edge is decided here.
  const edge = error ? status.danger : input.edge;

  /**
   * The feedback band's two inks. The throttle notice is the warning ink — a
   * message, not a card: the full WarningNotice is ~94px against the assist
   * band's 60, and a card that overflows its band moves the very controls the
   * grid exists to pin.
   */
  const feedback = (ink: string): CSSProperties => ({
    color: ink,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    lineHeight: `${Math.round(fontSize.caption * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
  });

  return (
    <>
      <OnboardingLayout
        testID="lock-screen"
        /*
          The form gives way to the wait: what leaves sinks, and only the form
          leaves — the water stays put behind it (DESIGN.md §Motion, "The wait
          owns its passage, end to end"). A failed unlock puts it back exactly
          where it was; after a successful one it stays down, so the departing
          wave uncovers water rather than the screen the user already left.
        */
        sunk={showLoadingScreen || submerged}
        /*
          `lock`, not `credential`: the same cluster as the create flow's
          password screen, but the always-empty description band collapses so
          "Welcome back" sits one title line above the input — the same air
          that separates the fish from the title (owner decision, 2026-08-18).
        */
        variant="lock"
        background={<WaterColumn />}
        // Coral, not white (owner ruling, 2026-09-01): the lock's mark is
        // `accent.fill`, the button's own salmon, invariant across modes
        // (token settled 2026-09-02) — the same ink as the crest.
        markColor={accent.fill}
        title={<OnboardingTitle>{t('lock.welcome_back')}</OnboardingTitle>}
        body={
          <div style={{ width: '100%' }}>
            <Field
              className={[FIELD_SHELL_CLASS, error ? FIELD_SHELL_ERROR_CLASS : null]
                .filter(Boolean)
                .join(' ')}
              $edge={edge}
              $ground={input.ground}
              $ink={text.primary}
              $placeholder={input.placeholder}
              type="password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event: KeyboardEvent) => {
                if (event.key === 'Enter') void handleSubmit();
              }}
              placeholder={t('lock.enter_password')}
              disabled={isUnlocking || throttled}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              data-testid="lock-password-input"
              aria-label={t('lock.enter_password')}
            />
            {/* The escape hatch belongs to the field it escapes from, so it
              sits directly under it rather than in a band of its own. Primary
              ink, as on mobile: a link in the accent would pull the eye off
              the one control that matters here. */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: spacing.sm }}>
              <TextButton
                onPress={() => setShowResetDialog(true)}
                disabled={isUnlocking}
                color={text.primary}
                testID="lock-forgot-password-button"
              >
                {t('lock.forgot_password')}
              </TextButton>
            </div>
          </div>
        }
        assist={
          throttled ? (
            <div
              ref={throttleRef}
              tabIndex={-1}
              aria-live="polite"
              data-testid="lock-throttle-notice"
            >
              <p style={feedback(status.warning)}>
                {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
              </p>
            </div>
          ) : error ? (
            <p style={feedback(status.danger)} aria-live="polite" data-testid="lock-error">
              {error}
            </p>
          ) : null
        }
        action={
          <div ref={unlockRef} tabIndex={-1}>
            <PrimaryButton
              onPress={() => void handleSubmit()}
              disabled={!password.trim() || throttled}
              loading={isUnlocking}
              fullWidth
              testID="lock-unlock-button"
            >
              {t('lock.unlock')}
            </PrimaryButton>
          </div>
        }
      />

      <ConfirmDialog
        visible={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title={t('lock.reset_wallet_title')}
        message={t('lock.reset_wallet_message')}
        confirmText={t('lock.reset_button')}
        cancelText={t('lock.cancel')}
        isDanger
        onConfirm={async () => {
          setShowResetDialog(false);
          setShowConfirmDialog(true);
        }}
      />

      <ConfirmDialog
        visible={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title={t('lock.confirm_title')}
        message={t('lock.confirm_message')}
        confirmText={t('lock.delete_button')}
        cancelText={t('lock.cancel')}
        isDanger
        onConfirm={handleFinalConfirm}
      />

      {held && (
        <LoadingScreen
          visible={showLoadingScreen}
          title={t('lock.unlocking')}
          showTips
          tipInterval={3000}
          onExited={handleWaitExited}
        />
      )}
    </>
  );
}
