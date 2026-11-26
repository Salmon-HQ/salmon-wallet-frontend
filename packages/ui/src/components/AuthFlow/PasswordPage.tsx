/**
 * The password step, on the onboarding slot grid.
 *
 * The mobile twin is `apps/mobile/app/(auth)/password.tsx`: same bands, same
 * reserved slots for the strength meter and the failure line, the terms line
 * in `assist` with its link in `step.active`, every ink off the live mode.
 */
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ApiError,
  createAccount,
  fontFamily,
  fontWeight,
  fontSize,
  getMirrorNetworks,
  getScanNetworks,
  lineHeight,
  spacing,
  trackOnboardingEvent,
  useAccountsContext,
  usePhraseBackup,
  componentSizes,
  useSetupPasswordForm,
  useWaitExit,
} from '@salmon/shared';
import { LockIcon } from '../../icons';
import { generateAccountName } from '@salmon/shared/utils/account';
import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ConfirmDialog } from '../ConfirmDialog';
import { LoadingScreen } from '../LoadingScreen';
import { PasswordInput, PasswordStrengthBar } from '../PasswordInput';
import { ScreenHeader } from '../ScreenHeader';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  ReservedSlot,
} from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import { CREATE_FLOW_STEPS, RECOVER_FLOW_STEPS } from './CreateWalletPage';
import type { PasswordPageProps } from './types';

const inputContainer: CSSProperties = {
  width: '100%',
  marginBottom: spacing.lg,
};

/**
 * Feedback about the field above it, so it sits against that field rather than
 * competing with the terms line for the `assist` band. It appears and
 * disappears as the user types, which is exactly why it belongs in `body` —
 * the give in the grid (spec 013, decision 6).
 */
const strengthContainer: CSSProperties = {
  marginTop: spacing.sm,
  paddingLeft: spacing.xs,
  paddingRight: spacing.xs,
};

const addressList: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
  marginBottom: spacing.lg,
};

export function PasswordPage(props: PasswordPageProps): React.ReactElement {
  const { flowType, onSuccess } = props;
  const protect = props.flowType === 'protect' ? props : null;
  const mnemonic = props.flowType === 'protect' ? '' : props.mnemonic;
  const onCreating = props.flowType === 'protect' ? undefined : props.onCreating;
  const onBack = props.flowType === 'protect' ? undefined : props.onBack;
  const { t } = useTranslation();
  const { status, step, text } = useSemantic();
  const [state, actions] = useAccountsContext();
  const { markUnconfirmed } = usePhraseBackup();

  const errorText: CSSProperties = {
    color: status.danger,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    lineHeight: `${Math.round(fontSize.caption * lineHeight.snug)}px`,
    marginTop: 0,
    marginBottom: spacing.lg,
    textAlign: 'center',
    width: '100%',
  };

  const termsText: CSSProperties = {
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    lineHeight: `${Math.round(fontSize.caption * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
  };

  const addressText: CSSProperties = {
    color: text.primary,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.caption,
    lineHeight: `${Math.round(fontSize.caption * lineHeight.normal)}px`,
    margin: 0,
    overflowWrap: 'anywhere',
  };

  const addressLabel: CSSProperties = {
    ...termsText,
    fontWeight: fontWeight.medium,
    textAlign: 'left',
  };

  // Protecting asks for a new password, never an existing one.
  const showSingleInput = !protect && state.requiredLock;
  // A wallet the owner does not recognise leaves by removal, after its sheet.
  const [removeOpen, setRemoveOpen] = useState(false);
  const {
    password,
    confirmPassword,
    passwordValidation,
    isLoading,
    setIsLoading,
    isChecking,
    error,
    setError,
    submitDisabled,
    handlePasswordChange,
    handleConfirmPasswordChange,
    begin,
    passwordError,
    confirmError,
    buttonText,
  } = useSetupPasswordForm({
    showSingleInput,
    protect: !!protect,
    flowType,
    checkPassword: actions.checkPassword,
    t,
  });
  /**
   * Held from a successful setup: the form sank to make room for the wait and
   * has no right to come back up while the last wave is still leaving.
   */
  const [submerged, setSubmerged] = useState(false);

  // The wait stays mounted with `visible={false}` — which is what starts its
  // exit — until it reports its closing wave has left the screen.
  const { held, onExited } = useWaitExit(isLoading);
  /**
   * Set on success instead of handing over immediately: the caller's next step
   * unmounts this page, and an unmounted wait is a wave cut mid-crossing.
   * Consumed exactly once by `handleWaitExited`, whose arrival the wait's own
   * watchdog guarantees, so the handoff cannot be stranded.
   */
  const pendingSuccessRef = useRef(false);
  const handleWaitExited = useCallback(() => {
    onExited();
    if (!pendingSuccessRef.current) return;
    pendingSuccessRef.current = false;
    onSuccess();
  }, [onExited, onSuccess]);

  const handleSubmit = useCallback(async () => {
    if (!(await begin())) return;

    if (protect) {
      const protectedNow = await actions.protectWallet(password);
      pendingSuccessRef.current = protectedNow;
      setSubmerged(protectedNow);
      setError(protectedNow ? null : t('wallet.protect.error'));
      setIsLoading(false);
      return;
    }

    try {
      const accountName = generateAccountName(state.counter, t('wallet.name_template'));
      const scanNetworks = await getScanNetworks();
      const mirrorNetworks = await getMirrorNetworks();
      const { account } = await createAccount({
        name: accountName,
        mnemonic,
        networkIds: [...scanNetworks, ...Object.values(mirrorNetworks)],
        startIndex: 0,
      });

      onCreating?.();
      // Created here without the phrase check: the first send asks for it.
      if (flowType === 'create') await markUnconfirmed(account.id);
      await actions.addAccount(account, password);
      // Pseudonymous funnel event: a wallet was created or recovered. No seed,
      // address or key material — just which flow completed. The consent prompt
      // comes a step later, so this defers on-device until it is answered
      // (fires on accept, discarded on decline).
      void trackOnboardingEvent(flowType === 'create' ? 'wallet_created' : 'wallet_recovered');
      // Parked, not fired: dropping `isLoading` starts the wait's exit, and
      // `handleWaitExited` hands over once the last wave has left the screen.
      pendingSuccessRef.current = true;
      setSubmerged(true);
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
              'Failed to create account. Please check your seed phrase and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    markUnconfirmed,
    actions,
    begin,
    flowType,
    mnemonic,
    onCreating,
    password,
    protect,
    setError,
    setIsLoading,
    state.counter,
    t,
  ]);

  return (
    <>
      <OnboardingLayout
        testID="password-screen"
        /*
          The form gives way to the wait: what leaves sinks, and only the form
          leaves — the water stays put behind it (DESIGN.md §Motion, "The wait
          owns its passage, end to end"). A failure puts it back exactly where
          it was; a success keeps it down, so the departing wave uncovers water
          rather than the screen the user already left.
        */
        sunk={isLoading || submerged}
        // `content`, not `credential` (owner, 2026-08-18): same bands as the
        // recover step before it, so the hero cluster holds its Y across the
        // flow and the first input starts at the seed grid's first-row Y.
        // Mirrors the mobile twin.
        variant="content"
        background={<WaterColumn />}
        scrollBody
        // The lock: what the password buys. Mirrors mobile — one semantic
        // glyph per flow step, the fish stays on welcome and the lock only.
        mark={<LockIcon size={componentSizes.logoSizeSmall} color={text.primary} />}
        chrome={
          <ScreenHeader
            onBack={onBack}
            stepIndicator={
              protect
                ? undefined
                : {
                    totalSteps: flowType === 'create' ? CREATE_FLOW_STEPS : RECOVER_FLOW_STEPS,
                    currentStep: flowType === 'create' ? CREATE_FLOW_STEPS : RECOVER_FLOW_STEPS,
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
            {protect && (
              <div style={addressList} data-testid="password-protect-addresses">
                <p style={addressLabel}>{t('wallet.protect.addresses_label')}</p>
                {protect.addresses.map((address) => (
                  <p key={address} style={addressText}>
                    {address}
                  </p>
                ))}
              </div>
            )}
            <div style={inputContainer}>
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
                onSubmitEditing={showSingleInput ? handleSubmit : undefined}
              />
              {/* Slot reserved from the first frame — typing the first
                character reveals the meter instead of shoving the
                confirmation field down. */}
              {!showSingleInput && (
                <ReservedSlot visible={password.length > 0}>
                  <div style={strengthContainer}>
                    <PasswordStrengthBar strength={passwordValidation.strength} t={t} />
                  </div>
                </ReservedSlot>
              )}
            </div>

            {!showSingleInput && (
              <div style={inputContainer}>
                <PasswordInput
                  testID="password-confirm-input"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={t('wallet.create.passwordRepeat')}
                  error={confirmError}
                  editable={!isLoading && !isChecking}
                  onSubmitEditing={handleSubmit}
                />
              </div>
            )}

            {/* Reserved for the same reason as the strength bar: a failure
              message must not shove the layout when it lands. */}
            <ReservedSlot visible={!!error}>
              <p style={errorText}>{error ?? ' '}</p>
            </ReservedSlot>
          </>
        }
        assist={
          protect ? undefined : (
            <p style={termsText}>
              {flowType === 'recover'
                ? t('wallet.recover.terms_prefix')
                : t('wallet.create.terms_prefix')}
              <a
                data-testid="password-terms-link"
                href="https://salmonwallet.io/terms"
                target="_blank"
                rel="noreferrer"
                style={{ color: step.active, cursor: 'pointer', textDecoration: 'none' }}
              >
                {t('general.terms_and_conditions')}
              </a>
            </p>
          )
        }
        secondary={
          protect ? (
            <SecondaryButton
              tone="danger"
              onPress={() => setRemoveOpen(true)}
              disabled={isLoading || isChecking}
              fullWidth
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
            fullWidth
            testID="password-submit-button"
          >
            {buttonText}
          </PrimaryButton>
        }
      />

      {protect && (
        <ConfirmDialog
          visible={removeOpen}
          onClose={() => setRemoveOpen(false)}
          title={t('wallet.protect.remove_title')}
          message={t('wallet.protect.remove_message')}
          confirmText={t('settings.confirm_remove')}
          cancelText={t('actions.cancel')}
          isDanger
          onConfirm={protect.onRemoveWallet}
        />
      )}

      {held && (
        <LoadingScreen
          visible={isLoading}
          title={
            protect
              ? t('wallet.protect.protecting')
              : flowType === 'recover'
                ? t('wallet.recover.recovering_account')
                : t('wallet.create.creating_account')
          }
          subtitle={t('wallet.create.securing_wallet')}
          showTips
          tipInterval={4000}
          onExited={handleWaitExited}
        />
      )}
    </>
  );
}
