/**
 * The flow's one title and one description, for the DOM.
 *
 * Onboarding used to set its own type per screen: four title sizes (24, 28, 32
 * and 36 — three of them hardcoded rather than tokenised) and three different
 * line-heights for the same size. These two components are the whole of the
 * flow's typography now, so a screen cannot introduce a fifth.
 *
 * Both read the same tokens the React Native twin reads, so the two platforms
 * reserve the same number of pixels for the same string.
 */
import Typography from '@mui/material/Typography';
import { fontFamily, fontSize, fontWeight, lineHeight, semantic } from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import type { ReactNode } from 'react';
import { styled } from '../../utils/styled';

export interface OnboardingTextProps extends Testable {
  children: ReactNode;
}

const Title = styled(Typography<'h1'>)({
  color: semantic.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.headline,
  lineHeight: `${Math.round(fontSize.headline * lineHeight.tight)}px`,
  textAlign: 'center',
  margin: 0,
});

const Description = styled(Typography<'p'>)({
  color: semantic.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
  textAlign: 'center',
  margin: 0,
});

export function OnboardingTitle({ children, testID }: OnboardingTextProps): React.ReactElement {
  return (
    <Title component="h1" data-testid={testID}>
      {children}
    </Title>
  );
}

export function OnboardingDescription({
  children,
  testID,
}: OnboardingTextProps): React.ReactElement {
  return (
    <Description component="p" data-testid={testID}>
      {children}
    </Description>
  );
}
