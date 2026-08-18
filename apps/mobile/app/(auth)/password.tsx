/**
 * PasswordScreen - Set password for wallet encryption during recovery
 *
 * This screen allows users to set a password for their wallet during the
 * recovery flow. The password is used to encrypt the mnemonic/seed phrase.
 *
 * Design:
 * - Dark gradient background (#10131c to #161c2d)
 * - Back button (chevron left) in top-left
 * - Step indicator dots at top-center (2 dots, second active = orange)
 * - Centered content with Salmon logo
 * - "Choose a Password" title with subtitle
 * - Password inputs with show/hide toggle
 * - Password strength indicator
 * - Terms & Conditions text
 * - White "RECOVER ACCOUNT" button
 *
 * Navigation:
 * - Comes from: recover screen (with mnemonic param)
 * - Goes to: success screen or main app
 *
 * Params:
 * - mnemonic: The seed phrase to encrypt (passed from previous screen)
 * - type: 'create' | 'recover' - determines button text and flow
 *
 * RequiredLock Logic:
 * - If requiredLock is true AND NOT in recover flow, user already has a password stored
 * - Show single input to verify existing password (only when adding new account to existing wallet)
 * - In RECOVER flow, always show 2 inputs to set new password (seed phrase proves ownership)
 * - Call checkPassword() to validate when showSingleInput is true
 * - If valid, proceed to create account
 */

import {
  ApiError,
  colors,
  createAccount,
  fontFamilyNative,
  generateAccountName,
  getMirrorNetworks,
  getScanNetworks,
  getStashItem,
  PASSWORD_CONSTRAINTS,
  fontScaleCap,
  fontSize,
  lineHeight,
  removeStashItem,
  spacing,
  STASH_KEYS,
  trackOnboardingEvent,
  useAccountsContext,
  validatePassword,
  getPasswordIssue,
  semantic,
} from '@salmon/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  LoadingScreen,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PasswordInput,
  PasswordStrengthBar,
  PrimaryButton,
  ScreenHeader,
} from '../../src/components';

/** Warning, phrase, confirmation, password. */
const CREATE_FLOW_STEPS = 4;
/** Phrase, password. */
const RECOVER_FLOW_STEPS = 2;

// ============================================================================
// Component
// ============================================================================

export default function PasswordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string }>();
  const [state, actions] = useAccountsContext();
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  useEffect(() => {
    const loadMnemonic = async () => {
      const stored = await getStashItem<string>(STASH_KEYS.PENDING_MNEMONIC);
      if (stored) {
        setMnemonic(stored);
        await removeStashItem(STASH_KEYS.PENDING_MNEMONIC);
      }
    };
    void loadMnemonic();
  }, []);

  // Get requiredLock from state - true if password already exists
  const requiredLock = state.requiredLock;

  // Determine flow type (create or recover)
  const flowType = params.type || 'recover';

  // In recover flow, user has proven ownership via seed phrase
  // They should always be able to set a new password, regardless of requiredLock
  const isRecoverFlow = flowType === 'recover';

  // Only show single input when adding account to existing encrypted wallet (not during recover)
  const showSingleInput = requiredLock && !isRecoverFlow;

  // State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongPassword, setWrongPassword] = useState(false);

  // Refs
  const confirmPasswordRef = useRef<TextInput>(null);

  // Password validation
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  /**
   * Check if form is valid
   * - For showSingleInput: just need a password to verify
   * - For new password: need valid password that matches confirmation
   */
  const isFormValid = useCallback((): boolean => {
    if (showSingleInput) {
      // Just need a password to check
      return password.length > 0 && !!mnemonic;
    }
    // Need valid password and matching confirmation
    return passwordValidation.isValid && passwordsMatch && !!mnemonic;
  }, [showSingleInput, password, passwordValidation.isValid, passwordsMatch, mnemonic]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Handle password change
   */
  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      setError(null);

      if (showSingleInput) {
        // Clear wrong password error when user types
        setWrongPassword(false);
      }
    },
    [showSingleInput]
  );

  /**
   * Handle confirm password change
   */
  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    setError(null);
  }, []);

  /**
   * Handle terms & conditions press
   */
  const handleTermsPress = useCallback(() => {
    Linking.openURL('https://salmonwallet.io/terms');
  }, []);

  /**
   * Handle form submission - create account and navigate to success
   */
  const handleSubmit = useCallback(async () => {
    if (!isFormValid() || !mnemonic) return;

    Keyboard.dismiss();

    // If showSingleInput, first verify the existing password
    if (showSingleInput) {
      setIsChecking(true);
      setError(null);

      try {
        const isValidPassword = await actions.checkPassword(password);

        if (!isValidPassword) {
          setWrongPassword(true);
          setIsChecking(false);
          return;
        }
      } catch (err) {
        console.error('Failed to check password:', err);
        setError(t('wallet.create.invalid_password') || 'Invalid Password');
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
    }

    // Proceed to create account
    setIsLoading(true);
    setError(null);

    // Yield to UI thread so LoadingScreen renders before heavy crypto derivation
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // Get counter from useAccounts state
      const accountName = generateAccountName(state.counter, t('wallet.name_template'));

      // Create account using factory
      // Derives accounts for ALL networks (mainnet + devnet/testnet)
      // This ensures accounts are ready when user enables developer mode later
      const t0 = Date.now();
      const scanNetworks = await getScanNetworks();
      const mirrorNetworks = await getMirrorNetworks();
      const { account } = await createAccount({
        name: accountName,
        mnemonic: mnemonic,
        networkIds: [...scanNetworks, ...Object.values(mirrorNetworks)],
        startIndex: 0,
      });
      console.log(`[perf] recovery: createAccount ${Date.now() - t0}ms`);

      // Add account with password encryption
      const t1 = Date.now();
      await actions.addAccount(account, password);
      console.log(`[perf] recovery: addAccount (encrypt + storage) ${Date.now() - t1}ms`);

      // Unlock the wallet so no lock screen appears when navigating to the app.
      // The derived key is already cached in stash from addAccount, so this is fast.
      await actions.unlockAccounts(password);
      console.log(`[perf] recovery: TOTAL ${Date.now() - t0}ms`);

      // Pseudonymous funnel event: a wallet was created or recovered. No seed,
      // address or key material — just which flow completed. The consent prompt
      // comes a couple of steps later, so this defers on-device until it is
      // answered (fires on accept, discarded on decline).
      void trackOnboardingEvent(flowType === 'create' ? 'wallet_created' : 'wallet_recovered');

      // Navigate to biometric setup (auto-skips to success if unavailable)
      router.replace('/(auth)/biometric-setup');
    } catch (err) {
      console.error('Failed to create account:', err);
      // Account setup calls the backend, so an unreachable server lands here
      // too. Blaming the seed phrase for that sends users hunting for a lost
      // wallet when all they need is a connection.
      setError(
        err instanceof ApiError && err.isNetworkError()
          ? t('wallet.create.recovery_network_error') ||
              'Could not reach the server. Check your connection and try again. Your seed phrase is fine.'
          : t('wallet.create.recovery_error') ||
              'Failed to recover account. Please check your seed phrase and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isFormValid, mnemonic, password, actions, showSingleInput, t, state.counter, flowType]);

  // Error states for inputs
  const passwordIssue =
    !showSingleInput && password.length > 0 ? getPasswordIssue(passwordValidation) : null;
  const showConfirmError =
    !showSingleInput &&
    confirmPassword.length > 0 &&
    !passwordsMatch &&
    password.length >= PASSWORD_CONSTRAINTS.MIN_LENGTH;

  // Get button text based on flow type and checking state
  const getButtonText = () => {
    if (isChecking) {
      return t('wallet.create.passwordChecking') || 'Checking...';
    }
    if (flowType === 'create') {
      return t('wallet.create_wallet') || 'CREATE WALLET';
    }
    return t('wallet.recover_wallet') || 'RECOVER ACCOUNT';
  };

  // Password error message
  const passwordError =
    passwordIssue === 'too_short'
      ? t('wallet.create.password_too_short', { min: PASSWORD_CONSTRAINTS.MIN_LENGTH })
      : passwordIssue === 'too_long'
        ? t('wallet.create.password_too_long', { max: PASSWORD_CONSTRAINTS.MAX_LENGTH })
        : passwordIssue === 'too_weak'
          ? t('wallet.create.password_too_weak')
          : wrongPassword
            ? t('wallet.create.invalid_password') || 'Invalid Password'
            : undefined;

  // Confirm password error message
  const confirmError = showConfirmError
    ? t('wallet.create.passwords_dont_match') || 'Passwords do not match'
    : undefined;

  // Loading screen title based on flow
  const loadingTitle =
    flowType === 'recover'
      ? t('wallet.recover.recovering_account')
      : t('wallet.create.creating_account');

  return (
    <>
      <StatusBar style="light" />
      <OnboardingLayout
        testID="password-screen"
        scrollBody
        chrome={
          <ScreenHeader
            onBack={handleBack}
            stepIndicator={{
              totalSteps: flowType === 'create' ? CREATE_FLOW_STEPS : RECOVER_FLOW_STEPS,
              currentStep: flowType === 'create' ? CREATE_FLOW_STEPS : RECOVER_FLOW_STEPS,
            }}
            backDisabled={isLoading || isChecking}
          />
        }
        title={
          <OnboardingTitle>
            {showSingleInput
              ? t('wallet.create.enter_your_password')
              : t('wallet.create.choose_a_password')}
          </OnboardingTitle>
        }
        description={
          // The single-field variant used to delete this line, dropping 56px
          // and moving everything below it. Reserved and left empty now.
          showSingleInput ? undefined : (
            <OnboardingDescription>
              {t('wallet.create.choose_a_password_body')}
            </OnboardingDescription>
          )
        }
        body={
          <>
            <View style={styles.inputContainer}>
              <PasswordInput
                testID="password-input"
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={
                  showSingleInput
                    ? t('wallet.create.enter_your_password')
                    : t('wallet.create.passwordNew')
                }
                error={passwordError}
                editable={!isLoading && !isChecking}
                onSubmitEditing={() => {
                  if (showSingleInput) {
                    handleSubmit();
                  } else {
                    confirmPasswordRef.current?.focus();
                  }
                }}
              />

              {/*
                Feedback about the field above it, so it sits against that
                field rather than competing with the terms line for the assist
                band. It appears and disappears as the user types, which is
                exactly why it belongs in `body` — the give in the grid.
              */}
              {!showSingleInput && password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <PasswordStrengthBar strength={passwordValidation.strength} t={t} />
                </View>
              )}
            </View>

            {!showSingleInput && (
              <View style={styles.inputContainer}>
                <PasswordInput
                  testID="password-confirm-input"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={t('wallet.create.passwordRepeat')}
                  error={confirmError}
                  editable={!isLoading && !isChecking}
                  onSubmitEditing={handleSubmit}
                />
              </View>
            )}

            {error && <Text style={styles.generalError}>{error}</Text>}
          </>
        }
        assist={
          <Text style={styles.termsText} maxFontSizeMultiplier={fontScaleCap.chrome}>
            {flowType === 'recover'
              ? t('wallet.recover.terms_prefix')
              : t('wallet.create.terms_prefix')}
            <Text
              style={styles.termsHighlight}
              onPress={handleTermsPress}
              testID="password-terms-link"
              accessibilityRole="link"
            >
              {t('general.terms_and_conditions')}
            </Text>
          </Text>
        }
        action={
          <PrimaryButton
            onPress={handleSubmit}
            disabled={!isFormValid() || wrongPassword}
            loading={isLoading || isChecking}
            testID="password-submit-button"
          >
            {getButtonText()}
          </PrimaryButton>
        }
      />

      {/* Loading Screen Overlay */}
      <LoadingScreen
        visible={isLoading}
        title={loadingTitle}
        subtitle={t('wallet.create.securing_wallet')}
        showTips={true}
        tipInterval={4000}
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
    marginBottom: spacing.lg,
  },
  strengthContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  generalError: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.snug,
    marginBottom: spacing.lg,
    textAlign: 'center',
    width: '100%',
  },
  termsText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.normal,
    textAlign: 'center',
  },
  termsHighlight: {
    color: colors.step.active,
  },
});
