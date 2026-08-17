import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// Only the four layout tokens this row reads are needed here.
jest.mock('@salmon/shared', () => ({
  spacing: { md: 12 },
  componentSizes: { buttonHeightCompact: 42 },
  s: (value: number) => value,
  vs: (value: number) => value,
}));

jest.mock('../Button', () => {
  const { Text: RNText } = require('react-native');
  return {
    // Stand-ins that keep the call site's own style, so the assertions below
    // read what SwapReviewButtons hands each button and nothing else.
    PrimaryButton: ({ style, testID }: { style?: object; testID?: string }) => (
      <RNText testID={testID} style={style} />
    ),
    SecondaryButton: ({ style, testID }: { style?: object; testID?: string }) => (
      <RNText testID={testID} style={style} />
    ),
  };
});

import { SwapReviewButtons } from './SwapReviewButtons';

type Node = { props: { style?: unknown }; children?: unknown[] };

function renderRow() {
  const tree = render(
    <SwapReviewButtons onBack={jest.fn()} onConfirm={jest.fn()} />
  ).toJSON() as unknown as Node;
  const halves = (tree.children ?? []) as Node[];
  return { row: tree, halves };
}

describe('SwapReviewButtons — the pair is symmetric', () => {
  it('splits the row into two halves of equal flex', () => {
    const { halves } = renderRow();

    expect(halves).toHaveLength(2);
    for (const half of halves) {
      expect(StyleSheet.flatten(half.props.style)).toMatchObject({ flex: 1 });
    }
  });

  it('keeps padding and border off the elements that carry the flex', () => {
    // Yoga floors a flex child's base size at its own horizontal padding and
    // border — `max(flexBasis, paddingAndBorderAlongMainAxis)` — so a padded
    // flex child comes out wider than an unpadded sibling even when both say
    // `flex: 1`. Back used to sit `2 * spacing.lg` wider than Confirm for
    // exactly this reason. Whatever carries the flex must carry no padding.
    const { halves } = renderRow();

    for (const half of halves) {
      const style = StyleSheet.flatten(half.props.style) as Record<string, unknown>;
      for (const key of [
        'padding',
        'paddingHorizontal',
        'paddingLeft',
        'paddingRight',
        'borderWidth',
        'borderLeftWidth',
        'borderRightWidth',
      ]) {
        expect(style[key] ?? 0).toBe(0);
      }
    }
  });

  it('does not put flex back on the buttons themselves', () => {
    // A button carries its own horizontal padding, so the moment `flex` moves
    // onto it the asymmetry returns.
    const { halves } = renderRow();

    for (const half of halves) {
      const button = (half.children ?? [])[0] as Node;
      const style = (StyleSheet.flatten(button.props.style) ?? {}) as Record<string, unknown>;
      expect(style.flex).toBeUndefined();
      expect(style.flexBasis).toBeUndefined();
    }
  });
});
