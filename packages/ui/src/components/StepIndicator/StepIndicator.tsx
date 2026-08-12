/**
 * StepIndicator - Shows progress through multi-step flows
 *
 * Displays dots indicating current step in a sequence.
 * Web version using @emotion/styled for browser extension.
 */
import { styled } from '../../utils/styled';
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
  return (
    <Container>
      {Array.from({ length: totalSteps }, (_, index) => (
        <Dot key={index} $isActive={index + 1 === currentStep} />
      ))}
    </Container>
  );
}
