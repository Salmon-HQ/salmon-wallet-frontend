/**
 * The titled composition's vertical centering, matching `.pen` CORE 04's
 * "Send navigation" row: back well 38x38 + title, gap 12, `alignItems:
 * 'center'`.
 *
 * Owner-reported bug: the title's baseline sat lower than the 38pt back
 * well's centre. Root cause on iOS: a `lineHeight` larger than the font's
 * natural line box makes RN add the extra leading above the glyphs. The fix
 * gives the title a *neutral* line box (`lineHeight: fontSize.headline`, no
 * multiplier) so the row's `alignItems: 'center'` does the centring
 * unbiased, strips Android's font-metrics padding
 * (`includeFontPadding: false`), and nudges iOS by -1 for DM Sans's residual
 * ascender/descender asymmetry. This test guards that contract by
 * inspecting the flattened styles rather than pixel output, which Jest
 * cannot measure.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ScreenHeader } from './ScreenHeader';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

// The @salmon/shared barrel drags in native-only deps; the theme modules
// this component draws from are runtime-agnostic, so they are loaded
// directly (PowerupsFab.test.tsx's convention). `s`/`vs` are stubbed to
// identity — the test asserts the *shape* of the style, not scaled pixels.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  // `onBack` mounts an IconBubble → usePressMotion, which reads `motionMs`
  // unconditionally on every render (not just on press).
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  // StepIndicator (imported by ScreenHeader for the step-count row) reads
  // `colors.step.*` at module scope.
  colors: jest.requireActual('@salmon/shared/src/theme/colors').colors,
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

// `onBack` mounts an IconBubble, which reads press motion off Reanimated —
// no worklets runtime in Jest, so it needs the same plain-JS stand-in as
// PowerupsFab.test.tsx / usePressMotion.test.tsx.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: () => () => 0 },
  };
});

describe('ScreenHeader — titled composition', () => {
  it('centres the title inside a well-height box (the mock: text box = 38, glyphs centred)', () => {
    const { getByText } = render(<ScreenHeader title="Recovery phrase" />);

    const style = StyleSheet.flatten(getByText('Recovery phrase').props.style);

    // fontSize.headline, no lineHeight.tight multiplier — a larger line box
    // is what made iOS add leading above the glyphs and sink the title.
    expect(style.lineHeight).toBeUndefined();
    expect(style.includeFontPadding).toBe(false);
  });

  it('centres the titled row (gap 12) so the well and the title share one centre line', () => {
    // Text → titleBox (well-height, centring) → titledRow.
    const { getByTestId } = render(<ScreenHeader title="Recovery" onBack={() => {}} />);
    const box = StyleSheet.flatten(getByTestId('screen-header-title-box').props.style);
    expect(box.height).toBe(38); // the mock's "Send title": text box = well height
    expect(box.justifyContent).toBe('center');

    const rowStyle = StyleSheet.flatten(getByTestId('screen-header-title-row').props.style);
    expect(rowStyle.alignItems).toBe('center');
    expect(rowStyle.gap).toBe(12); // spacing.md, matches `.pen`'s "Send navigation"
  });

  it('keeps the same title line box with no back well (Powerups composition)', () => {
    const { getByText } = render(<ScreenHeader title="Powerups" />);

    const style = StyleSheet.flatten(getByText('Powerups').props.style);

    expect(style.lineHeight).toBeUndefined();
    expect(style.includeFontPadding).toBe(false);
  });
});
