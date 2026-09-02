/**
 * @vitest-environment jsdom
 *
 * What the DOM provider is responsible for: resolving the mode from the stored
 * preference and the system scheme, writing the resolved tokens onto the
 * document root, and mounting the global baseline (canvas inks, focus ring).
 */
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The in-memory store the shared provider persists the preference into. */
const store = new Map<string, string>();
let listeners: Array<(event: { matches: boolean }) => void> = [];
let systemPrefersDark = true;

vi.mock('../../../shared/src/storage', () => ({
  STORAGE_KEYS: { APPEARANCE: 'appearance' },
  getStorage: () => ({
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
  }),
}));

// The root barrel drags React Native into a jsdom suite; the provider only
// needs the tokens and the shared theme context, both plain TypeScript.
vi.mock('@salmon/shared', async () => ({
  ...(await import('../../../shared/src/theme')),
  ...(await import('../../../shared/src/contexts/ThemeContext')),
}));

const { createSemantic } = await import('../../../shared/src/theme');
const { useTheme } = await import('../../../shared/src/contexts/ThemeContext');
const { SalmonThemeProvider, useSemantic, useThemeMode } = await import('./ThemeProvider');

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return systemPrefersDark;
      },
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) => {
        listeners = listeners.filter((entry) => entry !== listener);
      },
    }))
  );
}

/** Flips the OS scheme the way a system appearance change does. */
const setSystemScheme = (scheme: 'dark' | 'light') =>
  act(() => {
    systemPrefersDark = scheme === 'dark';
    listeners.forEach((listener) => listener({ matches: systemPrefersDark }));
  });

function Probe() {
  const mode = useThemeMode();
  const tokens = useSemantic();
  const { setPreference } = useTheme();

  return (
    <button type="button" data-testid="probe" onClick={() => void setPreference('light')}>
      {mode}:{tokens.text.primary}
    </button>
  );
}

const probe = () => screen.getByTestId('probe').textContent;
const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);

beforeEach(() => {
  store.clear();
  listeners = [];
  systemPrefersDark = true;
  document.documentElement.removeAttribute('style');
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SalmonThemeProvider', () => {
  it('follows the system scheme while the preference is "system"', async () => {
    render(
      <SalmonThemeProvider>
        <Probe />
      </SalmonThemeProvider>
    );

    await waitFor(() => expect(probe()).toBe(`dark:${createSemantic('dark').text.primary}`));

    setSystemScheme('light');
    expect(probe()).toBe(`light:${createSemantic('light').text.primary}`);
  });

  it('reads a stored preference back and lets it win over the system scheme', async () => {
    store.set('appearance', 'light');

    render(
      <SalmonThemeProvider>
        <Probe />
      </SalmonThemeProvider>
    );

    await waitFor(() => expect(probe()).toBe(`light:${createSemantic('light').text.primary}`));

    // Still light with a dark system: an explicit choice is not a suggestion.
    setSystemScheme('dark');
    expect(probe()).toBe(`light:${createSemantic('light').text.primary}`);
  });

  it('persists a changed preference', async () => {
    render(
      <SalmonThemeProvider>
        <Probe />
      </SalmonThemeProvider>
    );
    await waitFor(() => expect(probe()).toContain('dark'));

    await act(async () => {
      screen.getByTestId('probe').click();
    });

    expect(store.get('appearance')).toBe('light');
    expect(probe()).toContain('light');
  });

  it('writes the tokens onto the root and rewrites them when the mode changes', async () => {
    render(
      <SalmonThemeProvider>
        <Probe />
      </SalmonThemeProvider>
    );

    await waitFor(() =>
      expect(rootVar('--sw-text-primary')).toBe(createSemantic('dark').text.primary)
    );
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(rootVar('--sw-water-gradient-0')).toBe(createSemantic('dark').water.gradient[0]);

    setSystemScheme('light');

    await waitFor(() =>
      expect(rootVar('--sw-text-primary')).toBe(createSemantic('light').text.primary)
    );
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
