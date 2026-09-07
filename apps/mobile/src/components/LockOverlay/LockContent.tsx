/**
 * LockContent — the lock screen's body, rendered inside `LockOverlay`.
 *
 * Contains all lock screen business logic:
 * - Biometric auto-prompt (Face ID / Touch ID)
 * - Password fallback input
 * - Forgot password / reset wallet
 *
 * Coverage and touch blocking are the overlay's job, not this component's.
 */

import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  spacing,
  borderWidth,
  componentSizes,
  s,
  useFieldFocus,
  useUnlockThrottle,
  FLOAT_DELAY_MS,
  FLOAT_IN_MS,
  type Semantic,
} from '@salmon/shared';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Alert,
  AppState,
  findNodeHandle,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useSemantic, useThemeMode, useThemedStyles } from '../../theme/useThemedStyles';
import { useWaitPassage } from '../../utils/useWaitPassage';
import { PrimaryButton, TextButton } from '../Button';
import { DepthBackground } from '../DepthBackground';
import { LoadingScreen } from '../LoadingScreen';
import { OnboardingLayout, OnboardingTitle, ReservedSlot } from '../OnboardingLayout';
import { ScalesBackground } from '../ScalesBackground';
import type { LockContentProps } from './types';

export type { LockContentProps };

// ============================================================================
// Constants
// ============================================================================

/**
 * The beat between the app going active and the biometric prompt.
 *
 * iOS reports `active` a moment before the view is presented, and a prompt
 * raised in that gap silently never appears. Device-calibrated, not derived.
 */
const PROMPT_SETTLE_MS = 400;

// ============================================================================
// Component
// ============================================================================

export function LockContent({
  locked,
  onUnlock,
  onRemoveAllAccounts,
  onUnlockExited,
  biometric,
}: LockContentProps) {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const semantic = useSemantic();
  const styles = useThemedStyles(stylesFor);

  // Extract biometric properties
  const biometricUnlock = biometric?.unlock;
  const refreshBiometricState = biometric?.refresh;

  // State
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  /**
   * Held from a successful unlock until the next lock: the form sank to make
   * room for the wait and has no right to come back up. Dropping `visible`
   * alone would remount the cluster under the departing wave, so the last
   * wave would uncover the very fish, title and input that already left.
   * What the wave uncovers after a success is the water column alone —
   * ground, beat, then the gate's rise (DESIGN.md §Motion).
   */
  const [submerged, setSubmerged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * The calmer half of the assist band: something the user has to know but has
   * not done wrong. Today it carries exactly one message — the OS destroyed
   * the biometric enrolment and it has to be turned back on. Kept apart from
   * `error` so a re-enrolment notice does not arrive in the wrong-password ink.
   */
  const [notice, setNotice] = useState<string | null>(null);
  const { focused, onFocus, onBlur } = useFieldFocus();

  // Whether to show the password fallback UI
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // Whether biometric state has been determined
  const [biometricReady, setBiometricReady] = useState(false);

  // The passage into the wait: when the unlock wait rises, the lock form
  // sinks under it — the same verb every step swap in the app speaks. The
  // wait itself owns the beat on its way in.
  const { exiting: waitExiting } = useWaitPassage(showLoadingScreen);

  // Failed attempts cost time. The wait is shown, never silent — an input that
  // stops answering with no explanation reads as a broken wallet.
  const {
    remainingMs: throttleRemainingMs,
    remainingSeconds: throttleRemainingSeconds,
    refresh: refreshThrottle,
  } = useUnlockThrottle(locked);
  const throttled = throttleRemainingMs > 0;

  // The throttle notice appears in the assist band while the button goes
  // dead. A screen-reader user is carried to the notice when it arrives and
  // back to the button when the wait ends, so the state change is never
  // silent.
  const throttleRef = useRef<View>(null);
  const unlockRef = useRef<View>(null);
  const wasThrottled = useRef(false);

  useEffect(() => {
    if (throttled === wasThrottled.current) return;
    wasThrottled.current = throttled;
    const target = throttled ? throttleRef.current : unlockRef.current;
    if (!target) return;
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [throttled]);

  // Track if we've already auto-prompted biometric for this lock session
  const hasAutoPromptedBiometric = useRef(false);
  const biometricInProgress = useRef(false);

  // Can we use biometric for unlock?
  const canUseBiometric = !!biometric?.available && !!biometric?.armed && !!biometricUnlock;

  const biometricActionLabel = (() => {
    switch (biometric?.kind) {
      case 'facial':
        return t('lock.use_face_id');
      case 'fingerprint':
        return t('lock.use_touch_id');
      case 'iris':
        return t('lock.use_iris');
      default:
        return t('lock.use_biometric');
    }
  })();

  // Reset state on *entering* locked, never on leaving it. After a successful
  // unlock `locked` flips false while the gate is still held and this
  // component still mounted — resetting there stripped the fallback UI
  // mid-unlock, so a bare fish and title rode the exit for its whole length.
  // A fresh lock session is the moment stale state must go.
  useEffect(() => {
    if (locked) {
      hasAutoPromptedBiometric.current = false;
      setBiometricReady(false);
      setShowPasswordFallback(false);
      setPassword('');
      setError(null);
      setNotice(null);
      setSubmerged(false);
    }
  }, [locked]);

  // Refresh biometric state when locked
  useEffect(() => {
    if (!locked) return;

    let cancelled = false;
    const init = async () => {
      if (refreshBiometricState) {
        await refreshBiometricState();
      }
      if (!cancelled) {
        setBiometricReady(true);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [locked, refreshBiometricState]);

  // Password unlock
  /** Same condition the button, its a11y state and its fill all read. */
  const unlockDisabled = isLoading || throttled || !password.trim();

  /**
   * Set on a successful unlock instead of releasing the gate immediately —
   * the release unmounts this component, and an unmounted wait is a wave cut
   * mid-crossing. Consumed exactly once by `handleWaitExited`.
   */
  const pendingUnlockRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    if (!pendingUnlockRef.current) return;
    pendingUnlockRef.current = false;
    onUnlockExited?.();
  }, [onUnlockExited]);

  /**
   * The wait's own report that it is drawing, parked so the unlock can wait on
   * it. See `waitForWait` below.
   */
  const waitReadyRef = useRef<(() => void) | null>(null);
  const handleWaitReady = useCallback(() => {
    const resolve = waitReadyRef.current;
    waitReadyRef.current = null;
    resolve?.();
  }, []);
  /**
   * Hold the unlock until the wait is actually on screen and running.
   *
   * Deriving the vault key blocks the JS thread, and the front cannot draw
   * until the emitter's `onLayout` has been processed — also on the JS thread.
   * Starting the derivation on a fixed delay was a bet that the measurement
   * had landed in time; when it had not, the whole derivation played out
   * against a still mark and still words, and the water only appeared once the
   * thread came back. So the derivation waits for the report instead of
   * guessing at it.
   *
   * Bounded by the wait's own entrance, and the bound is a watchdog, not the
   * mechanism: if the report never comes, the unlock proceeds rather than
   * stranding the user on a screen that will not move on either.
   */
  const waitForWait = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const watchdog = setTimeout(() => {
          waitReadyRef.current = null;
          resolve();
        }, FLOAT_DELAY_MS + FLOAT_IN_MS);
        waitReadyRef.current = () => {
          clearTimeout(watchdog);
          resolve();
        };
      }),
    []
  );

  /**
   * The unlock, whichever way the password arrived.
   *
   * A biometric unlock recovers the password from the keychain and lands
   * here, so both routes derive the vault key the same way, take the same
   * wait, and answer the same throttle. The biometric path used to skip all
   * of it by carrying a pre-derived key — which is precisely what made it
   * possible for that key to go stale while the password never could.
   *
   * @param secret - the password to try
   * @param typed - whether the user typed it, which decides whether a failure
   * is a wrong password (theirs to correct) or a stale seal (ours).
   */
  const runUnlock = useCallback(
    async (secret: string, typed: boolean): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setNotice(null);
      Keyboard.dismiss();

      // The wait, up before the work: unlocking derives the vault key on the JS
      // thread, and a screen that appears after the freeze has explained nothing.
      setShowLoadingScreen(true);
      // Not a yield but a handshake: the wave has to be crossing before the
      // crypto takes the thread, and only the wait knows when it is.
      await waitForWait();

      try {
        const success = await onUnlock(secret);
        if (!success) {
          // Back to the input, never stranded on the wave: dropping `visible`
          // starts the wave's exit while this screen — still gate-held locked on
          // a failure — stays mounted under it with the error in the assist band.
          refreshThrottle();
          setError(typed ? t('lock.wrong_password') : t('lock.biometric_unlock_failed'));
          setPassword('');
          setShowPasswordFallback(true);
          setShowLoadingScreen(false);
          return;
        }
        // Unlocked — but the gate may not open yet. `locked` has already flipped
        // in shared state; the owner keeps the gate rendered as locked until
        // `handleWaitExited` reports the last wave has left the screen
        // (LoadingScreen's watchdog guarantees that report). The release is
        // parked, the wave is handed its exit.
        pendingUnlockRef.current = true;
        // The form stays down for good — see `submerged`.
        setSubmerged(true);
        setShowLoadingScreen(false);
      } catch (err) {
        console.error('Unlock failed:', err);
        setError(t('lock.unlock_failed'));
        setPassword('');
        setShowPasswordFallback(true);
        setShowLoadingScreen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [onUnlock, t, refreshThrottle, waitForWait]
  );

  const handleUnlock = useCallback(async () => {
    if (!password.trim()) {
      setError(t('lock.enter_password_error'));
      return;
    }

    await runUnlock(password, true);
  }, [password, runUnlock, t]);

  /**
   * Biometric unlock.
   *
   * Every branch is named. The old version collapsed four situations into one
   * `null` and answered all of them by silently showing the password field —
   * which is how a user whose Face ID had been destroyed by the OS was left
   * looking at a Settings switch that still read "on", with no way to turn it
   * back on and nothing on screen saying why.
   */
  const handleBiometricUnlock = useCallback(async () => {
    if (!biometricUnlock) return;
    if (biometricInProgress.current) return;

    biometricInProgress.current = true;
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const result = await biometricUnlock();

      switch (result.status) {
        case 'ok':
          await runUnlock(result.password, false);
          return;
        // The user said no, or the sensor cannot answer right now (screen
        // locked, nothing enrolled). Neither is a failure and neither costs
        // the enrolment: the field appears, saying nothing.
        case 'cancelled':
        case 'unavailable':
          setShowPasswordFallback(true);
          return;
        // The OS destroyed the key — a Face ID reset, a new fingerprint. The
        // store has already dropped both records, so the only honest thing
        // left is to say so and point at where it is turned back on.
        case 'invalidated':
          setNotice(t('lock.biometric_invalidated'));
          setShowPasswordFallback(true);
          return;
        case 'failed':
          setError(t('lock.biometric_unlock_failed'));
          setShowPasswordFallback(true);
          return;
      }
    } catch (err) {
      console.error('Biometric unlock failed:', err);
      setError(t('lock.biometric_unlock_failed'));
      setShowPasswordFallback(true);
    } finally {
      setIsLoading(false);
      biometricInProgress.current = false;
    }
  }, [biometricUnlock, runUnlock, t]);

  /**
   * The one automatic prompt per lock session.
   *
   * It waits for the app to be foreground-active, then for the screen to
   * settle: iOS reports `active` slightly before the view is actually
   * presented, and a prompt raised in that window never appears. That is what
   * `PROMPT_SETTLE_MS` is for, and it is the one guess left here — a real
   * device needs the beat, so it stays, named.
   *
   * What is gone is the part that was papering over a bug: the read used to
   * race a 30-second timer and resolve `null` with the Face ID sheet still on
   * screen, so the user authenticated into a promise nobody was holding. The
   * prompt's own result reports what happened now.
   */
  useEffect(() => {
    if (!locked || !biometricReady || hasAutoPromptedBiometric.current) return;

    if (!canUseBiometric) {
      hasAutoPromptedBiometric.current = true;
      setShowPasswordFallback(true);
      // Someone who had Face ID before this update finds it gone: the old
      // credential could not be carried over (see `migrateLegacyRecords`).
      // Told once, with where to turn it back on, rather than left to notice.
      if (biometric?.needsReArm) setNotice(t('lock.biometric_needs_rearm'));
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let subscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const prompt = () => {
      if (hasAutoPromptedBiometric.current) return;
      hasAutoPromptedBiometric.current = true;
      timer = setTimeout(() => {
        void handleBiometricUnlock();
      }, PROMPT_SETTLE_MS);
    };

    if (AppState.currentState === 'active') {
      prompt();
    } else {
      subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          subscription?.remove();
          subscription = null;
          prompt();
        }
      });
    }

    return () => {
      if (timer !== null) clearTimeout(timer);
      subscription?.remove();
    };
    // `handleBiometricUnlock` is deliberately not a dependency: it changes
    // identity with every unlock attempt, and re-running this effect would
    // re-prompt. The one-shot ref above is what gates the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, biometricReady, canUseBiometric]);

  // Forgot password
  const handleForgotPassword = useCallback(() => {
    Alert.alert(t('lock.reset_wallet_title'), t('lock.reset_wallet_message'), [
      { text: t('lock.cancel'), style: 'cancel' },
      {
        text: t('lock.reset_button'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('lock.confirm_title'), t('lock.confirm_message'), [
            { text: t('lock.cancel'), style: 'cancel' },
            {
              text: t('lock.delete_button'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await onRemoveAllAccounts();
                } catch (err) {
                  console.error('Failed to reset wallet:', err);
                  Alert.alert(t('general.error'), t('lock.reset_failed'));
                }
              },
            },
          ]);
        },
      },
    ]);
  }, [onRemoveAllAccounts, t]);

  const inputBorderColor = error
    ? semantic.status.danger
    : focused
      ? semantic.accent.ink
      : semantic.input.edge;

  return (
    <>
      {/* The bar's glyphs are the inverse of the ground under them, and the
          lock's ground is the app's own water. */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {/*
        The lock carries the water column (DESIGN.md §the lock screen): the
        same ground the swap task modal mounts — depth ramp, deep-field
        scales. It is mounted *outside* the layout, the way the
        swap task modal mounts it outside its steps, because the ground never
        travels: when the unlock wait rises, the form below sinks and the
        water stays. The ground color sits under the ramp so nothing behind
        the gate can ever show through while it paints.
      */}
      <View style={styles.ground}>
        <DepthBackground />
        <ScalesBackground variant="deepField" />
        {/* The form gives way to the wait with the passage's sink; on a
            failed unlock it returns under the wait's own ebb, exactly where
            it was. After a successful one it stays down: the wave leaves on
            bare water. */}
        {!showLoadingScreen && !submerged && (
          <Animated.View style={styles.passage} exiting={waitExiting}>
            <OnboardingLayout
              testID="lock-screen"
              /*
                `lock`, not `credential`: the same cluster as the create flow's
                password screen, but the always-empty description band collapses so
                "Welcome back" sits one title line above the input — the same air
                that separates the fish from the title (owner decision, 2026-08-18).
              */
              variant="lock"
              // Coral, not white (owner ruling, 2026-09-01): the lock's mark
              // is `accent.fill`, the button's own salmon, invariant across
              // modes (token settled 2026-09-02) — the same ink as the crest.
              markColor={semantic.accent.fill}
              title={<OnboardingTitle>{t('lock.welcome_back')}</OnboardingTitle>}
              body={
                /*
            Reserved, not deleted. The biometric variant used to hold the field
            and every control below it inside one guard, so failing Face ID
            moved the mark 115pt down the screen at the exact moment the user
            was already mildly alarmed. The bands stand either way now.
          */
                <ReservedSlot visible={showPasswordFallback}>
                  {/* Anchored to the top of the band, like the DOM twin — the band
                is sized for two fields, and centring one field in it left it
                floating over ~66pt of air. */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      testID="lock-password-input"
                      accessibilityLabel={t('lock.enter_password')}
                      style={[styles.input, { borderColor: inputBorderColor }]}
                      placeholder={t('lock.enter_password')}
                      placeholderTextColor={semantic.text.secondary}
                      secureTextEntry
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError(null);
                      }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      onSubmitEditing={handleUnlock}
                      editable={!isLoading && !throttled}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    {/* The escape hatch belongs to the field it escapes from, so it
                  sits directly under it rather than in a band of its own. */}
                    <View style={styles.forgotRow}>
                      <TextButton
                        testID="lock-forgot-password-button"
                        onPress={handleForgotPassword}
                        disabled={isLoading}
                        color={semantic.text.primary}
                      >
                        {t('lock.forgot_password')}
                      </TextButton>
                    </View>
                  </View>
                </ReservedSlot>
              }
              assist={
                /*
            The feedback band, as spec 013 FR-005 assigns it: the throttle
            notice and the wrong-password error both land here, so neither
            displaces the field above nor the button below. The throttle wins
            when both hold — it is the one that explains why typing is off.
          */
                throttled ? (
                  <View
                    ref={throttleRef}
                    accessible
                    accessibilityLiveRegion="polite"
                    testID="lock-throttle-notice"
                  >
                    <Text style={styles.throttleText}>
                      {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
                    </Text>
                  </View>
                ) : error ? (
                  <Text
                    testID="lock-error"
                    accessibilityLiveRegion="polite"
                    style={styles.errorText}
                  >
                    {error}
                  </Text>
                ) : notice ? (
                  <Text
                    testID="lock-notice"
                    accessibilityLiveRegion="polite"
                    style={styles.throttleText}
                  >
                    {notice}
                  </Text>
                ) : null
              }
              secondary={
                <ReservedSlot visible={!!canUseBiometric && showPasswordFallback}>
                  <TextButton
                    testID="lock-biometric-button"
                    onPress={() => {
                      void handleBiometricUnlock();
                    }}
                    disabled={isLoading}
                    color={semantic.accent.ink}
                  >
                    {biometricActionLabel}
                  </TextButton>
                </ReservedSlot>
              }
              action={
                /*
            The button holds its spot in every state. While throttled it is
            disabled and the assist band above says why — and for how long —
            so nothing moves. Focus follows the notice in both directions.
          */
                <ReservedSlot visible={showPasswordFallback}>
                  <View ref={unlockRef}>
                    <PrimaryButton
                      testID="lock-unlock-button"
                      onPress={handleUnlock}
                      disabled={unlockDisabled}
                      loading={isLoading}
                    >
                      {t('lock.unlock')}
                    </PrimaryButton>
                  </View>
                </ReservedSlot>
              }
            />
          </Animated.View>
        )}
      </View>

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking') || 'Unlocking Wallet'}
        showTips={true}
        tipInterval={3000}
        onExited={handleWaitExited}
        onReady={handleWaitReady}
        /* The one wait in the app that does not surface the shell. This one
           sits inside an overlay that outlives it by a beat, so surfacing here
           floated Home while it was still covered — and the overlay then left
           on content that had already arrived. The surfacing belongs to the
           overlay's release; see `(app)/_layout.tsx`. */
        surfaces={false}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /** The water column's host — the one layer of this screen that never moves. */
    ground: {
      flex: 1,
      backgroundColor: t.depth.column,
    },
    /** The form's travel frame for the passage into and out of the wait. */
    passage: {
      flex: 1,
    },
    inputContainer: {
      width: '100%',
    },
    forgotRow: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    /**
     * The system input, not a variant of it. The field used to sit at
     * `borderRadius.badge` (9) with a scaled 54pt height — its own control
     * shape, on the one screen a returning user sees most.
     */
    input: {
      width: '100%',
      height: componentSizes.inputHeight,
      backgroundColor: t.input.ground,
      borderWidth: borderWidth.sheet,
      borderRadius: componentSizes.inputRadius,
      paddingHorizontal: spacing.lg,
      color: t.text.primary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.bodyLg),
    },
    errorText: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.normal,
      textAlign: 'center',
    },
    /**
     * The error's shape in the warning ink — a message, not a card. The full
     * WarningNotice is ~94pt against the assist band's 60, and a card that
     * overflows its band moves the very controls the grid exists to pin.
     */
    throttleText: {
      color: t.status.warning,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.normal,
      textAlign: 'center',
    },
  });
