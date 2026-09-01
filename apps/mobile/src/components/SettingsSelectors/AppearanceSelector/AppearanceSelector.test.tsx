/**
 * AppearanceSelector renders the three theme choices and marks the active
 * one, mirroring the other single-choice selectors (Language, Currency).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Same mock shape as SettingsScreenLayout.test.tsx: the header's step
// indicator reads `motionEasing` at module scope, so the real durations ride
// alongside the theme tokens.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNView, props, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
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
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    Easing: { bezier: () => () => 0 },
  };
});

import { AppearanceSelector } from './AppearanceSelector';

describe('AppearanceSelector', () => {
  it('renders System, Light and Dark options', () => {
    render(
      <AppearanceSelector activePreference="system" onSelectPreference={jest.fn()} onBack={jest.fn()} />
    );

    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
  });

  it('marks the active preference with a selected row', () => {
    render(
      <AppearanceSelector activePreference="dark" onSelectPreference={jest.fn()} onBack={jest.fn()} />
    );

    expect(screen.getByTestId('appearance-option-dark')).toBeTruthy();
  });

  it('calls onSelectPreference with the tapped preference', () => {
    const onSelectPreference = jest.fn();
    render(
      <AppearanceSelector
        activePreference="system"
        onSelectPreference={onSelectPreference}
        onBack={jest.fn()}
      />
    );

    fireEvent.press(screen.getByTestId('appearance-option-light'));
    expect(onSelectPreference).toHaveBeenCalledWith('light');
  });
});
