/**
 * useSecretScreen - protection is requested on mount and released on unmount.
 *
 * These assertions are the reason the hook exists: a secret screen that
 * acquires protection but never releases it leaves the whole app unable to
 * screenshot, and one that releases too early re-exposes key material while
 * a sibling secret component is still mounted. Capture prevention is
 * Android-only — on iOS the workaround behind it blacks out the live screen
 * on some devices (expo/expo#24041), so iOS gets only the app-switcher blur.
 */
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

const mockPreventScreenCaptureAsync = jest.fn((_key: string) => Promise.resolve());
const mockAllowScreenCaptureAsync = jest.fn((_key: string) => Promise.resolve());
const mockEnableAppSwitcherProtectionAsync = jest.fn(() => Promise.resolve());
const mockDisableAppSwitcherProtectionAsync = jest.fn(() => Promise.resolve());

// Mirrors the real module's keyed refcounting so the test exercises the key
// discipline the hook depends on, not just that some function was called.
// (The hook now calls the async functions directly — inlined so the iOS
// Simulator can skip capture prevention — so the refcount lives here.)
jest.mock('expo-screen-capture', () => {
  const activeTags = new Set<string>();

  return {
    preventScreenCaptureAsync: (key = 'default') => {
      if (!activeTags.has(key)) {
        activeTags.add(key);
        mockPreventScreenCaptureAsync(key);
      }
      return Promise.resolve();
    },
    allowScreenCaptureAsync: (key = 'default') => {
      activeTags.delete(key);
      if (activeTags.size === 0) {
        mockAllowScreenCaptureAsync(key);
      }
      return Promise.resolve();
    },
    enableAppSwitcherProtectionAsync: () => mockEnableAppSwitcherProtectionAsync(),
    disableAppSwitcherProtectionAsync: () => mockDisableAppSwitcherProtectionAsync(),
  };
});

import { Platform } from 'react-native';
import { useSecretScreen, __resetAppSwitcherRefCountForTests } from './useSecretScreen';

function SecretScreen({ label = 'test-secret' }: { label?: string }) {
  useSecretScreen(label);
  return <Text>secret</Text>;
}

describe('useSecretScreen', () => {
  // Capture prevention is Android-only now; run the refcounting suite there.
  const originalOS = Platform.OS;
  beforeAll(() => {
    Platform.OS = 'android';
  });
  afterAll(() => {
    Platform.OS = originalOS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __resetAppSwitcherRefCountForTests();
  });

  it('requests screen capture protection while mounted and releases it on unmount', () => {
    const screen = render(<SecretScreen />);

    expect(mockPreventScreenCaptureAsync).toHaveBeenCalledTimes(1);
    expect(mockAllowScreenCaptureAsync).not.toHaveBeenCalled();

    screen.unmount();

    expect(mockAllowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps protection while any sibling secret component is still mounted', () => {
    // Two SeedWordInputs on the same screen is the real-world case.
    const first = render(<SecretScreen label="word-a" />);
    const second = render(<SecretScreen label="word-b" />);

    expect(mockPreventScreenCaptureAsync).toHaveBeenCalledTimes(2);

    first.unmount();
    expect(mockAllowScreenCaptureAsync).not.toHaveBeenCalled();

    second.unmount();
    expect(mockAllowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('gives each instance a distinct key so identical labels do not collide', () => {
    const first = render(<SecretScreen label="seed-word-input" />);
    const second = render(<SecretScreen label="seed-word-input" />);

    const keys = mockPreventScreenCaptureAsync.mock.calls.map(([key]) => key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);

    first.unmount();
    expect(mockAllowScreenCaptureAsync).not.toHaveBeenCalled();

    second.unmount();
    expect(mockAllowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  describe('on iOS', () => {
    const originalOS = Platform.OS;
    beforeAll(() => {
      Platform.OS = 'ios';
    });
    afterAll(() => {
      Platform.OS = originalOS;
    });

    it('enables the app switcher blur once and disables it after the last unmount', () => {
      const first = render(<SecretScreen label="ios-a" />);
      const second = render(<SecretScreen label="ios-b" />);

      // Reference counted: enabled once, not once per component.
      expect(mockEnableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
      // Never on iOS: the secure-field workaround blacks out the live screen
      // on some devices (expo/expo#24041).
      expect(mockPreventScreenCaptureAsync).not.toHaveBeenCalled();

      first.unmount();
      expect(mockDisableAppSwitcherProtectionAsync).not.toHaveBeenCalled();

      second.unmount();
      expect(mockDisableAppSwitcherProtectionAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('on Android', () => {
    const originalOS = Platform.OS;
    beforeAll(() => {
      Platform.OS = 'android';
    });
    afterAll(() => {
      Platform.OS = originalOS;
    });

    it('skips the iOS-only app switcher call, since FLAG_SECURE already blanks Recents', () => {
      const screen = render(<SecretScreen label="android" />);

      expect(mockPreventScreenCaptureAsync).toHaveBeenCalledTimes(1);
      expect(mockEnableAppSwitcherProtectionAsync).not.toHaveBeenCalled();

      screen.unmount();
      expect(mockDisableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
    });
  });
});
