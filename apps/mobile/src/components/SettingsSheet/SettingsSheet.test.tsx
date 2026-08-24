import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockPop = jest.fn();
const mockReset = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest. The motion vocabulary itself is asserted in
// `src/utils/motion.ts`'s consumers; here the animation layer only has to
// exist.
jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => false,
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: (value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
    interpolate: () => 0,
    Easing: {
      in: (fn: unknown) => fn,
      out: (fn: unknown) => fn,
      inOut: (fn: unknown) => fn,
      linear: (t: number) => t,
      ease: (t: number) => t,
      cubic: (t: number) => t,
      bezier: (...args: number[]) => args,
    },
  };
});

// The sheet is a base screen now: the stack lives in the host above it, and
// the sheet asks that host to push. Mocking the navigation is what stands in
// for "there is a host around me".
jest.mock('../PanelHost', () => ({
  usePanelNavigation: () => ({ push: mockPush, pop: mockPop, canGoBack: false }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  semantic: {
    status: {
      success: '#33D6A6',
      danger: '#FF6B85',
      warning: '#FFB020',
      dangerTint: 'rgba(239,68,68,0.1)',
      warningTint: 'rgba(255,171,0,0.1)',
      warningTintBorder: 'rgba(255,171,0,0.3)',
    },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', accent: '#FF5C45' },
    surface: {
      shelf: '#10131C',
      raised: '#161C2D',
      crest: '#1B2233',
      membraneThick: 'rgba(11,15,25,0.80)',
    },
    depth: { column: '#0B0F19', abyss: '#070911' },
    accent: { fill: '#FF5C45', ink: '#FF5C45', tint: 'rgba(255,92,69,0.10)' },
    border: { default: '#58637B', raised: '#6F7B95' },
  },
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
  colors: {
    status: { error: '#f00', errorBackground: '#300' },
    background: { card: '#111', secondary: '#000' },
    text: { primary: '#fff', secondary: '#999' },
    accent: { primary: '#0f0' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    '2xl': 24,
  },
  contentPadding: {
    screen: 16,
  },
  borderRadius: {
    md: 12,
  },
  fontSize: {
    sm: 14,
    bodyLg: 18,
  },
  componentSizes: {},
  fontFamilyNative: {
    medium: 'System',
  },
  useSettingsPanelStack: () => ({
    stack: [],
    push: mockPush,
    pop: mockPop,
    reset: mockReset,
    canGoBack: false,
  }),
  getSettingsItemTestId: (id: string) => `settings-item-${id}`,
  trackEvent: jest.fn(),
  letterSpacing: {
    wider: 1,
  },
}));

jest.mock('../SettingsPanelStack', () => ({
  SettingsPanelStack: () => null,
}));

jest.mock('../SettingsHeaderContext', () => {
  const React = require('react');
  return {
    SettingsHeaderContext: React.createContext({ setHeaderState: () => {} }),
  };
});

import { SettingsSheet } from './SettingsSheet';

describe('SettingsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the developer networks toggle callback from the switch row', () => {
    const onDeveloperNetworksToggle = jest.fn();

    const view = render(
      <SettingsSheet
        visible
        onClose={jest.fn()}
        onDeveloperNetworksToggle={onDeveloperNetworksToggle}
        developerNetworksEnabled={false}
      />
    );

    const switchControl = view.getByTestId('settings-developer-networks-toggle');
    expect(switchControl).toBeTruthy();

    fireEvent(switchControl, 'valueChange', true);

    expect(onDeveloperNetworksToggle).toHaveBeenCalledWith(true);
  });

  it('reflects granted analytics consent and withdraws it from the switch row', () => {
    const onAnalyticsToggle = jest.fn();

    const view = render(
      <SettingsSheet
        visible
        onClose={jest.fn()}
        onAnalyticsToggle={onAnalyticsToggle}
        analyticsEnabled
      />
    );

    const switchControl = view.getByTestId('settings-analytics-toggle');
    expect(switchControl.props.value).toBe(true);

    fireEvent(switchControl, 'valueChange', false);

    expect(onAnalyticsToggle).toHaveBeenCalledWith(false);
  });

  it('shows analytics off when consent was declined or never given', () => {
    const view = render(<SettingsSheet visible onClose={jest.fn()} />);

    expect(view.getByTestId('settings-analytics-toggle').props.value).toBe(false);
  });

  it('runs remove-all action and closes the sheet', () => {
    const onRemoveAllWallets = jest.fn();
    const onClose = jest.fn();

    render(<SettingsSheet visible onClose={onClose} onRemoveAllWallets={onRemoveAllWallets} />);

    fireEvent.press(screen.getByLabelText('settings.wallets.remove_all_wallets'));

    expect(onRemoveAllWallets).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks the host to push a panel for a navigable option', () => {
    render(<SettingsSheet visible onClose={jest.fn()} panelRegistry={{} as any} />);

    fireEvent.press(screen.getByLabelText('settings.currency'));

    expect(mockPush).toHaveBeenCalledWith('currency');
    expect(mockPop).not.toHaveBeenCalled();
  });

  describe('the list is a table of contents, not a warning', () => {
    const flatStyle = (node: { props: { style?: unknown } }) =>
      StyleSheet.flatten(node.props.style) as {
        backgroundColor?: string;
        borderColor?: string;
        borderTopWidth?: number;
      };
    const rowStyle = (label: string) => flatStyle(screen.getByLabelText(label));
    const sectionStyle = (titleKey: string) =>
      flatStyle(screen.getByTestId(`settings-section-${titleKey}`));

    it.each([['settings.backup'], ['settings.private_key']])(
      'gives %s the same ground as any other row',
      (label) => {
        render(<SettingsSheet visible onClose={jest.fn()} panelRegistry={{} as any} />);

        // Amber on a row that only opens a screen reads as a fault report. The
        // warning lives on the destination, before the reveal it guards.
        expect(rowStyle(label).backgroundColor).toBeUndefined();
        expect(rowStyle(label).borderColor).toBeUndefined();
        expect(screen.getByLabelText(label).props.accessibilityHint).toBeUndefined();
      }
    );

    it('still lets a destroy action wear the danger tint — on the group', () => {
      render(<SettingsSheet visible onClose={jest.fn()} panelRegistry={{} as any} />);

      expect(sectionStyle('settings.sections.danger_zone').backgroundColor).toBe(
        'rgba(239,68,68,0.1)'
      );
      expect(sectionStyle('settings.sections.account').backgroundColor).toBe('#111');
    });
  });

  describe('one card per section, and each row says what it reads', () => {
    it('parts siblings with a hairline instead of a gap — never above the first', () => {
      render(<SettingsSheet visible onClose={jest.fn()} panelRegistry={{} as any} />);

      const first = StyleSheet.flatten(
        screen.getByLabelText('settings.accounts.title').props.style
      ) as { borderTopWidth?: number };
      const second = StyleSheet.flatten(
        screen.getByLabelText('settings.profile_picture').props.style
      ) as { borderTopWidth?: number };

      expect(first.borderTopWidth).toBeUndefined();
      expect(second.borderTopWidth).toBe(StyleSheet.hairlineWidth);
    });

    it('states the current value on the rows that have one', () => {
      render(
        <SettingsSheet
          visible
          onClose={jest.fn()}
          panelRegistry={{} as any}
          optionValues={{ language: 'Espanol', currency: 'EUR', explorer: 'Solscan' }}
        />
      );

      expect(screen.getByTestId('settings-item-language-value').props.children).toBe('Espanol');
      expect(screen.getByTestId('settings-item-currency-value').props.children).toBe('EUR');
      expect(screen.getByTestId('settings-item-explorer-value').props.children).toBe('Solscan');
      // A row with nothing to state stays a label alone.
      expect(screen.queryByTestId('settings-item-security-value')).toBeNull();
    });
  });

  it('renders push rows without a right chevron — the push sinks and floats, it does not slide', () => {
    const { CaretRightIcon } = jest.requireActual('../../icons');
    const view = render(<SettingsSheet visible onClose={jest.fn()} panelRegistry={{} as any} />);

    expect(view.UNSAFE_queryAllByType(CaretRightIcon)).toHaveLength(0);
  });
});
