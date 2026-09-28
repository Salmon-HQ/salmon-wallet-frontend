/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOpenLink } from './useOpenLink';

const t = (key: string) => key;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useOpenLink', () => {
  it('opens the url and says nothing when it worked', async () => {
    const openUrl = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useOpenLink({ openUrl, t }));

    await act(async () => {
      void result.current.openLink('https://salmonwallet.io');
      await flush();
    });

    expect(openUrl).toHaveBeenCalledWith('https://salmonwallet.io');
    expect(result.current.errorText).toBeNull();
  });

  // A token's homepage and a network's attribution link both come from
  // salmon-api, and both land on a row labelled "Visit Website".
  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'intent://evil#Intent;scheme=http;end',
    'salmon://send?to=attacker',
    'not a url at all',
    '',
  ])('refuses %s instead of handing it to the platform', async (url) => {
    const openUrl = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useOpenLink({ openUrl, t }));

    await act(async () => {
      void result.current.openLink(url);
      await flush();
    });

    expect(openUrl).not.toHaveBeenCalled();
    expect(result.current.errorText).toBe('errors.linkOpenFailed');
  });

  it('says the link did not open, and clears it on the next attempt', async () => {
    const openUrl = vi.fn(() => Promise.reject(new Error('no browser')));
    const { result, rerender } = renderHook(
      ({ open }: { open: (url: string) => Promise<void> }) => useOpenLink({ openUrl: open, t }),
      { initialProps: { open: openUrl as unknown as (url: string) => Promise<void> } }
    );

    await act(async () => {
      void result.current.openLink('https://salmonwallet.io');
      await flush();
    });
    expect(result.current.errorText).toBe('errors.linkOpenFailed');

    rerender({ open: (() => Promise.resolve()) as (url: string) => Promise<void> });
    await act(async () => {
      void result.current.openLink('https://salmonwallet.io');
      await flush();
    });
    expect(result.current.errorText).toBeNull();
  });

  it('treats an empty url as a failure rather than a silent no-op', async () => {
    const openUrl = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useOpenLink({ openUrl, t }));

    await act(async () => {
      void result.current.openLink('');
      await flush();
    });

    expect(openUrl).not.toHaveBeenCalled();
    expect(result.current.errorText).toBe('errors.linkOpenFailed');
  });

  // The bug this hook exists to stop repeating: a bare `Linking.openURL`
  // loses its receiver and throws before the native module. The hook must
  // report that the same as any other failure, never swallow it.
  it('reports a thrower, not only a rejecter', async () => {
    const openUrl = vi.fn(() => {
      throw new TypeError("Cannot read properties of undefined (reading '_validateURL')");
    });
    const { result } = renderHook(() => useOpenLink({ openUrl, t }));

    await act(async () => {
      void result.current.openLink('https://salmonwallet.io');
      await flush();
    });

    expect(result.current.errorText).toBe('errors.linkOpenFailed');
  });
});
