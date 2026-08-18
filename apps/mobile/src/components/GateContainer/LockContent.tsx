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
import { LoadingScreen } from '../LoadingScreen';
import { OnboardingLayout, OnboardingTitle, ReservedSlot } from '../OnboardingLayout';
import { WarningNotice } from '../WarningNotice';
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

  // The throttle notice takes the unlock button's place, so a screen-reader
  // user must not be left focused on a node that has just vanished. Focus
  // follows the swap in both directions.
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

  const handleUnlock = useCallback(async () => {
    if (!password.trim()) {
      setError(t('lock.enter_password_error'));
      return;
    }

    setIsLoading(true);
    setError(null);
    Keyboard.dismiss();

    try {
      const success = await onUnlock(password);
      if (!success) {
        refreshThrottle();
        setError(t('lock.wrong_password'));
        setPassword('');
        setShowLoadingScreen(false);
      }
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
        variant="unlock"
        title={<OnboardingTitle>{t('lock.welcome_back')}</OnboardingTitle>}
        body={
          /*
            Reserved, not deleted. The biometric variant used to hold the field
            and every control below it inside one guard, so failing Face ID
            moved the mark 115pt down the screen at the exact moment the user
            was already mildly alarmed. The bands stand either way now.
          */
          <ReservedSlot visible={showPasswordFallback}>
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
              {/* Feedback about the field above it, so it sits against that
                  field rather than displacing anything. */}
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </ReservedSlot>
        }
        assist={
          <TextButton
            testID="lock-forgot-password-button"
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            {t('lock.forgot_password')}
          </TextButton>
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
            While the wallet is throttled the button cannot be pressed anyway,
            so the notice takes its place: nothing moves, and the user is told
            why — and for how long — in the exact spot they were about to
            press. Focus follows the swap in both directions.
          */
          throttled ? (
            <View ref={throttleRef} accessible accessibilityLiveRegion="polite">
              <WarningNotice tone="warning" title={t('lock.throttled_title')}>
                {t('lock.throttled_body', { seconds: throttleRemainingSeconds })}
              </WarningNotice>
            </View>
          ) : (
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
          )
        }
      />

      <LoadingScreen
        visible={showLoadingScreen}
        title={t('lock.unlocking') || 'Unlocking Wallet'}
        showTips={true}
        tipInterval={3000}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  inputContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
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
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
});
