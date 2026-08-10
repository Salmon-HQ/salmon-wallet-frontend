import React from 'react';
import { render } from '@testing-library/react-native';

const mockScreen = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    { Screen: (props: Record<string, unknown>) => mockScreen(props) },
  ),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: () => null,
}));

jest.mock('@salmon/shared', () => ({
  gradients: {
    onboarding: { colors: ['#000', '#111'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  },
}));

import AuthLayout from '../../app/(auth)/_layout';

const optionsFor = (name: string): Record<string, unknown> => {
  const call = mockScreen.mock.calls.find(([props]) => props.name === name);
  if (!call) throw new Error(`No Stack.Screen registered for "${name}"`);
  return (call[0].options ?? {}) as Record<string, unknown>;
};

describe('AuthLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(<AuthLayout />);
  });

  it.each(['index', 'password', 'biometric-setup', 'analytics-consent', 'success', 'derived-accounts'])(
    'disables the swipe-back gesture on "%s"',
    (name) => {
      expect(optionsFor(name).gestureEnabled).toBe(false);
    },
  );

  it('keeps the swipe-back gesture on the screens the user can return from', () => {
    expect(optionsFor('recover').gestureEnabled).not.toBe(false);
    expect(optionsFor('create').gestureEnabled).not.toBe(false);
  });
});
