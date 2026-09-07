import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('expo-updates', () => ({
  __esModule: true,
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

import * as Updates from 'expo-updates';

import { useMandatoryUpdate, UPDATE_GATE_TIMEOUT_MS } from './useMandatoryUpdate';

const updates = Updates as unknown as {
  isEnabled: boolean;
  checkForUpdateAsync: jest.Mock;
  fetchUpdateAsync: jest.Mock;
  reloadAsync: jest.Mock;
};

describe('useMandatoryUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updates.isEnabled = true;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('applies a pending update before the app is shown', async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    updates.fetchUpdateAsync.mockResolvedValue({ isNew: true });
    updates.reloadAsync.mockResolvedValue(undefined);

    renderHook(() => useMandatoryUpdate());

    await waitFor(() => {
      expect(updates.reloadAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the app when there is nothing to apply', async () => {
    updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });

    const { result } = renderHook(() => useMandatoryUpdate());

    await waitFor(() => expect(result.current).toBe(false));
    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });

  // The rule that matters most: a wallet must open even when everything about
  // the update path is broken.
  it('opens the app anyway when the check throws', async () => {
    updates.checkForUpdateAsync.mockRejectedValue(new Error('no network'));

    const { result } = renderHook(() => useMandatoryUpdate());

    await waitFor(() => expect(result.current).toBe(false));
    expect(updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('opens the app anyway when the update server never answers', async () => {
    jest.useFakeTimers();
    updates.checkForUpdateAsync.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMandatoryUpdate());
    expect(result.current).toBe(true);

    await jest.advanceTimersByTimeAsync(UPDATE_GATE_TIMEOUT_MS);

    await waitFor(() => expect(result.current).toBe(false));
    expect(updates.reloadAsync).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does nothing in a development client', async () => {
    updates.isEnabled = false;

    const { result } = renderHook(() => useMandatoryUpdate());

    expect(result.current).toBe(false);
    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });
});
