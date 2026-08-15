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

import { Logo } from '@salmon/assets';
import {
  colors,
  fontFamilyNative,
  fontSize,
  gradients,
  letterSpacing,
  shadows,
  lineHeight,
  ms,
  s,
  spacing,
  vs,
  borderWidth,
  borderRadius,
  componentSizes,
  semantic,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '../LoadingScreen';
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
  const unlockDisabled = isLoading || !password.trim();

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
  }, [password, onUnlock, t]);

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
    if (error) return colors.status.error;
    if (isFocused) return colors.accent.primary;
    return colors.input.border;
  };

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.content}>
              <View style={styles.logoSection}>
                <View>
                  <Image source={Logo} style={styles.logo} resizeMode="contain" />
                </View>
                <Text style={styles.welcomeText}>{t('lock.welcome_back')}</Text>

                {showPasswordFallback && (
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
                      editable={!isLoading}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    {error && <Text style={styles.errorText}>{error}</Text>}
                  </View>
                )}
              </View>

              {showPasswordFallback && (
                <View style={styles.buttonSection}>
                  <TouchableOpacity
                    testID="lock-unlock-button"
                    accessibilityRole="button"
                    accessibilityLabel={t('lock.unlock')}
                    accessibilityState={{
                      disabled: unlockDisabled,
                      busy: isLoading,
                    }}
                    onPress={handleUnlock}
                    disabled={unlockDisabled}
                    activeOpacity={0.8}
                    style={styles.buttonContainer}
                  >
                    {/* The salmon never dims: it is either alive or absent.
                        Dimming the fill by opacity left near-black `onFill`
                        ink on a muddy red, which is neither the live 6.50:1
                        nor a legible disabled state. Disabled swaps the whole
                        object to `surface.crest` with disabled ink instead. */}
                    <LinearGradient
                      colors={
                        unlockDisabled
                          ? [...gradients.disabled.colors]
                          : [...gradients.primary.colors]
                      }
                      style={[styles.button, unlockDisabled && styles.buttonDisabled]}
                      start={gradients.primary.start}
                      end={gradients.primary.end}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={semantic.text.disabled} />
                      ) : (
                        <Text
                          style={[styles.buttonText, unlockDisabled && styles.buttonTextDisabled]}
                        >
                          {t('lock.unlock')}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {canUseBiometric && (
                    <TouchableOpacity
                      testID="lock-biometric-button"
                      accessibilityRole="button"
                      accessibilityLabel={biometricActionLabel}
                      accessibilityState={{ disabled: isLoading }}
                      onPress={() => {
                        void handleBiometricUnlock();
                      }}
                      disabled={isLoading}
                      style={styles.secondaryActionContainer}
                    >
                      <Text style={styles.secondaryActionText}>{biometricActionLabel}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    testID="lock-forgot-password-button"
                    accessibilityRole="button"
                    accessibilityLabel={t('lock.forgot_password')}
                    accessibilityState={{ disabled: isLoading }}
                    onPress={handleForgotPassword}
                    disabled={isLoading}
                    style={styles.forgotPasswordContainer}
                  >
                    <Text style={styles.forgotPasswordText}>{t('lock.forgot_password')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>

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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.lockScreenPadding),
    gap: vs(spacing['4xl']),
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    gap: vs(spacing.lockScreenSectionGap),
  },
  logo: {
    width: s(componentSizes.lockScreenLogoSize),
    height: s(componentSizes.lockScreenLogoSize),
  },
  welcomeText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize['2xl']),
    letterSpacing: letterSpacing.balance,
    lineHeight: vs(38),
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    width: '100%',
    minHeight: vs(componentSizes.iconSize5XL),
    paddingVertical: vs(spacing.sm),
    backgroundColor: colors.input.background,
    borderWidth: borderWidth.sheet,
    borderRadius: borderRadius.badge,
    paddingHorizontal: s(spacing.lg),
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: ms(fontSize.lg),
  },
  errorText: {
    color: colors.status.error,
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(fontSize.sm),
    lineHeight: ms(fontSize.sm * lineHeight.normal),
    marginTop: vs(spacing.sm),
    paddingHorizontal: s(spacing.sm),
  },
  buttonSection: {
    width: '100%',
    gap: vs(spacing.lockScreenGap),
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    minHeight: vs(componentSizes.iconSize4XL),
    paddingVertical: vs(spacing.sm),
    borderRadius: borderRadius.xl,
    borderWidth: borderWidth.thin,
    borderColor: semantic.accent.fill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  buttonDisabled: {
    borderColor: semantic.border.raised,
  },
  buttonTextDisabled: {
    color: semantic.text.disabled,
  },
  buttonText: {
    color: semantic.accent.onFill,
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize.md),
    lineHeight: ms(16 * lineHeight.normal),
  },
  forgotPasswordContainer: {
    padding: s(spacing.md),
  },
  secondaryActionContainer: {
    padding: s(spacing.md),
  },
  secondaryActionText: {
    color: colors.accent.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize.md),
    lineHeight: ms(16 * lineHeight.normal),
    textAlign: 'center',
  },
  forgotPasswordText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize.md),
    letterSpacing: letterSpacing.balance,
    lineHeight: vs(38),
    textAlign: 'center',
  },
});
