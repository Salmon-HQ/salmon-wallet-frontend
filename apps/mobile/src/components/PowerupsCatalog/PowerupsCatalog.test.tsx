/**
 * The catalogue's contract with Home: two sections and nothing else, an entry
 * opens its own detail inside the same sheet, and the one control there adds
 * the Powerup to Home or takes it away again.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  getNetworkName: (network: string) => network,
  ...jest.requireActual('@salmon/shared/src/types/ui/key-value-row'),
  ...jest.requireActual('@salmon/shared/src/utils/powerupFacts'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrValues?: unknown) =>
      typeof fallbackOrValues === 'string' ? fallbackOrValues : key,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: (...coefficients: number[]) => coefficients },
  };
});

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ standardContentBottomPadding: 0 }),
}));

// The container's own suite covers the handle, the backdrop and the exit; here
// it only has to put its header and its children on screen.
jest.mock('../BottomSheetContainer', () => {
  const ReactActual = require('react');
  const { View, Text } = require('react-native');
  return {
    BottomSheetContainer: ({
      visible,
      children,
      headerContent,
      height,
      testID,
      onClose,
    }: {
      visible: boolean;
      children: React.ReactNode;
      headerContent?: React.ReactNode;
      height?: number;
      testID?: string;
      onClose?: () => void;
    }) =>
      visible
        ? ReactActual.createElement(
            View,
            { testID, accessibilityLabel: String(height ?? ''), onTouchEnd: onClose },
            headerContent,
            children
          )
        : null,
    SheetTitle: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(Text, null, children),
  };
});

import { PowerupsCatalog } from './PowerupsCatalog';

const entries = [
  {
    id: 'memo',
    nameKey: 'memo.catalog.name',
    descriptionKey: 'memo.catalog.description',
    tier: 'core' as const,
    iconName: 'ArrowsLeftRight' as const,
    installed: false,
    details: {
      aboutKey: 'memo.catalog.about',
      actionKeys: ['memo.catalog.actions.write'],
      disclosure: [{ key: 'powerups.disclosure.address_to', params: { host: 'Salmon' } }],
      authorKey: 'powerups.author.salmon',
      networks: ['solana-mainnet'],
    },
  },
  {
    id: 'fixture-community',
    nameKey: 'memo.catalog.name',
    descriptionKey: 'memo.catalog.description',
    tier: 'community' as const,
    iconName: 'ChartPie' as const,
    installed: false,
    details: {
      aboutKey: 'memo.catalog.about',
      actionKeys: [],
      disclosure: [{ key: 'powerups.disclosure.sends_nothing' }],
      authorKey: 'powerups.author.community',
      networks: ['solana-mainnet'],
    },
  },
];

function setup(overrides: Partial<React.ComponentProps<typeof PowerupsCatalog>> = {}) {
  const onInstall = jest.fn();
  const onUninstall = jest.fn();
  render(
    <PowerupsCatalog
      visible
      onClose={jest.fn()}
      entries={entries}
      onInstall={onInstall}
      onUninstall={onUninstall}
      height={420}
      {...overrides}
    />
  );
  return { onInstall, onUninstall };
}

describe('PowerupsCatalog', () => {
  it('draws Core and Community, and nothing else', () => {
    setup();

    expect(screen.getByText('POWERUPS.SECTIONS.CORE')).toBeTruthy();
    expect(screen.getByText('POWERUPS.SECTIONS.COMMUNITY')).toBeTruthy();
    // No filters, no search, no "installed" section: the sections ARE the
    // catalogue, and an installed Powerup stays in its own tier.
    expect(screen.queryByTestId('powerups-filters')).toBeNull();
    expect(screen.queryByTestId('powerups-search-input')).toBeNull();
    expect(screen.getByTestId('powerups-row-memo')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-fixture-community')).toBeTruthy();
  });

  it('rises no higher than the ceiling Home measured', () => {
    setup();

    expect(screen.getByTestId('powerups-catalog').props.accessibilityLabel).toBe('420');
  });

  it('opens an entry’s detail in the same sheet and installs from it', () => {
    const { onInstall } = setup();

    fireEvent.press(screen.getByTestId('powerups-row-memo'));

    expect(screen.getByTestId('powerups-detail-memo')).toBeTruthy();
    // The detail is its own sheet over the catalogue: the list stays underneath.
    expect(screen.getByTestId('powerups-detail-sheet-memo')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-fixture-community')).toBeTruthy();
    // The facts under the row: who made it, where it acts, what it uses.
    expect(screen.getByTestId('powerups-detail-author')).toBeTruthy();
    expect(screen.getByTestId('powerups-facts-memo')).toBeTruthy();

    fireEvent.press(screen.getByTestId('powerups-detail-toggle-memo'));
    expect(onInstall).toHaveBeenCalledWith('memo');
  });

  it('the row’s own control installs in place, without opening the detail', () => {
    const { onInstall } = setup();

    fireEvent.press(screen.getByTestId('powerups-row-toggle-memo'));

    expect(onInstall).toHaveBeenCalledWith('memo');
    expect(screen.queryByTestId('powerups-detail-memo')).toBeNull();
  });

  it('dismissing the detail sheet leaves the whole catalogue, not one level', () => {
    const onClose = jest.fn();
    setup({ onClose });

    fireEvent.press(screen.getByTestId('powerups-row-memo'));
    fireEvent(screen.getByTestId('powerups-detail-sheet-memo'), 'touchEnd');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers to take an installed Powerup away instead', () => {
    const { onUninstall, onInstall } = setup({
      entries: [{ ...entries[0], installed: true }, entries[1]],
    });

    fireEvent.press(screen.getByTestId('powerups-row-memo'));
    fireEvent.press(screen.getByTestId('powerups-detail-toggle-memo'));

    expect(onUninstall).toHaveBeenCalledWith('memo');
    expect(onInstall).not.toHaveBeenCalled();
  });
});
