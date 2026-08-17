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
  ms,
  PASSWORD_CONSTRAINTS,
  s,
  spacing,
  trackOnboardingEvent,
  useAccountsContext,
  validatePassword,
  getPasswordIssue,
  vs,
} from '@salmon/shared';
import { generateAccountName } from '@salmon/shared/utils/account';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { PasswordInput, PasswordStrengthBar } from '../PasswordInput';
import { ScreenHeader } from '../ScreenHeader';
import { getAuthContainerStyles } from './common';
import { WaterColumn } from '../WaterColumn';
import type { PasswordPageProps } from './types';

const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.background.primary,
  ...getAuthContainerStyles($contained),
}));

const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: `0 ${s(spacing['2xl'])}px`,
});

const FormArea = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

const LogoImage = styled('img')({
  width: ms(60),
  height: ms(60),
  objectFit: 'contain',
  marginBottom: vs(spacing['2xl']),
});

const Title = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: ms(fontSize['2xl']),
  lineHeight: `${ms(36)}px`,
  marginBottom: vs(spacing.sm),
  textAlign: 'center',
});

const Subtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.base),
  lineHeight: `${ms(24)}px`,
  marginBottom: vs(spacing['3xl']),
  textAlign: 'center',
});

const InputContainer = styled(Box)({
  width: '100%',
  marginBottom: vs(spacing.lg),
});

const StrengthContainer = styled(Box)({
  marginTop: vs(spacing.sm),
  paddingLeft: s(spacing.xs),
  paddingRight: s(spacing.xs),
});

const ErrorText = styled(Typography)({
  color: colors.status.error,
  fontFamily: fontFamily.sans,
  fontSize: ms(12),
  lineHeight: `${ms(16)}px`,
  marginBottom: vs(spacing.lg),
  textAlign: 'center',
  width: '100%',
});

const TermsText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: ms(12),
  lineHeight: `${ms(18)}px`,
  textAlign: 'center',
  paddingLeft: s(spacing['2xl']),
  paddingRight: s(spacing['2xl']),
});

const TermsLink = styled('span')({
  color: colors.step?.active ?? colors.accent.primary,
  cursor: 'pointer',
});

const ButtonContainer = styled(Box)({
  width: '100%',
  paddingBottom: vs(spacing['3xl']),
  paddingTop: vs(spacing.lg),
});

export function PasswordPage({
  mnemonic,
  flowType,
  onCreating,
  onSuccess,
  onBack,
  contained = false,
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
      <Container $contained={contained}>
        <WaterColumn />
        <ScreenHeader
          onBack={onBack}
          stepIndicator={{ totalSteps: 2, currentStep: 2 }}
          backDisabled={isLoading || isChecking}
        />
        <Content>
          <FormArea>
            <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />

            <Title>
              {showSingleInput
                ? t('wallet.create.enter_your_password') || 'Enter your password'
                : t('wallet.create.choose_a_password') || 'Choose a Password'}
            </Title>

            {!showSingleInput && (
              <Subtitle>
                {t('wallet.create.choose_a_password_body') ||
                  'You will need it to unlock your wallet'}
              </Subtitle>
            )}

            <InputContainer>
              <PasswordInput
                testID="password-input"
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={
                  showSingleInput
                    ? t('wallet.create.enter_your_password') || 'Enter your password'
                    : t('wallet.create.passwordNew') || 'New password'
                }
                error={passwordError}
                editable={!isLoading && !isChecking}
                onSubmitEditing={showSingleInput ? handleSubmit : undefined}
              />
              {!showSingleInput && password.length > 0 && (
                <StrengthContainer>
                  <PasswordStrengthBar strength={passwordValidation.strength} t={t} />
                </StrengthContainer>
              )}
            </InputContainer>

            {!showSingleInput && (
              <InputContainer>
                <PasswordInput
                  testID="password-confirm-input"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={t('wallet.create.passwordRepeat') || 'Repeat password'}
                  error={confirmError}
                  editable={!isLoading && !isChecking}
                  onSubmitEditing={handleSubmit}
                />
              </InputContainer>
            )}

            {error && <ErrorText>{error}</ErrorText>}

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
          </FormArea>

          <ButtonContainer>
            <PrimaryButton
              onClick={handleSubmit}
              disabled={!isFormValid() || wrongPassword}
              loading={isLoading || isChecking}
              testID="password-submit-button"
            >
              {buttonText}
            </PrimaryButton>
          </ButtonContainer>
        </Content>
      </Container>

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
