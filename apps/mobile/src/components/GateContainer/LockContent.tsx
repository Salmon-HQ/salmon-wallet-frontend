/**
 * LockContent — Content rendered inside GateContainer when state is 'locked'
 *
 * Contains all lock screen business logic:
 * - Biometric auto-prompt (Face ID / Touch ID)
 * - Password fallback input
 * - Forgot password / reset wallet
 *
 * Does NOT contain any animation logic — that's handled by GateContainer.
 */

import {
  colors,
  fontFamilyNative,
  fontSize,
  lineHeight,
  spacing,
  borderWidth,
  componentSizes,
  semantic,
  useUnlockThrottle,
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

import { PrimaryButton, TextButton } from '../Button';
import { DepthBackground } from '../DepthBackground';
import { LoadingScreen } from '../LoadingScreen';
import { OnboardingLayout, OnboardingTitle, ReservedSlot } from '../OnboardingLayout';
import { ScalesBackground } from '../ScalesBackground';
import type { BiometricConfig } from './types';

// ============================================================================
// Props
// ============================================================================

export interface LockContentProps {
  /** Whether the lock screen is active */
  locked: boolean;
  /** Callback to attempt unlock with password */
  onUnlock: (password: string) => Promise<boolean>;
  /** Callback to unlock with cached derived key (biometric) */
  onUnlockWithKey?: (keyJson: string) => Promise<boolean>;
  /** Callback to get derived key after password unlock */
  onGetDerivedKey?: () => Promise<string | null>;
  /** Callback to remove all accounts (reset wallet) */
  onRemoveAllAccounts: () => Promise<void>;
  /**
   * Called once the unlock wait's closing wave has fully left the screen after
   * a successful unlock. The owner holds the gate in its locked state until
   * this fires — releasing it earlier unmounts this component (and the wave)
   * mid-crossing, the same hard cut the password screen's parked route exists
   * to prevent. LoadingScreen's own watchdog guarantees the exit callback, so
   * the gate cannot be stranded.
   */
  onUnlockExited?: () => void;
  /** Biometric configuration */
  biometric?: BiometricConfig;
}

// ============================================================================
// Component
// ============================================================================

export function LockContent({
  locked,
  onUnlock,
  onUnlockWithKey,
  onRemoveAllAccounts,
  onUnlockExited,
  biometric,
}: LockContentProps) {
  const { t } = useTranslation();

  // Extract biometric properties
  const biometricState = biometric?.state;
  const authenticateWithBiometric = biometric?.authenticateWithBiometric;
  const enableBiometric = biometric?.enableBiometric ?? false;
  const refreshBiometricState = biometric?.refreshState;

  // State
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Whether to show the password fallback UI
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // Whether biometric state has been determined
  const [biometricReady, setBiometricReady] = useState(false);

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
  const canUseBiometric =
    biometricState?.isAvailable &&
    biometricState?.hasStoredKey &&
    enableBiometric &&
    !!onUnlockWithKey &&
    !!authenticateWithBiometric;

  const biometricActionLabel = (() => {
    switch (biometricState?.biometricType) {
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

  // Reset state when unlocked
  useEffect(() => {
    if (!locked) {
      hasAutoPromptedBiometric.current = false;
      setBiometricReady(false);
      setShowPasswordFallback(false);
      setPassword('');
      setError(null);
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

  // Biometric unlock handler
  const handleBiometricUnlock = useCallback(async () => {
    if (!onUnlockWithKey || !authenticateWithBiometric) return;
    if (biometricInProgress.current) return;

    biometricInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const keyJson = await authenticateWithBiometric();
      if (!keyJson) {
        setShowPasswordFallback(true);
        return;
      }
      const success = await onUnlockWithKey(keyJson);
      if (!success) {
        setError(t('lock.biometric_unlock_failed') || 'Biometric unlock failed');
        setShowPasswordFallback(true);
      }
    } catch (err) {
      console.error('Biometric unlock failed:', err);
      setError(t('lock.biometric_unlock_failed') || 'Biometric unlock failed');
      setShowPasswordFallback(true);
    } finally {
      setIsLoading(false);
      biometricInProgress.current = false;
    }
  }, [onUnlockWithKey, authenticateWithBiometric, t]);

  // Auto-prompt biometric — only when app is active to avoid hanging the native prompt
  useEffect(() => {
    if (!locked || !biometricReady || hasAutoPromptedBiometric.current) return;

    if (!canUseBiometric) {
      hasAutoPromptedBiometric.current = true;
      setShowPasswordFallback(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let subscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const prompt = () => {
      if (hasAutoPromptedBiometric.current) return;
      hasAutoPromptedBiometric.current = true;
      timer = setTimeout(() => {
        void handleBiometricUnlock();
      }, 400);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, biometricReady]);

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

  const handleUnlock = useCallback(async () => {
    if (!password.trim()) {
      setError(t('lock.enter_password_error'));
      return;
    }

    setIsLoading(true);
    setError(null);
    Keyboard.dismiss();

    // The wait, up before the work: unlocking derives the vault key on the JS
    // thread, and a screen that appears after the freeze has explained nothing.
    setShowLoadingScreen(true);
    // Yield to UI thread so LoadingScreen renders before heavy crypto derivation
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const success = await onUnlock(password);
      if (!success) {
        // Back to the input, never stranded on the wave: dropping `visible`
        // starts the wave's exit while this screen — still gate-held locked on
        // a failure — stays mounted under it with the error in the assist band.
        refreshThrottle();
        setError(t('lock.wrong_password'));
        setPassword('');
        setShowLoadingScreen(false);
        return;
      }
      // Unlocked — but the gate may not open yet. `locked` has already flipped
      // in shared state; the owner keeps the gate rendered as locked until
      // `handleWaitExited` reports the last wave has left the screen
      // (LoadingScreen's watchdog guarantees that report). The release is
      // parked, the wave is handed its exit.
      pendingUnlockRef.current = true;
      setShowLoadingScreen(false);
    } catch (err) {
      console.error('Unlock failed:', err);
      setError(t('lock.unlock_failed'));
      setPassword('');
      setShowLoadingScreen(false);
    } finally {
      setIsLoading(false);
    }
  }, [password, onUnlock, t, refreshThrottle]);

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

  const getInputBorderColor = () => {
    if (error) return semantic.status.danger;
    if (isFocused) return colors.accent.primary;
    return colors.input.border;
  };

  return (
    <>
      <StatusBar style="light" />
      <OnboardingLayout
        testID="lock-screen"
        /*
          `lock`, not `credential`: the same cluster as the create flow's
          password screen, but the always-empty description band collapses so
          "Welcome back" sits one title line above the input — the same air
          that separates the fish from the title (owner decision, 2026-08-18).
        */
        variant="lock"
        /*
          The lock carries the water column (DESIGN.md §the lock screen): the
          same ground the swap task modal mounts — depth ramp, marine snow,
          deep-field scales. The ground color sits under the ramp so nothing
          behind the gate can ever show through while it paints.
        */
        backgroundColor={semantic.depth.column}
        background={
          <>
            <DepthBackground />
            <ScalesBackground variant="deepField" />
          </>
        }
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
                style={[styles.input, { borderColor: getInputBorderColor() }]}
                placeholder={t('lock.enter_password')}
                placeholderTextColor={colors.text.secondary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
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
            <Text testID="lock-error" accessibilityLiveRegion="polite" style={styles.errorText}>
              {error}
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
              color={colors.accent.primary}
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

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking') || 'Unlocking Wallet'}
        showTips={true}
        tipInterval={3000}
        onExited={handleWaitExited}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
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
    backgroundColor: colors.input.background,
    borderWidth: borderWidth.sheet,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.normal,
    textAlign: 'center',
  },
  /**
   * The error's shape in the warning ink — a message, not a card. The full
   * WarningNotice is ~94pt against the assist band's 60, and a card that
   * overflows its band moves the very controls the grid exists to pin.
   */
  throttleText: {
    color: semantic.status.warning,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.normal,
    textAlign: 'center',
  },
});
