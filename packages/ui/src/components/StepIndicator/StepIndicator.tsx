/**
 * StepIndicator - Shows progress through multi-step flows
 *
 * Displays dots indicating current step in a sequence.
 * Web version using @emotion/styled for browser extension.
 */
import { styled } from '../../utils/styled';
import { useTranslation } from 'react-i18next';
import { colors, componentSizes, duration, easing } from '@salmon/shared';
import type { StepIndicatorProps } from './types';

const Container = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: componentSizes.stepDotGap,
});

const Dot = styled('div')<{ $isActive: boolean }>(({ $isActive }) => ({
  width: componentSizes.stepDotSize,
  height: componentSizes.stepDotSize,
  borderRadius: componentSizes.stepDotSize / 2,
  backgroundColor: $isActive ? colors.step.active : colors.step.inactive,
  transition: `background-color ${duration.normal} ${easing.ease}`,
}));

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  const { t } = useTranslation();
  return (
    // One accessible element: the dots are decoration, the position is the
    // content — a screen reader hears "Step 2 of 4", not a row of empty divs.
    <Container
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={t('accessibility.step_progress', { current: currentStep, total: totalSteps })}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <Dot key={index} $isActive={index + 1 === currentStep} aria-hidden="true" />
      ))}
    </Container>
  );
}
