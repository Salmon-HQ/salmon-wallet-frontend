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
 * - type: 'protect' - a wallet stored without a password: the screen lists its
 *   addresses and protects it with the password chosen. The addresses come
 *   from the wallet state, never from the route, which a deep link can set.
 *
 * RequiredLock Logic:
 * - If requiredLock is true AND NOT in recover flow, user already has a password stored
 * - Show single input to verify existing password (only when adding new account to existing wallet)
 * - In RECOVER flow, always show 2 inputs to set new password (seed phrase proves ownership)
 * - Call checkPassword() to validate when showSingleInput is true
 * - If valid, proceed to create account
 * - A vault stored with no wallet listed is checked against a password the
 *   user may not know, so the screen offers the lock screen's reset ("Forgot
 *   my password"): under the single field, and in RECOVER only once that
 *   vault rejected the password, since its fields ask for a new one
 */

import {
  ApiError,
  createAccount,
  DuplicateAccountError,
  importSeedVaultAccount,
  IncorrectPasswordError,
  fontFamilyNative,
  generateAccountId,
  generateAccountName,
  getMirrorNetworks,
  getRandomAvatar,
  getScanNetworks,
  getStashItem,
  fontScaleCap,
  fontSize,
  lineHeight,
  passwordCheckErrorKey,
  removeStashItem,
  setStashItem,
  s,
  spacing,
  STASH_KEYS,
  trackOnboardingEvent,
  UnlockThrottledError,
  VaultReadRefusedError,
  useAccountsContext,
  componentSizes,
  type Semantic,
  useSetupPasswordForm,
  isSeedVaultError,
  SeedVaultError,
} from '@salmon/shared';
import { LockIcon } from '../../src/icons';
import { listSeedVaultAccounts } from '../../src/seed-vault/bridge';
import {
  getPendingSeedVaultSelection,
  setPendingSeedVaultSelection,
} from '../../src/seed-vault/pendingSelection';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Keyboard,
  Linking,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useWaitPassage } from '../../src/utils/useWaitPassage';
import { useEnrolmentPassword } from '../../src/contexts/EnrolmentPasswordContext';
import { useBiometric } from '../../src/contexts/BiometricContext';
import { useSemantic, useThemedStyles, useThemeMode } from '../../src/theme/useThemedStyles';
import {
  ConfirmSheet,
  LoadingScreen,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PasswordInput,
  PasswordStrengthBar,
  PrimaryButton,
  ReservedSlot,
  ResetConfirm,
  ScreenHeader,
  SecondaryButton,
  TextButton,
  VaultRefusedDialog,
} from '../../src/components';

/** Warning, phrase, networks, password. */
const CREATE_FLOW_STEPS = 4;
/** Phrase, networks, password. */
const RECOVER_FLOW_STEPS = 3;
/** Seed Vault account, password: Seed Vault asks no network question. */
const SEED_VAULT_FLOW_STEPS = 2;

// ============================================================================
// Component
// ============================================================================

export default function PasswordScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const mode = useThemeMode();
  const params = useLocalSearchParams<{ type?: string }>();
  const [state, actions] = useAccountsContext();
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  // The phrase this screen took from the stash and owes back until a wallet
  // is saved from it.
  const owedPhraseRef = useRef<string | null>(null);
  // Picked on the first submit and kept: a retry saves the same wallet again
  // instead of adding a second one.
  const identityRef = useRef<{ id: string; avatar: string } | null>(null);
  // Only create and recover (the default) come here with a phrase in the
  // stash; protect and Seed Vault never take or put one back.
  const usesPhrase = !params.type || params.type === 'create' || params.type === 'recover';

  useEffect(() => {
    if (!usesPhrase) return;
    const loadMnemonic = async () => {
      const stored = await getStashItem<string>(STASH_KEYS.PENDING_MNEMONIC);
      if (stored) {
        owedPhraseRef.current = stored;
        setMnemonic(stored);
        await removeStashItem(STASH_KEYS.PENDING_MNEMONIC);
      }
    };
    void loadMnemonic();
  }, [usesPhrase]);

  // Back from here lands on the network question, whose choice opens a new
  // password screen that reads the phrase from the stash again. Leaving
  // without a wallet saved puts it back where this screen found it.
  useEffect(
    () => () => {
      const owed = owedPhraseRef.current;
      if (!owed) return;
      setStashItem(STASH_KEYS.PENDING_MNEMONIC, owed).catch((error) => {
        console.error('Failed to put the recovery phrase back:', error);
      });
    },
    []
  );

  // A Seed Vault wallet (spec 037) arrives instead of a phrase: which seed,
  // which path, which address. Nothing secret — the key stays in Seed Vault.
  // It comes from memory, never from route params, which a deep link can set.
  const [seedVault] = useState(() =>
    params.type === 'seed-vault' ? getPendingSeedVaultSelection() : null
  );
  const protectAddresses = params.type === 'protect' ? state.unprotectedAddresses : null;
  const protect = !!protectAddresses;
  const hasSecret = !!mnemonic || !!seedVault || protect;

  // Get requiredLock from state - true if password already exists
  const requiredLock = state.requiredLock;

  // Determine flow type (create or recover)
  const flowType = params.type || 'recover';

  // In recover flow, user has proven ownership via seed phrase
  // They should always be able to set a new password, regardless of requiredLock
  const isRecoverFlow = flowType === 'recover';
  const flowSteps =
    flowType === 'create'
      ? CREATE_FLOW_STEPS
      : flowType === 'seed-vault'
        ? SEED_VAULT_FLOW_STEPS
        : RECOVER_FLOW_STEPS;

  // Only show single input when adding account to existing encrypted wallet
  // (not during recover, and never when protecting: that sets a new password)
  const showSingleInput = requiredLock && !isRecoverFlow && !protect;

  // Where the password waits for the biometric enrolment step.
  const enrolmentPassword = useEnrolmentPassword();

  // A wallet the owner does not recognise leaves by removal, after its sheet:
  // the same removal as removing every wallet, then the welcome screen.
  const { disarm: disarmBiometric } = useBiometric();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [vaultRefused, setVaultRefused] = useState(false);
  // Either flow here proves the password against that vault: the single field
  // asks for it, and recover's new password fails unless it matches.
  const offerReset = requiredLock && !protect && state.accounts.length === 0;
  const [passwordRejected, setPasswordRejected] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const handleRemoveWallet = useCallback(async () => {
    await disarmBiometric();
    await actions.removeAllAccounts();
    router.replace('/(auth)');
  }, [actions, disarmBiometric]);

  const {
    password,
    confirmPassword,
    passwordValidation,
    isLoading,
    setIsLoading,
    isChecking,
    error,
    setError,
    isFormValid,
    submitDisabled,
    handlePasswordChange,
    handleConfirmPasswordChange,
    begin,
    passwordError,
    confirmError,
    buttonText,
  } = useSetupPasswordForm({
    showSingleInput,
    protect,
    flowType,
    canSubmit: hasSecret,
    checkPassword: actions.checkPassword,
    t,
  });

  // The passage into the wait: when the wait rises, the form sinks under it.
  // The auth layout owns the ground, so the whole layout may travel; the wait
  // itself owns the beat on its way in.
  const { exiting: waitExiting } = useWaitPassage(isLoading);

  // Android's back during the wait would leave this screen while the wallet
  // is still being written, and put the phrase back for a second run.
  useEffect(() => {
    if (!isLoading) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isLoading]);

  // Refs
  const confirmPasswordRef = useRef<TextInputInstance>(null);
  /**
   * Where to go once the wait has fully left the screen. Set on success
   * instead of navigating immediately — navigation unmounts the wait, and an
   * unmounted wait is a wave cut mid-crossing. Consumed exactly once by
   * `handleWaitExited`.
   */
  const pendingRouteRef = useRef<
    '/(auth)/biometric-setup' | '/(auth)/success' | '/(app)/(tabs)' | null
  >(null);
  const handleWaitExited = useCallback(() => {
    const route = pendingRouteRef.current;
    if (!route) return;
    pendingRouteRef.current = null;
    router.replace(route);
  }, []);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
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
    if (!isFormValid) return;

    Keyboard.dismiss();

    // Verifies an existing password when there is one, then raises the wait
    if (!(await begin())) return;

    if (protect) {
      const protectedNow = await actions.protectWallet(password);
      pendingRouteRef.current = protectedNow ? '/(app)/(tabs)' : null;
      setError(protectedNow ? null : t('wallet.protect.error'));
      setIsLoading(false);
      return;
    }

    const t0 = Date.now();
    try {
      // Get counter from useAccounts state
      const accountName = generateAccountName(state.counter, t('wallet.name_template'));

      // Create account using factory
      // Derives accounts for ALL networks (mainnet + devnet/testnet)
      // This ensures accounts are ready when user enables developer mode later
      if (seedVault) {
        // Asked of Seed Vault again, so the wallet is only ever an account
        // Seed Vault itself reports for that authorization.
        const listed = await listSeedVaultAccounts(seedVault.authToken);
        if (
          !listed.some(
            (a) => a.derivationPath === seedVault.derivationPath && a.address === seedVault.address
          )
        ) {
          throw new SeedVaultError('failed');
        }
      } else if (!mnemonic) {
        throw new Error('No recovery phrase to create the wallet from');
      }
      identityRef.current ??= { id: generateAccountId(), avatar: getRandomAvatar() };
      const { account } = seedVault
        ? await importSeedVaultAccount({
            ...identityRef.current,
            name: accountName,
            ...seedVault,
            networkId: 'solana-mainnet',
          })
        : await createAccount({
            ...identityRef.current,
            name: accountName,
            mnemonic: mnemonic!,
            networkIds: [...(await getScanNetworks()), ...Object.values(await getMirrorNetworks())],
            startIndex: 0,
          });
      console.log(`[perf] recovery: createAccount ${Date.now() - t0}ms`);

      // Add account with password encryption. Created here without the phrase
      // check: the save marks it, and the first send asks for it.
      const t1 = Date.now();
      await actions.addAccount(account, password, {
        unconfirmed: flowType === 'create' && !seedVault,
      });
      console.log(`[perf] recovery: addAccount (encrypt + storage) ${Date.now() - t1}ms`);
    } catch (err) {
      console.error('Failed to create account:', err);
      if (err instanceof VaultReadRefusedError) {
        setError(null);
        setVaultRefused(true);
        setIsLoading(false);
        return;
      }
      if (err instanceof IncorrectPasswordError || err instanceof UnlockThrottledError) {
        setPasswordRejected(true);
      }
      // Account setup calls the backend, so an unreachable server lands here
      // too. Blaming the seed phrase for that sends users hunting for a lost
      // wallet when all they need is a connection.
      setError(
        isSeedVaultError(err)
          ? t(`wallet.seedVault.errors.${err.reason}`)
          : err instanceof DuplicateAccountError
            ? t('wallet.import.errors.duplicate')
            : err instanceof IncorrectPasswordError || err instanceof UnlockThrottledError
              ? t(passwordCheckErrorKey(err, 'wallet.create.invalid_password'))
              : err instanceof ApiError && err.isNetworkError()
                ? t('wallet.create.recovery_network_error') ||
                  'Could not reach the server. Check your connection and try again. Your seed phrase is fine.'
                : t('wallet.create.recovery_error') ||
                  'Failed to recover account. Please check your seed phrase and try again.'
      );
      setIsLoading(false);
      return;
    }

    // The wallet is saved: the phrase leaves now, and nothing below may report
    // the save as failed or offer it again.
    owedPhraseRef.current = null;
    setMnemonic(null);
    setPendingSeedVaultSelection(null);

    // Unlock the wallet so no lock screen appears when navigating to the app.
    // The derived key is already cached in stash from addAccount, so this is
    // fast. It reports failure by returning false; enrolment is then skipped,
    // and the flow goes on to success and the consent question.
    const unlocked = await actions.unlockAccounts(password);
    console.log(`[perf] recovery: TOTAL ${Date.now() - t0}ms`);

    // Navigate to biometric setup (auto-skips to success if unavailable) —
    // but not yet. Navigating here unmounts the wait mid-wave: the overlay
    // used to vanish with the front still crossing, a hard cut on the one
    // transition that should close the gesture. The route is parked and the
    // wait is handed its exit instead (`isLoading` flips false below): the
    // last front leaves the screen, the content sinks with the departing
    // wave, and `onExited` performs the navigation — the arriving screen then
    // floats in through the auth layout's FloatRegion, one beat later.
    // LoadingScreen's own watchdog guarantees `onExited` fires even if the
    // animation callback is dropped, so the route cannot be stranded.
    pendingRouteRef.current = unlocked ? '/(auth)/biometric-setup' : '/(auth)/success';

    try {
      // Parked for the enrolment step: arming biometrics seals this password,
      // and that screen has no other way to reach it. Held in memory by the
      // `(auth)` layout, taken and dropped there.
      if (unlocked) enrolmentPassword?.remember(password);

      // Pseudonymous funnel event: a wallet was created or recovered. No seed,
      // address or key material — just which flow completed. The consent prompt
      // comes a couple of steps later, so this defers on-device until it is
      // answered (fires on accept, discarded on decline).
      void trackOnboardingEvent(flowType === 'create' ? 'wallet_created' : 'wallet_recovered');
    } catch (err) {
      console.error('A step after the wallet was saved failed:', err);
    }
    setIsLoading(false);
  }, [
    isFormValid,
    begin,
    setError,
    setIsLoading,
    seedVault,
    mnemonic,
    password,
    actions,
    protect,
    t,
    state.counter,
    flowType,
    enrolmentPassword,
  ]);

  const forgotLink = offerReset && (
    <View style={styles.forgotRow}>
      <TextButton
        testID="password-forgot-button"
        onPress={() => setResetOpen(true)}
        disabled={isLoading || isChecking}
        color={semantic.text.primary}
      >
        {t('lock.forgot_password')}
      </TextButton>
    </View>
  );

  // Loading screen title based on flow
  const loadingTitle = protect
    ? t('wallet.protect.protecting')
    : flowType === 'recover'
      ? t('wallet.recover.recovering_account')
      : t('wallet.create.creating_account');

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {/* The form gives way to the wait with the passage's sink. On a failure
          it returns under the wait's own ebb, exactly where it was; on
          success the parked route navigates before it can reappear. */}
      {!isLoading && (
        <Animated.View style={styles.passage} exiting={waitExiting}>
          <OnboardingLayout
            testID="password-screen"
            /*
          `content`, not `credential` (owner, 2026-08-18): recover → password
          are consecutive steps of one flow, and `credential`'s hero-sized
          mark band (201pt vs content's 96) dropped this screen's cluster
          ~105pt below recover's — the lock landed far under where the key had
          just been. On `content` every band — chrome, mark, title,
          description, body — is the same constant as recover's, so the hero
          holds its Y across the step and the first input starts at the same
          band top as the seed grid's first row. The sink-and-float transition
          is what makes the still hero read: the content travels, the cluster
          does not jump.
        */
            variant="content"
            scrollBody
            float
            /*
          The lock: what the password buys. The fish leaves the flow screens
          — one semantic glyph per step, consent's pattern and size.
        */
            mark={<LockIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
            chrome={
              // Protecting has no way back: nothing else opens until the
              // wallet has a password.
              <ScreenHeader
                testID="password-back"
                onBack={protect ? undefined : handleBack}
                stepIndicator={
                  protect
                    ? undefined
                    : {
                        totalSteps: flowSteps,
                        currentStep: flowSteps,
                      }
                }
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
                  {protect ? t('wallet.protect.body') : t('wallet.create.choose_a_password_body')}
                </OnboardingDescription>
              )
            }
            body={
              <>
                {protectAddresses && (
                  <View style={styles.addressList} testID="password-protect-addresses">
                    <Text style={styles.addressLabel} maxFontSizeMultiplier={fontScaleCap.chrome}>
                      {t('wallet.protect.addresses_label')}
                    </Text>
                    {protectAddresses.map((address) => (
                      <Text key={address} style={styles.addressText} selectable>
                        {address}
                      </Text>
                    ))}
                  </View>
                )}
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
                  {showSingleInput && forgotLink}

                  {/*
                Feedback about the field above it, so it sits against that
                field rather than competing with the terms line for the assist
                band. Its slot is reserved from the first frame — "nothing
                moves under the finger": typing the first character reveals
                the meter instead of shoving the confirmation field down.
              */}
                  {!showSingleInput && (
                    <ReservedSlot visible={password.length > 0}>
                      <View style={styles.strengthContainer}>
                        <PasswordStrengthBar strength={passwordValidation.strength} t={t} />
                      </View>
                    </ReservedSlot>
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

                {/* Reserved for the same reason as the strength bar: a failure
                message must not shove the layout when it lands. */}
                <ReservedSlot visible={!!error}>
                  <Text style={styles.generalError}>{error ?? ' '}</Text>
                </ReservedSlot>
                {!showSingleInput && passwordRejected && forgotLink}
              </>
            }
            assist={
              protect ? undefined : (
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
              )
            }
            secondary={
              protect ? (
                <SecondaryButton
                  tone="danger"
                  onPress={() => setRemoveOpen(true)}
                  disabled={isLoading || isChecking}
                  testID="password-protect-remove-button"
                >
                  {t('wallet.protect.remove_button')}
                </SecondaryButton>
              ) : undefined
            }
            action={
              <PrimaryButton
                onPress={handleSubmit}
                disabled={submitDisabled}
                loading={isLoading || isChecking}
                testID="password-submit-button"
              >
                {buttonText}
              </PrimaryButton>
            }
          />
        </Animated.View>
      )}

      {protect && (
        <ConfirmSheet
          visible={removeOpen}
          onClose={() => setRemoveOpen(false)}
          title={t('wallet.protect.remove_title')}
          message={t('wallet.protect.remove_message')}
          confirmText={t('settings.confirm_remove')}
          cancelText={t('actions.cancel')}
          isDanger
          onConfirm={handleRemoveWallet}
        />
      )}

      {/* A refused save offers the same reset as removing the wallet above. */}
      <VaultRefusedDialog
        visible={vaultRefused}
        onClose={() => setVaultRefused(false)}
        onReset={handleRemoveWallet}
      />

      <ResetConfirm
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        onReset={handleRemoveWallet}
      />

      {/* Loading Screen Overlay */}
      <LoadingScreen
        visible={isLoading}
        title={loadingTitle}
        subtitle={t('wallet.create.securing_wallet')}
        showTips={true}
        tipInterval={4000}
        onExited={handleWaitExited}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /** The form's travel frame for the passage into the wait. */
    passage: {
      flex: 1,
    },
    inputContainer: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    forgotRow: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    strengthContainer: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    generalError: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.snug,
      marginBottom: spacing.lg,
      textAlign: 'center',
      width: '100%',
    },
    termsText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.normal,
      textAlign: 'center',
    },
    termsHighlight: {
      color: t.step.active,
    },
    addressList: {
      width: '100%',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    addressLabel: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.normal,
    },
    addressText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.caption),
      lineHeight: fontSize.caption * lineHeight.normal,
    },
  });
