/**
 * @vitest-environment jsdom
 * Verifies the consent hook reflects and mutates the analytics client's state,
 * and degrades to a safe no-op when analytics was never initialised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

let currentConsent = false;
const fakeClient = {
  whenReady: vi.fn(async () => {}),
  getConsent: vi.fn(() => currentConsent),
  setConsent: vi.fn(async (enabled: boolean) => {
    currentConsent = enabled;
  }),
};

let clientHolder: typeof fakeClient | null = fakeClient;

vi.mock('../analytics', () => ({
  getAnalytics: () => clientHolder,
}));

import { useAnalyticsConsent } from './useAnalyticsConsent';

beforeEach(() => {
  currentConsent = false;
  clientHolder = fakeClient;
  vi.clearAllMocks();
});

describe('useAnalyticsConsent', () => {
  it('loads persisted consent from the client', async () => {
    currentConsent = true;
    const { result } = renderHook(() => useAnalyticsConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.consent).toBe(true);
  });

  it('grants consent through the client', async () => {
    const { result } = renderHook(() => useAnalyticsConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setConsent(true);
    });

    expect(fakeClient.setConsent).toHaveBeenCalledWith(true);
    expect(result.current.consent).toBe(true);
  });

  it('toggles the current value', async () => {
    currentConsent = true;
    const { result } = renderHook(() => useAnalyticsConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleConsent();
    });

    expect(fakeClient.setConsent).toHaveBeenCalledWith(false);
    expect(result.current.consent).toBe(false);
  });

  it('is a safe no-op when analytics was never initialised', async () => {
    clientHolder = null;
    const { result } = renderHook(() => useAnalyticsConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.consent).toBe(false);
    await act(async () => {
      await result.current.setConsent(true);
    });
    expect(result.current.consent).toBe(false);
  });
});
