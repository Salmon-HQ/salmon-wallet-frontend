import React from 'react';
import { render } from '@testing-library/react-native';

const mockScreen = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children?: React.ReactNode }) => <>{children}</>, {
    Screen: (props: Record<string, unknown>) => mockScreen(props),
  }),
}));

// Both ground layers reach @salmon/shared, which pulls @solana/kit into a
// transform jest-expo will not run. Neither drawing is what this file is
// about; that they are mounted here at all is asserted below.
jest.mock('../../src/components/DepthBackground', () => {
  const { View } = jest.requireActual('react-native');
  return { DepthBackground: () => <View testID="ground-depth" /> };
});

jest.mock('../../src/components/ScalesBackground', () => {
  const { View } = jest.requireActual('react-native');
  return { ScalesBackground: () => <View testID="ground-scales" /> };
});

import AuthLayout from '../../app/(auth)/_layout';

const optionsFor = (name: string): Record<string, unknown> => {
  const call = mockScreen.mock.calls.find(([props]) => props.name === name);
  if (!call) throw new Error(`No Stack.Screen registered for "${name}"`);
  return (call[0].options ?? {}) as Record<string, unknown>;
};

describe('AuthLayout', () => {
  let view: ReturnType<typeof render>;

  beforeEach(() => {
    jest.clearAllMocks();
    view = render(<AuthLayout />);
  });

  it('stands the whole onboarding flow in the app ground, once for the stack', () => {
    // The motif belongs to the water, and onboarding is in the same water as
    // everything else — it used to carry a gradient only it had. Mounted on
    // the layout rather than per screen, so the next screen added to this
    // stack cannot be born without a ground.
    expect(view.getAllByTestId('ground-depth')).toHaveLength(1);
    expect(view.getAllByTestId('ground-scales')).toHaveLength(1);
  });

  it.each([
    'index',
    'password',
    'biometric-setup',
    'analytics-consent',
    'success',
    'derived-accounts',
  ])('disables the swipe-back gesture on "%s"', (name) => {
    expect(optionsFor(name).gestureEnabled).toBe(false);
  });

  it('keeps the swipe-back gesture on the screens the user can return from', () => {
    expect(optionsFor('recover').gestureEnabled).not.toBe(false);
    expect(optionsFor('seed-warning').gestureEnabled).not.toBe(false);
    expect(optionsFor('create').gestureEnabled).not.toBe(false);
  });
});
