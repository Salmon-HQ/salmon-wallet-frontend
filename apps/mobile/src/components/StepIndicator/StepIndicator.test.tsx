/**
 * Only the position changes, so only the position moves.
 *
 * The indicator used to re-colour a different dot on every step, which made
 * the whole row a new element each time — the header read as a navigation
 * event when all that had happened was that the current step advanced. Now the
 * track of dots is one fixed, unanimated row and a single salmon dot slides
 * across it. Same principle as the balance card, which does not remount when
 * the chain changes.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${opts.current}/${opts.total}` : key,
  }),
}));

import { componentSizes, semantic } from '@salmon/shared';
import { StepIndicator } from './StepIndicator';

const flatten = (style: unknown) => {
  const flat = (Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean);
  return Object.assign({}, ...flat);
};

/** Every dot in the fixed track — the active dot is absolutely positioned. */
const trackDots = (tree: ReturnType<typeof render>) =>
  tree.UNSAFE_getAllByType(require('react-native').View).filter((node) => {
    const style = flatten(node.props.style);
    return style.width === componentSizes.stepDotSize && style.position !== 'absolute';
  });

const activeDot = (tree: ReturnType<typeof render>) =>
  tree.UNSAFE_getAllByType(require('react-native').View).find((node) => {
    const style = flatten(node.props.style);
    return style.backgroundColor === semantic.step.active;
  });

describe('StepIndicator', () => {
  it('draws one inactive dot per step, and exactly one salmon dot', () => {
    const tree = render(<StepIndicator totalSteps={4} currentStep={2} />);
    expect(trackDots(tree)).toHaveLength(4);
    for (const dot of trackDots(tree)) {
      expect(flatten(dot.props.style).backgroundColor).toBe(semantic.step.inactive);
    }
    expect(activeDot(tree)).toBeTruthy();
  });

  it('keeps the track identical across a step change — nothing but the dot moves', () => {
    // The regression this replaces: the container slid out left and back in
    // right, which reads as the screen being replaced rather than the step
    // advancing.
    const tree = render(<StepIndicator totalSteps={4} currentStep={1} />);
    const before = trackDots(tree).map((d) => flatten(d.props.style));

    tree.rerender(<StepIndicator totalSteps={4} currentStep={3} />);
    const after = trackDots(tree).map((d) => flatten(d.props.style));

    expect(after).toEqual(before);
  });

  it('positions the salmon dot by translation, not by re-colouring a sibling', () => {
    // If the active state were a colour on one of the track dots, moving it
    // would rebuild the row. It is a separate absolutely-placed dot instead.
    const tree = render(<StepIndicator totalSteps={4} currentStep={2} />);
    const style = flatten(activeDot(tree)?.props.style);
    expect(style.position).toBe('absolute');
    expect(style.left).toBe(0);
    // One stride per step, from a fixed origin — the dot travels, the row does
    // not.
    const stride = componentSizes.stepDotSize + componentSizes.stepDotGap;
    expect(style.transform).toEqual([{ translateX: stride }]);
  });

  it('announces the position to screen readers — the dots alone say nothing', () => {
    const tree = render(<StepIndicator totalSteps={4} currentStep={2} />);
    expect(tree.getByLabelText('accessibility.step_progress:2/4')).toBeTruthy();
  });
});
