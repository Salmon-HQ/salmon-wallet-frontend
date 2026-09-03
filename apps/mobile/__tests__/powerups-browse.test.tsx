/**
 * POWERUPS 02 · Browse.
 *
 * The rules that are not visible from the markup: the mock catalogue is
 * developer-only, a powerup appears in exactly one section, the search and the
 * chips filter the same list, and this screen draws no FAB of its own — the
 * one control lives above the stack in `(app)/_layout.tsx`.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import en from '../../../packages/shared/src/locales/en/translation.json';

const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockDevMode = { on: false };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('react-i18next', () => {
  const dictionary = require('../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => (resolve(key) as string) ?? fallback ?? key,
    }),
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../test-utils/themeTokens'),
  useAccountsContext: () => [{ locked: false }, {}],
}));

jest.mock('../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ topInset: 0, scrollBottomPadding: 0 }),
}));

jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => mockDevMode.on,
}));

jest.mock('../src/icons', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  const glyph = (name: string) => () =>
    ReactActual.createElement(View, { testID: `glyph-${name}` });
  return {
    ArrowsLeftRightIcon: glyph('swap'),
    ImageIcon: glyph('image'),
    ShieldCheckIcon: glyph('shield'),
    StackIcon: glyph('stack'),
    TrendUpIcon: glyph('trend'),
    LightningIcon: glyph('lightning'),
    MagnifyingGlassIcon: glyph('search'),
    iconSize: { sm: 16, md: 20, lg: 24, xl: 28 },
  };
});

jest.mock('../src/components', () => {
  const ReactActual = require('react');
  const { Text, TextInput, View } = require('react-native');

  return {
    DepthBackground: () => null,
    SearchField: ({
      testID,
      value,
      onChangeText,
      placeholder,
    }: {
      testID?: string;
      value: string;
      onChangeText: (text: string) => void;
      placeholder: string;
    }) => (
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    ),
    ScalesBackground: () => null,
    IconBubble: () => null,
    ScreenHeader: ({ title, subtitle }: { title?: string; subtitle?: string }) => (
      <View testID="screen-header">
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
      </View>
    ),
    SectionLabel: ({ children }: { children: string }) => <Text>{children}</Text>,
    Card: ({
      testID,
      onPress,
      children,
    }: {
      testID?: string;
      onPress?: () => void;
      children?: React.ReactNode;
    }) => (
      <View testID={testID} onPress={onPress}>
        {children}
      </View>
    ),
    ListRow: ({
      testID,
      title,
      subtitle,
      trailing,
    }: {
      testID?: string;
      title: string;
      subtitle?: React.ReactNode;
      trailing?: React.ReactNode;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {trailing}
      </View>
    ),
    PowerupBadge: ({ tier }: { tier: string }) => <Text>{`badge:${tier}`}</Text>,
    StateBlock: ({ testID, title }: { testID?: string; title: string }) => (
      <View testID={testID}>
        <Text>{title}</Text>
      </View>
    ),
    UnderlineTabs: ({
      tabs,
      activeKey,
      onChange,
      tabTestIDPrefix,
    }: {
      tabs: Array<{ key: string; label: string }>;
      activeKey: string;
      onChange: (key: string) => void;
      tabTestIDPrefix?: string;
    }) => (
      <View>
        {tabs.map((tab) => (
          <Text
            key={tab.key}
            testID={`${tabTestIDPrefix}-${tab.key}`}
            accessibilityState={{ selected: tab.key === activeKey }}
            onPress={() => onChange(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </View>
    ),
  };
});

import PowerupsScreen from '../src/screens/PowerupsRoute';

const NAMES = en.powerups.catalog;

describe('powerups browse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevMode.on = false;
  });

  it('ships only the real catalogue without developer mode', () => {
    render(<PowerupsScreen />);

    // Swap is installed, so it is a tile — and only a tile.
    expect(screen.getByTestId('powerups-tile-swap')).toBeTruthy();
    expect(screen.queryByTestId('powerups-row-swap')).toBeNull();

    // Nothing else exists yet, so the other three sections say so.
    expect(screen.getByTestId('powerups-empty-featured')).toBeTruthy();
    expect(screen.getByTestId('powerups-empty-official')).toBeTruthy();
    expect(screen.getByTestId('powerups-empty-community')).toBeTruthy();
    expect(screen.queryByTestId('powerups-featured-wallet-guard')).toBeNull();
  });

  it('renders every section from the catalogue in developer mode', () => {
    mockDevMode.on = true;
    render(<PowerupsScreen />);

    expect(screen.getByTestId('powerups-tile-swap')).toBeTruthy();
    // Featured outranks the tier, so a featured community powerup is not a
    // community row as well.
    expect(screen.getByTestId('powerups-featured-wallet-guard')).toBeTruthy();
    expect(screen.getByTestId('powerups-featured-nft-floor-watch')).toBeTruthy();
    expect(screen.queryByTestId('powerups-row-nft-floor-watch')).toBeNull();
    expect(screen.getByTestId('powerups-row-staking')).toBeTruthy();
    expect(screen.getByTestId('powerups-row-auto-compound')).toBeTruthy();
    expect(screen.queryByTestId('powerups-empty-official')).toBeNull();
  });

  it('filters on what the user reads, not on the key', () => {
    mockDevMode.on = true;
    render(<PowerupsScreen />);

    fireEvent.changeText(screen.getByTestId('powerups-search-input'), 'floor');

    expect(screen.getByTestId('powerups-featured-nft-floor-watch')).toBeTruthy();
    expect(screen.queryByTestId('powerups-featured-wallet-guard')).toBeNull();
    expect(screen.queryByTestId('powerups-tile-swap')).toBeNull();
    expect(screen.getByTestId('powerups-empty-installed')).toBeTruthy();
    expect(NAMES.nft_floor_watch.name).toBe('NFT Floor Watch');
  });

  it('narrows the catalogue to one tier from the chips', () => {
    mockDevMode.on = true;
    render(<PowerupsScreen />);

    fireEvent.press(screen.getByTestId('powerups-filters-community'));

    expect(screen.getByTestId('powerups-row-auto-compound')).toBeTruthy();
    expect(screen.getByTestId('powerups-featured-nft-floor-watch')).toBeTruthy();
    // Official entries are gone, and so is the installed official tile.
    expect(screen.queryByTestId('powerups-row-staking')).toBeNull();
    expect(screen.queryByTestId('powerups-featured-wallet-guard')).toBeNull();
    expect(screen.queryByTestId('powerups-tile-swap')).toBeNull();
  });

  it('draws no FAB of its own — the one above the stack owns both routes', () => {
    render(<PowerupsScreen />);

    // Two instances is what the `fullScreenModal` presentation forced; the
    // single hoisted control (see `(app)/_layout.tsx`) is what makes the turn
    // visible while this screen rises.
    expect(screen.queryByTestId('powerups-fab')).toBeNull();
  });

  // Swap is listed and inert: the surface is closed for this release and its
  // screen is parked off the router, so the catalogue entry carries no route
  // and the tile opens nothing. This test used to assert the opposite — that
  // pressing it dismissed the catalogue and pushed `/swap` — which is exactly
  // the path being closed. It stays as the guard that it *is* closed.
  it('draws swap but opens nothing — the surface is closed until spec 027', () => {
    render(<PowerupsScreen />);

    fireEvent.press(screen.getByTestId('powerups-tile-swap'));

    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
