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
  withAlpha: jest.requireActual('@salmon/shared/src/theme/withAlpha').withAlpha,
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

import { ScrollView } from 'react-native';

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

  /**
   * The row is static while it fits and a carousel when it does not — measured
   * per device, never a breakpoint. `md` gaps are 20, so two 60pt labels need
   * 140: a 200pt container holds them and a 100pt one does not.
   */
  describe('overflow', () => {
    const SUB_TABS = [
      { key: 'portfolio', label: 'Portfolio' },
      { key: 'nfts', label: 'NFTs' },
    ];

    const measureTab = (key: string, x: number, width: number) =>
      fireEvent(screen.getByTestId(`sub-tab-${key}`), 'layout', {
        nativeEvent: { layout: { x, y: 0, width, height: 20 } },
      });

    const measureContainer = (width: number) =>
      fireEvent(screen.getByTestId('sub-tabs'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 24 } },
      });

    const renderRow = (activeKey = 'portfolio') =>
      render(
        <UnderlineTabs
          testID="sub-tabs"
          tabs={SUB_TABS}
          activeKey={activeKey}
          onChange={jest.fn()}
          tabTestIDPrefix="sub-tab"
        />
      );

    it('holds still while the measured tabs fit their container', () => {
      renderRow();

      measureContainer(200);
      measureTab('portfolio', 0, 60);
      measureTab('nfts', 80, 60);

      // Same tree at both widths — the scroll view is there but not enabled,
      // and no fade claims the row continues.
      expect(screen.getByTestId('sub-tabs-scroll').props.scrollEnabled).toBe(false);
      expect(screen.queryByTestId('sub-tabs-fade')).toBeNull();
    });

    it('does not flip into a carousel over a rounding slack', () => {
      renderRow();

      measureContainer(140);
      measureTab('portfolio', 0, 60);
      measureTab('nfts', 80, 60.4);

      expect(screen.getByTestId('sub-tabs-scroll').props.scrollEnabled).toBe(false);
    });

    it('enables the scroll and the fade when the tabs overrun it', () => {
      renderRow();

      measureContainer(100);
      measureTab('portfolio', 0, 60);
      measureTab('nfts', 80, 60);

      expect(screen.getByTestId('sub-tabs-scroll').props.scrollEnabled).toBe(true);
      expect(screen.getByTestId('sub-tabs-fade')).toBeTruthy();
      // The underline travels inside the scrolled content, so the selection
      // idiom is the same one at both widths.
      expect(screen.getByTestId('sub-tab-nfts')).toBeTruthy();
    });

    it('scrolls the newly active tab into view in overflow mode', () => {
      const scrollTo = jest
        .spyOn(ScrollView.prototype, 'scrollTo')
        .mockImplementation(() => undefined);

      const { rerender } = renderRow();
      measureContainer(100);
      measureTab('portfolio', 0, 60);
      measureTab('nfts', 80, 60);
      scrollTo.mockClear();

      rerender(
        <UnderlineTabs
          testID="sub-tabs"
          tabs={SUB_TABS}
          activeKey="nfts"
          onChange={jest.fn()}
          tabTestIDPrefix="sub-tab"
        />
      );

      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ animated: true }));
      scrollTo.mockRestore();
    });
  });
});
