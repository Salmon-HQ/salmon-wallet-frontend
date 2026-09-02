import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the FleshBackground test's convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

// No worklets runtime under Jest. `useSharedValue` is backed by a real
// `useRef` so mutations made in an effect survive the next render — the
// underline and label progress both depend on that persistence. `withTiming`
// is a spy that echoes its target so assertions can also read the duration
// the component chose (0 under reduce motion, via `resolveMotionMs`).
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
    useReducedMotion: jest.fn(() => false),
    withTiming: jest.fn((target: unknown) => target),
    interpolateColor: (value: number, _input: number[], output: string[]) =>
      value >= 1 ? output[1] : output[0],
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { PortfolioSubTabs } from './PortfolioSubTabs';

const mockUseReducedMotion = useReducedMotion as jest.Mock;
const mockWithTiming = withTiming as jest.Mock;

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

const layout = (x: number, width: number) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 20 } },
});

afterEach(() => {
  mockUseReducedMotion.mockReturnValue(false);
  mockWithTiming.mockClear();
});

describe('PortfolioSubTabs', () => {
  it('calls onChange when an inactive tab is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent.press(getByTestId('portfolio-tab-nfts'));

    expect(onChange).toHaveBeenCalledWith('nfts');
  });

  it('does not call onChange when the active tab is pressed again', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent.press(getByTestId('portfolio-tab-portfolio'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onOrderPress when the order button is pressed', () => {
    const onOrderPress = jest.fn();
    const { getByTestId } = render(
      <PortfolioSubTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={jest.fn()}
        onOrderPress={onOrderPress}
      />
    );

    fireEvent.press(getByTestId('portfolio-order-button'));

    expect(onOrderPress).toHaveBeenCalledTimes(1);
  });

  it('hands the reorder verb to the tabs region alone, never to the order button', () => {
    const entering = { verb: 'float' };
    const exiting = { verb: 'sink' };
    const { getByTestId } = render(
      <PortfolioSubTabs
        tabs={TABS}
        activeKey="portfolio"
        onChange={jest.fn()}
        onOrderPress={jest.fn()}
        tabsKey="nfts|portfolio"
        tabsEntering={entering as never}
        tabsExiting={exiting as never}
      />
    );
    const region = getByTestId('portfolio-tabs-region');
    expect(region.props.entering).toBe(entering);
    expect(region.props.exiting).toBe(exiting);
    const button = getByTestId('portfolio-order-button');
    expect(button.props.entering).toBeUndefined();
    expect(button.props.exiting).toBeUndefined();
  });

  it('lands the underline on the first measured tab with no travel', () => {
    const props = { tabs: TABS, activeKey: 'portfolio', onChange: jest.fn() };
    const { getByTestId, rerender } = render(<PortfolioSubTabs {...props} />);

    fireEvent(getByTestId('portfolio-tab-portfolio'), 'layout', layout(0, 60));
    // The layout effect that lands the underline runs after the state-update
    // render commits; re-render once more (same props) to read what it set —
    // an artifact of the JS-only mock, since real Reanimated updates the
    // native prop directly without a React render.
    rerender(<PortfolioSubTabs {...props} />);

    const underlineStyle = getByTestId('portfolio-tabs-underline').props.style;
    expect(underlineStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 60 })])
    );
    expect(underlineStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ transform: [{ translateX: 0 }] })])
    );
    // First measurement snaps directly to the measured layout — no travel
    // from a stale default. (Labels still run their own mount-time crossfade
    // effect, so `withTiming` is not asserted un-called here.)
  });

  it('slides the underline target to the newly active tab measured layout', () => {
    const onChange = jest.fn();
    const { getByTestId, rerender } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent(getByTestId('portfolio-tab-portfolio'), 'layout', layout(0, 60));
    fireEvent(getByTestId('portfolio-tab-nfts'), 'layout', layout(80, 40));

    rerender(<PortfolioSubTabs tabs={TABS} activeKey="nfts" onChange={onChange} />);
    // Same flush as above: read the ref the activeKey-change effect just set.
    rerender(<PortfolioSubTabs tabs={TABS} activeKey="nfts" onChange={onChange} />);

    const underlineStyle = getByTestId('portfolio-tabs-underline').props.style;
    expect(underlineStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 40, transform: [{ translateX: 80 }] }),
      ])
    );
    // The switch to nfts animates — unlike the first measurement.
    expect(mockWithTiming).toHaveBeenCalled();
  });

  it('snaps instead of animating when reduce motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const onChange = jest.fn();

    const { getByTestId, rerender } = render(
      <PortfolioSubTabs tabs={TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent(getByTestId('portfolio-tab-portfolio'), 'layout', layout(0, 60));
    fireEvent(getByTestId('portfolio-tab-nfts'), 'layout', layout(80, 40));

    rerender(<PortfolioSubTabs tabs={TABS} activeKey="nfts" onChange={onChange} />);

    // withTiming still ran (the underline still slides after the first
    // measurement), but every call it made resolved to a zero duration.
    expect(mockWithTiming.mock.calls.length).toBeGreaterThan(0);
    for (const call of mockWithTiming.mock.calls) {
      const config = call[1] as { duration: number };
      expect(config.duration).toBe(0);
    }
  });

  it('works for a 3-tab row: underline follows whichever of the three is active', () => {
    const THREE_TABS = [...TABS, { key: 'powerup', label: 'Stake' }];
    const onChange = jest.fn();
    const { getByTestId, rerender } = render(
      <PortfolioSubTabs tabs={THREE_TABS} activeKey="portfolio" onChange={onChange} />
    );

    fireEvent(getByTestId('portfolio-tab-portfolio'), 'layout', layout(0, 60));
    fireEvent(getByTestId('portfolio-tab-nfts'), 'layout', layout(80, 40));
    fireEvent(getByTestId('portfolio-tab-powerup'), 'layout', layout(140, 50));

    rerender(<PortfolioSubTabs tabs={THREE_TABS} activeKey="powerup" onChange={onChange} />);
    rerender(<PortfolioSubTabs tabs={THREE_TABS} activeKey="powerup" onChange={onChange} />);

    const underlineStyle = getByTestId('portfolio-tabs-underline').props.style;
    expect(underlineStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 50, transform: [{ translateX: 140 }] }),
      ])
    );
  });
});
