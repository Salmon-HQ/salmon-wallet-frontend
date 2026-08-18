import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  ApiError,
  colors,
  createAccount,
  fontFamily,
  fontSize,
  getMirrorNetworks,
  getScanNetworks,
  lineHeight,
  PASSWORD_CONSTRAINTS,
  semantic,
  spacing,
  trackOnboardingEvent,
  useAccountsContext,
  validatePassword,
  getPasswordIssue,
} from '@salmon/shared';
import { generateAccountName } from '@salmon/shared/utils/account';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
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
import { CREATE_FLOW_STEPS } from './CreateWalletPage';
import type { PasswordPageProps } from './types';

const InputContainer = styled(Box)({
  width: '100%',
  marginBottom: spacing.lg,
});

/**
 * Feedback about the field above it, so it sits against that field rather than
 * competing with the terms line for the `assist` band. It appears and
 * disappears as the user types, which is exactly why it belongs in `body` —
 * the give in the grid (spec 013, decision 6).
 */
const StrengthContainer = styled(Box)({
  marginTop: spacing.sm,
  paddingLeft: spacing.xs,
  paddingRight: spacing.xs,
});

const ErrorText = styled(Typography)({
  color: semantic.status.danger,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.caption,
  lineHeight: `${Math.round(fontSize.caption * lineHeight.snug)}px`,
  marginBottom: spacing.lg,
  textAlign: 'center',
  width: '100%',
});

const TermsText = styled(Typography)({
  color: semantic.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.caption,
  lineHeight: `${Math.round(fontSize.caption * lineHeight.normal)}px`,
  textAlign: 'center',
});

const TermsLink = styled('span')({
  color: colors.step?.active ?? colors.accent.primary,
  cursor: 'pointer',
});

export function PasswordPage({
  mnemonic,
  flowType,
  onCreating,
  onSuccess,
  onBack,
}: PasswordPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();

  const showSingleInput = state.requiredLock;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongPassword, setWrongPassword] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const isFormValid = useCallback((): boolean => {
    if (showSingleInput) return password.length > 0;
    return passwordValidation.isValid && passwordsMatch;
  }, [password, passwordValidation.isValid, passwordsMatch, showSingleInput]);

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      setError(null);
      if (showSingleInput) setWrongPassword(false);
    },
    [showSingleInput]
  );

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid()) return;

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
      } catch {
        setError(t('wallet.create.invalid_password') || 'Invalid Password');
        setIsChecking(false);
        return;
      }
      setIsChecking(false);
    }

    setIsLoading(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 100));

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
      await actions.addAccount(account, password);
      // Pseudonymous funnel event: a wallet was created or recovered. No seed,
      // address or key material — just which flow completed. The consent prompt
      // comes a step later, so this defers on-device until it is answered
      // (fires on accept, discarded on decline).
      void trackOnboardingEvent(flowType === 'create' ? 'wallet_created' : 'wallet_recovered');
      onSuccess();
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
    actions,
    flowType,
    isFormValid,
    mnemonic,
    onCreating,
    onSuccess,
    password,
    showSingleInput,
    state.counter,
    t,
  ]);

  const passwordIssue =
    !showSingleInput && password.length > 0 ? getPasswordIssue(passwordValidation) : null;
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

  const confirmError =
    !showSingleInput &&
    confirmPassword.length > 0 &&
    password.length >= PASSWORD_CONSTRAINTS.MIN_LENGTH &&
    !passwordsMatch
      ? t('wallet.create.passwords_dont_match') || 'Passwords do not match'
      : undefined;

  const buttonText = isChecking
    ? t('wallet.create.passwordChecking') || 'Checking...'
    : flowType === 'create'
      ? t('wallet.create_wallet') || 'CREATE WALLET'
      : t('wallet.recover_wallet') || 'RECOVER ACCOUNT';

  return (
    <>
      <OnboardingLayout
        testID="password-screen"
        variant="credential"
        background={<WaterColumn />}
        scrollBody
        chrome={
          <ScreenHeader
            onBack={onBack}
            stepIndicator={{
              totalSteps: flowType === 'create' ? CREATE_FLOW_STEPS : 2,
              currentStep: flowType === 'create' ? CREATE_FLOW_STEPS : 2,
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
            <InputContainer>
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
                  <StrengthContainer>
                    <PasswordStrengthBar strength={passwordValidation.strength} t={t} />
                  </StrengthContainer>
                </ReservedSlot>
              )}
            </InputContainer>

            {!showSingleInput && (
              <InputContainer>
                <PasswordInput
                  testID="password-confirm-input"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={t('wallet.create.passwordRepeat')}
                  error={confirmError}
                  editable={!isLoading && !isChecking}
                  onSubmitEditing={handleSubmit}
                />
              </InputContainer>
            )}

            {/* Reserved for the same reason as the strength bar: a failure
                message must not shove the layout when it lands. */}
            <ReservedSlot visible={!!error}>
              <ErrorText>{error ?? ' '}</ErrorText>
            </ReservedSlot>
          </>
        }
        assist={
          <TermsText>
            {flowType === 'recover'
              ? t('wallet.recover.terms_prefix')
              : t('wallet.create.terms_prefix')}
            <TermsLink
              data-testid="password-terms-link"
              onClick={() => window.open('https://salmonwallet.io/terms', '_blank')}
            >
              {t('general.terms_and_conditions')}
            </TermsLink>
          </TermsText>
        }
        action={
          <PrimaryButton
            onClick={handleSubmit}
            disabled={!isFormValid() || wrongPassword}
            loading={isLoading || isChecking}
            fullWidth
            testID="password-submit-button"
          >
            {buttonText}
          </PrimaryButton>
        }
      />

      <LoadingScreen
        visible={isLoading}
        title={
          flowType === 'recover'
            ? t('wallet.recover.recovering_account')
            : t('wallet.create.creating_account')
        }
        subtitle={t('wallet.create.securing_wallet')}
        showTips
        tipInterval={4000}
      />
    </>
  );
}
