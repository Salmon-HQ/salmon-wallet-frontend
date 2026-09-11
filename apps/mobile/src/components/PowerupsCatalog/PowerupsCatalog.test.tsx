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
    id: 'swap',
    nameKey: 'swap.catalog.name',
    descriptionKey: 'swap.catalog.description',
    tier: 'core' as const,
    installed: false,
    details: {
      aboutKey: 'swap.catalog.about',
      actionKeys: ['swap.catalog.actions.quote'],
      usesKey: 'swap.catalog.uses',
      authorKey: 'powerups.author.salmon',
      networks: ['solana-mainnet'],
    },
  },
  {
    id: 'auto-compound',
    nameKey: 'powerups.catalog.auto_compound.name',
    descriptionKey: 'powerups.catalog.auto_compound.description',
    tier: 'community' as const,
    installed: false,
    details: {
      aboutKey: 'powerups.catalog.mock.about',
      actionKeys: [],
      usesKey: 'powerups.catalog.mock.uses',
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
    expect(screen.getByTestId('powerups-row-swap')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-auto-compound')).toBeTruthy();
  });

  it('rises no higher than the ceiling Home measured', () => {
    setup();

    expect(screen.getByTestId('powerups-catalog').props.accessibilityLabel).toBe('420');
  });

  it('opens an entry’s detail in the same sheet and installs from it', () => {
    const { onInstall } = setup();

    fireEvent.press(screen.getByTestId('powerups-row-swap'));

    expect(screen.getByTestId('powerups-detail-swap')).toBeTruthy();
    // The detail is its own sheet over the catalogue: the list stays underneath.
    expect(screen.getByTestId('powerups-detail-sheet-swap')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-auto-compound')).toBeTruthy();
    // The facts under the row: who made it, where it acts, what it uses.
    expect(screen.getByTestId('powerups-detail-author')).toBeTruthy();
    expect(screen.getByTestId('powerups-facts-swap')).toBeTruthy();

    fireEvent.press(screen.getByTestId('powerups-toggle-swap'));
    expect(onInstall).toHaveBeenCalledWith('swap');
  });

  it('dismissing the detail sheet leaves the whole catalogue, not one level', () => {
    const onClose = jest.fn();
    setup({ onClose });

    fireEvent.press(screen.getByTestId('powerups-row-swap'));
    fireEvent(screen.getByTestId('powerups-detail-sheet-swap'), 'touchEnd');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers to take an installed Powerup away instead', () => {
    const { onUninstall, onInstall } = setup({
      entries: [{ ...entries[0], installed: true }, entries[1]],
    });

    fireEvent.press(screen.getByTestId('powerups-row-swap'));
    fireEvent.press(screen.getByTestId('powerups-toggle-swap'));

    expect(onUninstall).toHaveBeenCalledWith('swap');
    expect(onInstall).not.toHaveBeenCalled();
  });
});
