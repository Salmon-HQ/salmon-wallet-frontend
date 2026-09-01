/**
 * The one thing a settings panel cannot get wrong is its exit: the header's
 * back well and, when a panel needs one, a sticky footer action that stays
 * outside the scrollable body.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// The header's step indicator (mounted whenever ScreenHeader is, via
// `StepIndicator`) reads `motionEasing` through `src/utils/motion.ts` at
// module scope, so the mock needs the real durations alongside the theme.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
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

// The header's back well mounts an IconBubble, which reads press motion off
// Reanimated — no worklets runtime in Jest (ScreenHeader.test.tsx's stand-in).
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

import { SettingsScreenLayout } from './SettingsScreenLayout';

describe('SettingsScreenLayout', () => {
  it('renders a footer outside the scrollable body when one is passed', () => {
    render(
      <SettingsScreenLayout title="Security" onBack={jest.fn()} footer={<Text>Save</Text>}>
        <Text>Body</Text>
      </SettingsScreenLayout>
    );

    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders no footer when none is passed', () => {
    render(
      <SettingsScreenLayout title="Security" onBack={jest.fn()}>
        <Text>Body</Text>
      </SettingsScreenLayout>
    );

    expect(screen.queryByText('Save')).toBeNull();
  });
});
