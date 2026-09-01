/**
 * The travel and the crossfade are covered through the row that ships them
 * (`PortfolioSubTabs.test.tsx`). What is only testable here is the size the
 * filter row asked for: 11/700 uppercase, and the testID prefix each caller
 * brings with it.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

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
    useSharedValue: (initial: unknown) => {
      const ref = ReactActual.useRef({ value: initial });
      return ref.current;
    },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    interpolateColor: (value: number, _input: number[], output: string[]) =>
      value >= 1 ? output[1] : output[0],
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

import { fontSize } from '@salmon/shared';
import { UnderlineTabs } from './UnderlineTabs';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'send', label: 'Sent' },
];

const flatten = (style: unknown) =>
  Object.assign({}, ...(Array.isArray(style) ? style : [style]).flat(Infinity).filter(Boolean));

describe('UnderlineTabs', () => {
  it('dresses the `sm` label uppercase at the filter size, whatever case the copy is', () => {
    render(
      <UnderlineTabs
        tabs={FILTERS}
        activeKey="all"
        onChange={jest.fn()}
        size="sm"
        tabTestIDPrefix="activity-filters"
      />
    );

    const label = flatten(screen.getByText('Sent').props.style);
    expect(label.textTransform).toBe('uppercase');
    expect(label.fontSize).toBe(fontSize.caption);
  });

  it('leaves the `md` sub-tab label at its own size and case', () => {
    render(<UnderlineTabs tabs={FILTERS} activeKey="all" onChange={jest.fn()} />);

    const label = flatten(screen.getByText('Sent').props.style);
    expect(label.textTransform).toBeUndefined();
    expect(label.fontSize).toBe(fontSize.bodyLg);
  });

  it('marks selection with state, not a fill, and reports the chosen key', () => {
    const onChange = jest.fn();
    render(
      <UnderlineTabs
        tabs={FILTERS}
        activeKey="all"
        onChange={onChange}
        size="sm"
        tabTestIDPrefix="activity-filters"
      />
    );

    const active = screen.getByTestId('activity-filters-all');
    expect(active.props.accessibilityState.selected).toBe(true);
    // No box, no fill: the underline is the whole selection language.
    expect(flatten(active.props.style).backgroundColor).toBeUndefined();

    fireEvent.press(screen.getByTestId('activity-filters-send'));
    expect(onChange).toHaveBeenCalledWith('send');
  });
});
