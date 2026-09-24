/**
 * @vitest-environment jsdom
 * What useInactivityTimeout counts as activity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInactivityTimeout } from './useInactivityTimeout';
import { updateLastActivity } from '../storage/stash';

vi.mock('../storage/stash', () => ({
  updateLastActivity: vi.fn(async () => undefined),
  getLastActivity: vi.fn(async () => Date.now()),
  isSessionTimedOut: vi.fn(async () => false),
}));

vi.mock('../utils/platform', () => ({
  isWebEnvironment: () => true,
}));

describe('useInactivityTimeout activity', () => {
  beforeEach(() => {
    vi.mocked(updateLastActivity).mockClear();
  });

  // A web page can move focus between the wallet's approval windows (the
  // background creates and focuses them on its requests), so counting window
  // focus as activity let a page keep an unattended wallet from locking.
  it('does not count window focus or blur as activity', async () => {
    renderHook(() => useInactivityTimeout({ enabled: true }));
    await waitFor(() => expect(vi.mocked(updateLastActivity)).not.toHaveBeenCalled());

    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('blur'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateLastActivity).not.toHaveBeenCalled();
  });

  it('counts a key press as activity', async () => {
    renderHook(() => useInactivityTimeout({ enabled: true }));

    document.dispatchEvent(new Event('keydown'));

    await waitFor(() => expect(updateLastActivity).toHaveBeenCalledTimes(1));
  });
});
