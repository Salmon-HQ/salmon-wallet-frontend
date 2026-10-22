/**
 * A copied recovery phrase or private key leaves the clipboard 60 s after the
 * copy while the app is open, or when the user comes back to the app after
 * that: iOS suspends the app's timers in the background, so the return to the
 * foreground is what clears it there.
 */
import { AppState, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn(async (_text: string) => true);
jest.mock('expo-clipboard', () => ({
  setStringAsync: (text: string) => mockSetStringAsync(text),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/utils/secret-clipboard'),
}));

import { secretClipboard, useSecretClipboardResume } from './useSecretClipboard';

const appStateListeners: ((state: string) => void)[] = [];

const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function Root() {
  useSecretClipboardResume();
  return <Text>app</Text>;
}

const flush = () => act(async () => {});

describe('secretClipboard on mobile', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSetStringAsync.mockClear();
    appStateListeners.length = 0;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as never;
    });
  });
  afterEach(() => jest.useRealTimers());

  it('clears the phrase 60 s after the copy while the app is open', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));
    expect(mockSetStringAsync).toHaveBeenLastCalledWith(PHRASE);

    await act(async () => {
      jest.advanceTimersByTime(59_999);
    });
    expect(mockSetStringAsync).not.toHaveBeenCalledWith('');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await flush();
    expect(mockSetStringAsync).toHaveBeenLastCalledWith('');
  });

  it('clears on the return to the foreground once 60 s have passed', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));

    // In the background: the timer never ran, and nothing clears.
    jest.setSystemTime(Date.now() + 61_000);
    appStateListeners.forEach((listener) => listener('background'));
    await flush();
    expect(mockSetStringAsync).not.toHaveBeenCalledWith('');

    appStateListeners.forEach((listener) => listener('active'));
    await flush();
    expect(mockSetStringAsync).toHaveBeenLastCalledWith('');
  });

  it('leaves the phrase on a return inside the 60 s', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));

    jest.setSystemTime(Date.now() + 30_000);
    appStateListeners.forEach((listener) => listener('active'));
    await flush();

    expect(mockSetStringAsync).not.toHaveBeenCalledWith('');
  });
});
