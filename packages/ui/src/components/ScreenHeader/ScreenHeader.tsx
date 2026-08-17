/**
 * ScreenHeader - Common header for onboarding/auth screens
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Includes back button, optional step indicator, and spacer for alignment.
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { ArrowLeftIcon, iconSize } from '../../icons';
import { colors, componentSizes, contentPadding, opacity } from '@salmon/shared';
import { StepIndicator } from '../StepIndicator';
import type { ScreenHeaderProps } from './types';
import { useTranslation } from 'react-i18next';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingLeft: contentPadding.screen,
  paddingRight: contentPadding.screen,
  height: componentSizes.headerHeight,
});

const BackButton = styled(IconButton)({
  width: componentSizes.backButtonSize,
  height: componentSizes.backButtonSize,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  '&:hover': {
    backgroundColor: 'transparent',
  },
  '&.Mui-disabled': {
    opacity: opacity.full,
  },
});

const CenterContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const Spacer = styled(Box)({
  width: componentSizes.backButtonSize,
});

/**
 * ScreenHeader component for onboarding/auth screens
 *
 * Displays:
 * - Back button on the left (optional, controlled by onBack prop)
 * - Optional step indicator in the center
 * - Spacer on the right for visual balance
 *
 * The back button is only visible when onBack is provided, and can be
 * disabled via the backDisabled prop.
 *
 * @example
 * ```tsx
 * // With back button and step indicator
 * <ScreenHeader
 *   onBack={() => navigate(-1)}
 *   stepIndicator={{ totalSteps: 3, currentStep: 1 }}
 * />
 *
 * // With just back button
 * <ScreenHeader onBack={() => navigate(-1)} />
 *
 * // With disabled back button
 * <ScreenHeader onBack={() => {}} backDisabled />
 * ```
 */
export function ScreenHeader({
  onBack,
  stepIndicator,
  backDisabled,
  className,
  style,
  testID,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <Container style={style} className={className}>
      {/* Back button */}
      <BackButton
        onClick={onBack}
        disabled={!onBack || backDisabled}
        aria-label={t('accessibility.go_back', 'Go back')}
        data-testid={testID ?? 'screen-header-back-button'}
      >
        {onBack && (
          <ArrowLeftIcon
            size={iconSize.lg}
            color={backDisabled ? colors.text.muted : colors.text.primary}
          />
        )}
      </BackButton>

      {/* Step indicator (centered) */}
      <CenterContainer>
        {stepIndicator && (
          <StepIndicator
            totalSteps={stepIndicator.totalSteps}
            currentStep={stepIndicator.currentStep}
          />
        )}
      </CenterContainer>

      {/* Spacer for alignment */}
      <Spacer />
    </Container>
  );
}
