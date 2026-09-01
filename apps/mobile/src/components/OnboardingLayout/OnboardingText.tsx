/**
 * The flow's one title and one description.
 *
 * Onboarding used to set its own type per screen: four title sizes (24, 28,
 * 32, 36), three of them hardcoded rather than tokenised, and three different
 * line-heights for the same size. These two components are the whole of the
 * flow's typography now, so a screen cannot introduce a fifth.
 *
 * Both cap at `fontScaleCap.chrome`. The reserved bands are specified at two
 * rendered lines, which absorbs the cap; past it the slot grows and `body`
 * shrinks to pay, which is the system working as designed rather than text
 * clipping against a hardcoded line-height.
 */
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

export interface OnboardingTextProps extends Testable {
  children: ReactNode;
}

export function OnboardingTitle({ children, testID }: OnboardingTextProps) {
  return (
    <Text
      style={styles.title}
      maxFontSizeMultiplier={fontScaleCap.chrome}
      accessibilityRole="header"
      testID={testID}
    >
      {children}
    </Text>
  );
}

export function OnboardingDescription({ children, testID }: OnboardingTextProps) {
  return (
    <Text style={styles.description} maxFontSizeMultiplier={fontScaleCap.chrome} testID={testID}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.headline,
    lineHeight: fontSize.headline * lineHeight.tight,
    textAlign: 'center',
  },
  description: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    textAlign: 'center',
  },
});
