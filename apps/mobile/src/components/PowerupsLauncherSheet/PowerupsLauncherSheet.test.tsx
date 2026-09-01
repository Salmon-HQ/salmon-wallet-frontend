import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

// The @salmon/shared barrel drags the ESM-only @solana/kit into Jest; the
// theme modules the component draws from are runtime-agnostic, so they are
// loaded directly (the FleshBackground test's convention).
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/spacing'),
  ...jest.requireActual('@salmon/shared/src/theme/typography'),
  semantic: jest.requireActual('@salmon/shared/src/theme/semantic').semantic,
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
}));

jest.mock('../BottomSheetContainer', () => {
  const { View } = require('react-native');
  return {
    BottomSheetContainer: ({
      title,
      children,
      testID,
    }: {
      title?: React.ReactNode;
      children?: React.ReactNode;
      testID?: string;
    }) => (
      <View testID={testID}>
        {title}
        {children}
      </View>
    ),
  };
});

jest.mock('../Thermocline', () => ({
  Thermocline: () => null,
}));

// The browse row's leading mark is an `IconBubble`, which pulls the repo's
// press idiom; none of it has a worklets runtime under Jest.
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
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));
jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

import { PowerupsLauncherSheet } from './PowerupsLauncherSheet';

describe('PowerupsLauncherSheet', () => {
  it('renders the sheet root and heading', () => {
    render(<PowerupsLauncherSheet visible onClose={jest.fn()} />);

    expect(screen.getByTestId('powerups-launcher-sheet')).toBeTruthy();
    expect(screen.getByText('Powerups')).toBeTruthy();
    expect(screen.getByText('INSTALLED')).toBeTruthy();
  });

  it('leaves the browse row inert until the browse screen exists', () => {
    // A row that looks tappable and does nothing teaches the user the app is
    // broken. It comes back pressable with POWERUPS 02.
    render(<PowerupsLauncherSheet visible onClose={jest.fn()} />);

    const row = screen.getByTestId('powerups-browse-button');
    expect(row.props.onPress).toBeUndefined();
    expect(row.props.accessibilityRole).not.toBe('button');
  });
});
