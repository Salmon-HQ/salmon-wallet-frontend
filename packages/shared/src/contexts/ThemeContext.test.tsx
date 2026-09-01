/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React from 'react';

import { ThemeProvider, useTheme, type SystemScheme } from './ThemeContext';
import {
  getStorage,
  initStorage,
  resetStorage,
  createLocalStorageAdapter,
  isStorageInitialized,
  STORAGE_KEYS,
} from '../storage';
import { neutral } from '../theme/palette';

/** Mounts the provider under a system scheme the caller can change. */
function setup(initialScheme: SystemScheme = null) {
  let scheme = initialScheme;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider systemScheme={scheme}>{children}</ThemeProvider>
  );
  Wrapper.displayName = 'ThemeTestWrapper';
  const view = renderHook(() => useTheme(), { wrapper: Wrapper });

  return {
    ...view,
    setScheme: (next: SystemScheme) => {
      scheme = next;
      view.rerender();
    },
  };
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    if (!isStorageInitialized()) {
      initStorage({ platform: 'web', adapter: createLocalStorageAdapter() });
    }
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    resetStorage();
  });

  it('defaults to the system preference and falls back to deep water', async () => {
    const { result } = setup(null);

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.preference).toBe('system');
    expect(result.current.mode).toBe('dark');
    expect(result.current.semantic.surface.shelf).toBe(neutral[950]);
    expect(result.current.shadows.card.shadowColor).toBe('#000000');
  });

  it('loads a persisted light preference', async () => {
    await getStorage().setItem(STORAGE_KEYS.APPEARANCE, 'light');

    const { result } = setup(null);

    await waitFor(() => expect(result.current.preference).toBe('light'));
    expect(result.current.mode).toBe('light');
    expect(result.current.semantic.surface.shelf).toBe(neutral[0]);
    expect(result.current.shadows.card.shadowColor).toBe(neutral[900]);
  });

  it('ignores a stored value that is not a preference', async () => {
    await getStorage().setItem(STORAGE_KEYS.APPEARANCE, 'sepia');

    const { result } = setup(null);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.preference).toBe('system');
    expect(result.current.mode).toBe('dark');
  });

  it('persists a new preference and flips the mode with it', async () => {
    const { result } = setup(null);
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setPreference('light');
    });

    expect(result.current.preference).toBe('light');
    expect(result.current.mode).toBe('light');
    expect(await getStorage().getItem(STORAGE_KEYS.APPEARANCE)).toBe('light');
  });

  it('follows the system scheme while the preference is system', async () => {
    const { result, setScheme } = setup('light');
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.mode).toBe('light');

    act(() => setScheme('dark'));
    expect(result.current.mode).toBe('dark');
  });

  it('stops following the system scheme once the user picks a mode', async () => {
    const { result, setScheme } = setup('light');
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setPreference('dark');
    });

    act(() => setScheme('light'));
    expect(result.current.mode).toBe('dark');
  });

  it('hands out the same token objects while the mode holds', async () => {
    // The mobile style cache is keyed on the mode, but a new `semantic`
    // identity on every render would still defeat any memo downstream.
    const { result, rerender } = setup('dark');
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.semantic;
    rerender();
    expect(result.current.semantic).toBe(before);
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
  });
});
