import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  colors,
  fontFamily,
  fontSize,
  generateMnemonic,
  generateValidationPositions,
  ms,
  s,
  semantic,
  spacing,
  validateMnemonicWords,
  vs,
} from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ScreenHeader } from '../ScreenHeader';
import { SeedWordGrid, SeedWordInput } from '../SeedPhrase';
import { getAuthContainerStyles } from './common';
import type { CreateWalletPageProps } from './types';

type Step = 'message' | 'seedPhrase' | 'validate';

interface ValidationWord {
  position: number;
  expectedWord: string;
  userInput: string;
}

/**
 * Bedrock, and no water. This screen carries the recovery phrase, and the
 * Bedrock Rule fixes every seed view at `surface.bedrock`, opaque: no scales,
 * no caustic, no iridescence, nothing alive moving behind the one secret that
 * cannot be reissued. The rest of the onboarding flow stands in the column;
 * this screen is the floor under it. That is a security decision, not a
 * stylistic one, so the ground here is a flat opaque fill by rule.
 */
const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: semantic.surface.bedrock,
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

const ScrollContent = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `0 ${s(spacing['2xl'])}px`,
  overflowY: 'auto',
});

const LogoImage = styled('img')({
  width: ms(60),
  height: ms(60),
  objectFit: 'contain',
  marginBottom: vs(spacing.lg),
  marginTop: vs(spacing.lg),
});

const Title = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: ms(fontSize['2xl']),
  lineHeight: `${ms(32)}px`,
  marginBottom: vs(spacing.md),
  textAlign: 'center',
});

const Subtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.base),
  lineHeight: `${ms(20)}px`,
  marginBottom: vs(spacing['2xl']),
  textAlign: 'center',
  paddingLeft: s(spacing.lg),
  paddingRight: s(spacing.lg),
});

const BodyText = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.md),
  lineHeight: `${ms(24)}px`,
  marginBottom: vs(spacing['3xl']),
  textAlign: 'center',
  paddingLeft: s(spacing.lg),
  paddingRight: s(spacing.lg),
});

const ButtonContainer = styled(Box)({
  width: '100%',
  paddingBottom: vs(spacing['2xl']),
  paddingTop: vs(spacing.lg),
});

const SeedGridContainer = styled(Box)({
  width: '100%',
  marginBottom: vs(spacing['2xl']),
});

const ValidationInputs = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vs(spacing.lg),
});

const ToastOverlay = styled(Box)({
  position: 'fixed',
  bottom: vs(100),
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  zIndex: 1000,
});

const Toast = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  paddingLeft: s(spacing.lg),
  paddingRight: s(spacing.lg),
  paddingTop: vs(spacing.md),
  paddingBottom: vs(spacing.md),
  borderRadius: ms(24),
  gap: s(spacing.sm),
});

const ToastText = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.base),
});

function MessageStep({
  onNext,
  onBack,
  t,
  contained,
}: {
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
  contained?: boolean;
}) {
  return (
    <Container $contained={contained}>
      <ScreenHeader onBack={onBack} />
      <Content>
        <FormArea>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('wallet.create.messageTitle')}</Title>
          <BodyText>{t('wallet.create.messageBody')}</BodyText>
        </FormArea>
        <ButtonContainer>
          <PrimaryButton onClick={onNext} testID="create-start-button">
            {(t('actions.start') || 'START').toUpperCase()}
          </PrimaryButton>
        </ButtonContainer>
      </Content>
    </Container>
  );
}

function SeedPhraseStep({
  mnemonic,
  onNext,
  onBack,
  t,
  contained,
}: {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
  contained?: boolean;
}) {
  const [showToast, setShowToast] = useState(false);
  const words = mnemonic.split(' ');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [mnemonic]);

  return (
    <Container $contained={contained}>
      <ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 3, currentStep: 1 }} />
      <ScrollContent>
        <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
        <Title>{t('wallet.create.your_seed_phrase')}</Title>
        <Subtitle>{t('wallet.create.your_seed_phrase_body')}</Subtitle>
        <SeedGridContainer>
          <SeedWordGrid words={words} columns={3} />
        </SeedGridContainer>
        <ButtonContainer>
          <SecondaryButton onClick={handleCopy} testID="create-copy-seed-button">
            {t('wallet.create.copy_key').toUpperCase()}
          </SecondaryButton>
        </ButtonContainer>
        <ButtonContainer>
          <PrimaryButton onClick={onNext} testID="create-backed-up-button">
            {t('wallet.create.ive_backed_up_seed_phrase').toUpperCase()}
          </PrimaryButton>
        </ButtonContainer>
      </ScrollContent>
      {showToast && (
        <ToastOverlay>
          <Toast>
            <ToastText>{t('wallet.copied')}</ToastText>
          </Toast>
        </ToastOverlay>
      )}
    </Container>
  );
}

function ValidateStep({
  mnemonic,
  onComplete,
  onBack,
  t,
  contained,
}: {
  mnemonic: string;
  onComplete: () => void;
  onBack: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  contained?: boolean;
}) {
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const [validationWords, setValidationWords] = useState<ValidationWord[]>([]);

  useEffect(() => {
    const positions = generateValidationPositions(words.length, 3);
    setValidationWords(
      positions.map((position) => ({
        position,
        expectedWord: words[position - 1],
        userInput: '',
      }))
    );
  }, [words]);

  const validationResult = useMemo(() => {
    if (validationWords.length === 0) return { isValid: false, results: [] };
    return validateMnemonicWords(
      mnemonic,
      validationWords.map((word) => word.position),
      validationWords.map((word) => word.userInput)
    );
  }, [mnemonic, validationWords]);

  const handleInputChange = useCallback((index: number, value: string) => {
    setValidationWords((prev) =>
      prev.map((word, currentIndex) =>
        currentIndex === index ? { ...word, userInput: value } : word
      )
    );
  }, []);

  const getValidationState = useCallback(
    (index: number): 'idle' | 'correct' | 'incorrect' => {
      const word = validationWords[index];
      if (!word || !word.userInput) return 'idle';
      const result = validationResult.results[index];
      if (!result) return 'idle';
      return result.isCorrect ? 'correct' : 'incorrect';
    },
    [validationResult, validationWords]
  );

  return (
    <Container $contained={contained}>
      <ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 3, currentStep: 2 }} />
      <Content>
        <FormArea>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('wallet.create.confirm_seed_phrase')}</Title>
          <Subtitle>{t('wallet.create.confirm_seed_phrase_body')}</Subtitle>
          <ValidationInputs>
            {validationWords.map((word, index) => (
              <SeedWordInput
                key={`word-${word.position}`}
                testID={`create-confirm-word-input-${word.position}`}
                position={word.position}
                value={word.userInput}
                onChangeText={(value) => handleInputChange(index, value)}
                validationState={getValidationState(index)}
                autoFocus={index === 0}
                onSubmitEditing={() => {
                  if (index === validationWords.length - 1 && validationResult.isValid) {
                    onComplete();
                  }
                }}
              />
            ))}
          </ValidationInputs>
        </FormArea>
        <ButtonContainer>
          <PrimaryButton
            onClick={onComplete}
            disabled={!validationResult.isValid}
            testID="create-next-button"
          >
            {(t('actions.next') || 'NEXT').toUpperCase()}
          </PrimaryButton>
        </ButtonContainer>
      </Content>
    </Container>
  );
}

export function CreateWalletPage({
  onComplete,
  onBack,
  contained = false,
}: CreateWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('message');
  const [mnemonic, setMnemonic] = useState('');

  const handleStart = useCallback(() => {
    const newMnemonic = generateMnemonic(128);
    setMnemonic(newMnemonic);
    setStep('seedPhrase');
  }, []);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'message':
        onBack();
        break;
      case 'seedPhrase':
        setStep('message');
        break;
      case 'validate':
        setStep('seedPhrase');
        break;
    }
  }, [onBack, step]);

  const handleProceedToValidation = useCallback(() => {
    setStep('validate');
  }, []);

  const handleValidationComplete = useCallback(() => {
    onComplete(mnemonic);
  }, [mnemonic, onComplete]);

  if (step === 'message') {
    return <MessageStep onNext={handleStart} onBack={handleBack} t={t} contained={contained} />;
  }

  if (step === 'seedPhrase') {
    return (
      <SeedPhraseStep
        mnemonic={mnemonic}
        onNext={handleProceedToValidation}
        onBack={handleBack}
        t={t}
        contained={contained}
      />
    );
  }

  return (
    <ValidateStep
      mnemonic={mnemonic}
      onComplete={handleValidationComplete}
      onBack={handleBack}
      t={t}
      contained={contained}
    />
  );
}
