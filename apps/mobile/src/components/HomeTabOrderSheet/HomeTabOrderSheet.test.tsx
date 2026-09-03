/**
 * The sheet's contract with Home: it draws the tabs in the order it is given,
 * and a dropped row reports the new key order — no Save, no local draft. The
 * gesture is driven through the mocked handlers the rest of the app's
 * drag tests use (see `BalanceHeader.test.tsx`), so what is asserted is the
 * arithmetic that decides where a row lands, not Reanimated's frames.
 */
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, values?: Record<string, string>) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replace(`{{${name}}}`, value),
        fallback
      ),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: { View: RNView },
    useSharedValue: (initial: unknown) => ReactActual.useRef({ value: initial }).current,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    runOnJS: (fn: unknown) => fn,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

const mockPanConfigs: Array<Record<string, (arg?: unknown) => void>> = [];

jest.mock('react-native-gesture-handler', () => {
  const ReactActual = require('react');
  return {
    Gesture: {
      Pan: () => {
        const config: Record<string, unknown> = {};
        const chainable: Record<string, unknown> = {};
        for (const method of ['onBegin', 'onUpdate', 'onEnd', 'onFinalize']) {
          chainable[method] = (handler: unknown) => {
            config[method] = handler;
            return chainable;
          };
        }
        mockPanConfigs.push(config as Record<string, (arg?: unknown) => void>);
        return chainable;
      },
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

// The container's own suite covers the handle, the backdrop and the exit; here
// it only has to put its children on screen.
jest.mock('../BottomSheetContainer', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      children,
      title,
      testID,
    }: {
      visible: boolean;
      children: React.ReactNode;
      title: React.ReactNode;
      testID?: string;
    }) => (visible ? ReactActual.createElement(View, { testID }, title, children) : null),
    SheetTitle: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'sheet-title' }, children),
  };
});

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ standardContentBottomPadding: 0 }),
}));

import { HomeTabOrderSheet } from './HomeTabOrderSheet';

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'nfts', label: 'NFTs' },
];

const ROW_HEIGHT = 60;
/** The row plus the 20 component gap — one step of travel. */
const STRIDE = ROW_HEIGHT + 20;

const measureRow = (key: string) =>
  fireEvent(screen.getByTestId(`home-tab-order-row-${key}-slot`), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height: ROW_HEIGHT } },
  });

beforeEach(() => {
  mockPanConfigs.length = 0;
});

describe('HomeTabOrderSheet', () => {
  it('lists the tabs in the order it is given', () => {
    render(
      <HomeTabOrderSheet
        visible
        onClose={jest.fn()}
        tabs={[TABS[1], TABS[0]]}
        onOrderChange={jest.fn()}
      />
    );

    const rows = screen.getAllByTestId(/^home-tab-order-row-[a-z]+$/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      'home-tab-order-row-nfts',
      'home-tab-order-row-portfolio',
    ]);
  });

  it('reports the new key order when a row is dropped one place down', () => {
    const onOrderChange = jest.fn();
    render(
      <HomeTabOrderSheet visible onClose={jest.fn()} tabs={TABS} onOrderChange={onOrderChange} />
    );
    measureRow('portfolio');

    const [firstRowPan] = mockPanConfigs;
    act(() => {
      firstRowPan.onBegin();
      firstRowPan.onUpdate({ translationY: STRIDE });
      firstRowPan.onEnd();
      firstRowPan.onFinalize();
    });

    expect(onOrderChange).toHaveBeenCalledWith(['nfts', 'portfolio']);
  });

  it('reports nothing when a row is dropped where it started', () => {
    const onOrderChange = jest.fn();
    render(
      <HomeTabOrderSheet visible onClose={jest.fn()} tabs={TABS} onOrderChange={onOrderChange} />
    );
    measureRow('portfolio');

    const [firstRowPan] = mockPanConfigs;
    act(() => {
      firstRowPan.onBegin();
      // Less than half a stride: the row goes home.
      firstRowPan.onUpdate({ translationY: STRIDE / 4 });
      firstRowPan.onEnd();
      firstRowPan.onFinalize();
    });

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('cannot drop a row past the end of the list', () => {
    const onOrderChange = jest.fn();
    render(
      <HomeTabOrderSheet visible onClose={jest.fn()} tabs={TABS} onOrderChange={onOrderChange} />
    );
    measureRow('portfolio');

    const [firstRowPan] = mockPanConfigs;
    act(() => {
      firstRowPan.onBegin();
      firstRowPan.onUpdate({ translationY: STRIDE * 9 });
      firstRowPan.onEnd();
      firstRowPan.onFinalize();
    });

    expect(onOrderChange).toHaveBeenCalledWith(['nfts', 'portfolio']);
  });

  it('renders nothing while it is closed', () => {
    render(
      <HomeTabOrderSheet
        visible={false}
        onClose={jest.fn()}
        tabs={TABS}
        onOrderChange={jest.fn()}
      />
    );

    expect(screen.queryByTestId('home-tab-order-row-portfolio')).toBeNull();
  });
});
