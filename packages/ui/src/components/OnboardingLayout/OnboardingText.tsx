/**
 * The flow's one title and one description, for the DOM.
 *
 * Onboarding used to set its own type per screen: four title sizes (24, 28, 32
 * and 36 — three of them hardcoded rather than tokenised) and three different
 * line-heights for the same size. These two components are the whole of the
 * flow's typography now, so a screen cannot introduce a fifth.
 *
 * Both read the same tokens the React Native twin reads
 * (`apps/mobile/src/components/OnboardingLayout/OnboardingText.tsx`), off the
 * live mode, so the two platforms reserve the same number of pixels for the
 * same string and both re-ink when the mode changes.
 */
import { fontFamily, fontSize, fontWeight, lineHeight } from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import type { CSSProperties, ReactNode } from 'react';

import { useSemantic } from '../../theme/ThemeProvider';

export interface OnboardingTextProps extends Testable {
  children: ReactNode;
}

export function OnboardingTitle({ children, testID }: OnboardingTextProps): React.ReactElement {
  const { text } = useSemantic();
  const style: CSSProperties = {
    color: text.primary,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.headline,
    lineHeight: `${Math.round(fontSize.headline * lineHeight.tight)}px`,
    textAlign: 'center',
    margin: 0,
  };

  return (
    <h1 style={style} data-testid={testID}>
      {children}
    </h1>
  );
}

export function OnboardingDescription({
  children,
  testID,
}: OnboardingTextProps): React.ReactElement {
  const { text } = useSemantic();
  const style: CSSProperties = {
    color: text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyLg,
    lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
    textAlign: 'center',
    margin: 0,
  };

  return (
    <p style={style} data-testid={testID}>
      {children}
    </p>
  );
}
