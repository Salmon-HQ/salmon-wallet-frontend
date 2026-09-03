import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// Only the three layout tokens this pair reads are needed here.
jest.mock('@salmon/shared', () => ({
  spacing: { md: 12 },
  componentSizes: { buttonHeightCompact: 42 },
  vs: (value: number) => value,
}));

jest.mock('../Button', () => {
  const { Text: RNText } = require('react-native');
  return {
    // Stand-ins that keep the call site's own style, loading and disabled,
    // so the assertions below read what SwapReviewButtons hands each button
    // and nothing else.
    PrimaryButton: ({
      style,
      testID,
      loading,
      disabled,
    }: {
      style?: object;
      testID?: string;
      loading?: boolean;
      disabled?: boolean;
    }) => <RNText testID={testID} style={style} accessibilityState={{ busy: loading, disabled }} />,
    SecondaryButton: ({ style, testID }: { style?: object; testID?: string }) => (
      <RNText testID={testID} style={style} />
    ),
  };
});

import { SwapReviewButtons } from './SwapReviewButtons';

type Node = { props: { style?: unknown; testID?: string }; children?: unknown[] };

function renderStack() {
  const tree = render(
    <SwapReviewButtons onBack={jest.fn()} onConfirm={jest.fn()} />
  ).toJSON() as unknown as Node;
  const actions = (tree.children ?? []) as Node[];
  return { stack: tree, actions };
}

describe('SwapReviewButtons — the pair stacks, full width', () => {
  // This replaces the pair's old symmetry contract. The row used to split
  // itself into two equal halves, and those tests guarded the split: `flex: 1`
  // on both halves, no padding or border on whatever carried the flex (Yoga
  // floors a flex child at its own horizontal padding, which once made Back
  // `2 * spacing.lg` wider than Confirm), and no flex on the buttons
  // themselves. There is no row and no halves any more, so there is nothing
  // left for those assertions to protect — equal widths are now trivially
  // true, both actions being the full width of the screen. What replaces them
  // is the property the stack exists for: each action gets the whole width, so
  // the longest label the screen can show has room.

  it('stacks the two actions in a column', () => {
    const { stack } = renderStack();

    expect(StyleSheet.flatten(stack.props.style)).toMatchObject({ flexDirection: 'column' });
  });

  it('gives each action the full width — nothing narrows it', () => {
    // A column stretches its children by default, and both buttons carry
    // `width: '100%'` of their own. The stack must not undo either: an
    // `alignItems` other than `stretch`, or a width cap on a button, shrinks
    // the action back to its label and the long Spanish copy clips again.
    const { stack, actions } = renderStack();

    const stackStyle = (StyleSheet.flatten(stack.props.style) ?? {}) as Record<string, unknown>;
    expect(stackStyle.alignItems ?? 'stretch').toBe('stretch');

    expect(actions).toHaveLength(2);
    for (const action of actions) {
      const style = (StyleSheet.flatten(action.props.style) ?? {}) as Record<string, unknown>;
      expect(style.width ?? '100%').toBe('100%');
      expect(style.maxWidth).toBeUndefined();
      expect(style.flex).toBeUndefined();
      expect(style.flexBasis).toBeUndefined();
    }
  });

  it('puts the committing action at the bottom, as every other surface does', () => {
    // OnboardingLayout's ratified band order is assist / secondary / action,
    // with the full-width primary bottom-most. Back is the secondary here, so
    // it sits above Confirm.
    const { actions } = renderStack();

    expect(actions.map((action) => action.props.testID)).toEqual([
      'swap-back-button',
      'swap-confirm-button',
    ]);
  });

  it('reserves the same height in every state the pair can be in', () => {
    // The second action is not always "Confirm" — an expired quote makes it
    // "Refresh Quote". Both buttons pin their
    // height, so the stack occupies the same space whichever label it carries
    // and nothing above it moves when the quote expires.
    const heights = (label?: string) => {
      const tree = render(
        <SwapReviewButtons onBack={jest.fn()} onConfirm={jest.fn()} confirmLabel={label} />
      ).toJSON() as unknown as Node;
      return ((tree.children ?? []) as Node[]).map((action) => {
        const style = (StyleSheet.flatten(action.props.style) ?? {}) as Record<string, unknown>;
        return [style.height, style.minHeight];
      });
    };

    const confirm = heights('Confirmar');
    expect(confirm).toEqual([
      [42, 42],
      [42, 42],
    ]);
    expect(heights('Actualizar cotizacion')).toEqual(confirm);
  });

  it('never spins the confirm button for a confirm in flight — the wave wait owns that', () => {
    // The review sinks at the tap and the wave wait takes over (SwapScreen),
    // so a confirming button shows no loader; it only refuses a second press.
    const { getByTestId } = render(
      <SwapReviewButtons onBack={jest.fn()} onConfirm={jest.fn()} isConfirming />
    );
    const state = getByTestId('swap-confirm-button').props.accessibilityState;
    expect(state.busy).toBe(false);
    expect(state.disabled).toBe(true);
  });

  it('still spins the confirm button while a fresh quote is in flight', () => {
    const { getByTestId } = render(
      <SwapReviewButtons onBack={jest.fn()} onConfirm={jest.fn()} isRefreshing />
    );
    const state = getByTestId('swap-confirm-button').props.accessibilityState;
    expect(state.busy).toBe(true);
    expect(state.disabled).toBe(true);
  });
});
