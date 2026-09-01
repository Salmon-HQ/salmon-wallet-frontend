/**
 * POWERUPS 02 · Browse.
 *
 * The rules that are not visible from the markup: the mock catalogue is
 * developer-only, a powerup appears in exactly one section, the search and the
 * chips filter the same list, and the FAB on this screen is the Home FAB
 * turned — it closes the screen rather than opening a second one.
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
  useTabChrome: () => ({ scrollBottomPadding: 0, floatingBottomOffset: 0 }),
}));

jest.mock('../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => mockDevMode.on,
}));

jest.mock('../src/icons', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  const glyph = (name: string) => () => ReactActual.createElement(View, { testID: `glyph-${name}` });
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
  const { Text, View } = require('react-native');

  return {
    DepthBackground: () => null,
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
    ChipGroup: ({
      options,
      value,
      onChange,
      testID,
    }: {
      options: Array<{ key: string; label: string }>;
      value: string;
      onChange: (key: string) => void;
      testID?: string;
    }) => (
      <View>
        {options.map((option) => (
          <Text
            key={option.key}
            testID={`${testID}-${option.key}`}
            accessibilityState={{ selected: option.key === value }}
            onPress={() => onChange(option.key)}
          >
            {option.label}
          </Text>
        ))}
      </View>
    ),
    PowerupsFab: ({ open, onPress }: { open?: boolean; onPress: () => void }) => (
      <View testID="powerups-fab" accessibilityState={{ expanded: !!open }} onPress={onPress} />
    ),
  };
});

import PowerupsScreen from '../app/(app)/powerups';

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

  it('wears the FAB open and closes the screen with it', () => {
    render(<PowerupsScreen />);

    const fab = screen.getByTestId('powerups-fab');
    expect(fab.props.accessibilityState.expanded).toBe(true);

    fireEvent.press(fab);

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('dismisses itself before opening swap — the tab shell is behind it', () => {
    render(<PowerupsScreen />);

    fireEvent.press(screen.getByTestId('powerups-tile-swap'));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/swap');
  });
});
