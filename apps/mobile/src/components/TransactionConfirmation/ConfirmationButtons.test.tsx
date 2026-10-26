import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// Only the two layout tokens this pair reads are needed here.
jest.mock('@salmon/shared', () => ({
  spacing: { md: 12 },
  vs: (value: number) => value,
}));

jest.mock('../Button', () => {
  const { Text: RNText } = require('react-native');
  return {
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
    HoldToApproveButton: ({ testID, disabled }: { testID?: string; disabled?: boolean }) => (
      <RNText testID={testID} accessibilityState={{ disabled }} />
    ),
  };
});

import { ConfirmationButtons } from './ConfirmationButtons';

type Node = { props: { style?: unknown; testID?: string }; children?: unknown[] };

function renderStack() {
  const tree = render(
    <ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} />
  ).toJSON() as unknown as Node;
  const actions = (tree.children ?? []) as Node[];
  return { stack: tree, actions };
}

describe('ConfirmationButtons — the pair stacks, full width', () => {
  it('stacks the two actions in a column', () => {
    const { stack } = renderStack();
    expect(StyleSheet.flatten(stack.props.style)).toMatchObject({ flexDirection: 'column' });
  });

  it('gives each action the full width — nothing narrows it', () => {
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
    const { actions } = renderStack();
    expect(actions.map((action) => action.props.testID)).toEqual([
      'confirmation-back-button',
      'confirmation-confirm-button',
    ]);
  });

  it("sizes both actions as the app's standard buttons, in every state", () => {
    // The pair is the same Back/Confirm every other review shows (Send's,
    // for one): no size of its own. The standard button's height is fixed,
    // so "Refresh Quote" in place of "Confirm" moves nothing above it.
    const sizes = (label?: string) => {
      const tree = render(
        <ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} confirmLabel={label} />
      ).toJSON() as unknown as Node;
      return ((tree.children ?? []) as Node[]).map((action) => {
        const style = (StyleSheet.flatten(action.props.style) ?? {}) as Record<string, unknown>;
        return [style.height, style.minHeight];
      });
    };
    const confirm = sizes('Confirmar');
    expect(confirm).toEqual([
      [undefined, undefined],
      [undefined, undefined],
    ]);
    expect(sizes('Actualizar cotización')).toEqual(confirm);
  });

  it('spins the confirm button only while a fresh quote is in flight', () => {
    // A confirm in flight sinks the screen and the wave wait takes over
    // (ConfirmationHost), so the button never spins for it.
    const idle = render(<ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} />);
    expect(idle.getByTestId('confirmation-confirm-button').props.accessibilityState).toEqual({
      busy: false,
      disabled: false,
    });

    const refreshing = render(
      <ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} isRefreshing />
    );
    expect(refreshing.getByTestId('confirmation-confirm-button').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
  });
});

describe('ConfirmationButtons — approval friction', () => {
  it('cannot confirm while the review says it is not ready', () => {
    const { getByTestId } = render(
      <ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} confirmDisabled />
    );
    expect(getByTestId('confirmation-confirm-button').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('asks for a hold instead of a tap when the review requires it', () => {
    const { getByTestId } = render(
      <ConfirmationButtons onBack={jest.fn()} onConfirm={jest.fn()} requiresHold />
    );
    expect(getByTestId('confirmation-hold-button')).toBeTruthy();
  });
});
