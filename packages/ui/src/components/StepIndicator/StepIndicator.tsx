/**
 * StepIndicator — progress through a multi-step flow, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/StepIndicator`: one dot per
 * step, the current one in `step.active`, the rest in `step.inactive`, read
 * off the live mode.
 */
import { componentSizes, duration, easing } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import type { StepIndicatorProps } from './types';

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  const { t } = useTranslation();
  const { step } = useSemantic();

  return (
    // One accessible element: the dots are decoration, the position is the
    // content — a screen reader hears "Step 2 of 4", not a row of empty divs.
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={t('accessibility.step_progress', { current: currentStep, total: totalSteps })}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: componentSizes.stepDotGap,
      }}
    >
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          style={{
            width: componentSizes.stepDotSize,
            height: componentSizes.stepDotSize,
            borderRadius: componentSizes.stepDotSize / 2,
            backgroundColor: index + 1 === currentStep ? step.active : step.inactive,
            transition: `background-color ${duration.normal} ${easing.ease}`,
          }}
        />
      ))}
    </div>
  );
}
