import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  ms,
  normalizeMnemonic,
  s,
  spacing,
  validateMnemonic,
  vs,
} from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ScreenHeader } from '../ScreenHeader';
import { getAuthContainerStyles } from './common';
import { focusRingNone } from '../../theme';
import type { RecoverWalletPageProps } from './types';

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
  lineHeight: `${ms(32)}px`,
  marginBottom: vs(spacing.md),
  textAlign: 'center',
});

const Subtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.base),
  lineHeight: `${ms(20)}px`,
  marginBottom: vs(spacing['3xl']),
  textAlign: 'center',
  paddingLeft: s(spacing.lg),
  paddingRight: s(spacing.lg),
});

const TextArea = styled('textarea')<{ $borderColor: string }>(({ $borderColor }) => ({
  width: '100%',
  height: vs(160),
  backgroundColor: colors.input.background,
  border: `1px solid ${$borderColor}`,
  borderRadius: ms(borderRadius.lg),
  padding: s(spacing.lg),
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: ms(fontSize.md),
  textAlign: 'center',
  resize: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
  '&::placeholder': {
    color: colors.text.tertiary,
  },
  // This textarea draws its own focus indicator: the 1px border switches to
  // `colors.accent.primary`, which measures 6.26:1 against the page ground
  // and 5.62:1 against its own fill — comfortably past the 3:1 WCAG 2.2
  // 1.4.11 asks of a focus indicator. The theme ring stands down rather than
  // stacking a second outline just inside that border.
  '&:focus-visible:focus-visible:focus-visible': focusRingNone,
}));

const InputContainer = styled(Box)({
  width: '100%',
  marginBottom: vs(spacing['2xl']),
});

const ButtonGroup = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vs(spacing.lg),
  paddingBottom: vs(spacing['3xl']),
  paddingTop: vs(spacing.lg),
});

export function RecoverWalletPage({
  onComplete,
  onBack,
  contained = false,
}: RecoverWalletPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isValidSeedPhrase = useCallback((): boolean => {
    const normalized = normalizeMnemonic(seedPhrase);
    if (!normalized) return false;
    return validateMnemonic(normalized);
  }, [seedPhrase]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSeedPhrase(text);
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!isValidSeedPhrase()) return;
    onComplete(normalizeMnemonic(seedPhrase));
  }, [isValidSeedPhrase, onComplete, seedPhrase]);

  const borderColor = isFocused ? colors.accent.primary : colors.input.border;
  const showNextButton = isValidSeedPhrase();

  return (
    <Container $contained={contained}>
      <ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />
      <Content>
        <FormArea>
          <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          <Title>{t('wallet.recover.messageTitle')}</Title>
          <Subtitle>{t('wallet.recover.messageBody')}</Subtitle>

          <InputContainer>
            <TextArea
              $borderColor={borderColor}
              data-testid="recover-seed-input"
              placeholder={t('wallet.recover.placeholder', 'Enter your seed phrase...')}
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </InputContainer>
        </FormArea>

        <ButtonGroup>
          <SecondaryButton onClick={handlePaste} testID="recover-paste-button">
            {t('wallet.recover.pasteSeed', 'PASTE YOUR SEED PHRASE').toUpperCase()}
          </SecondaryButton>
          <Box sx={{ visibility: showNextButton ? 'visible' : 'hidden' }}>
            <PrimaryButton onClick={handleNext} testID="recover-next-button">
              {t('actions.next', 'NEXT').toUpperCase()}
            </PrimaryButton>
          </Box>
        </ButtonGroup>
      </Content>
    </Container>
  );
}
