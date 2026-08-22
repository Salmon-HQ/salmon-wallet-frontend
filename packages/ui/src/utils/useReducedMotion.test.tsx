/**
 * @vitest-environment jsdom
 *
 * The DOM expression of the reduce-motion signal. Three behaviours matter:
 * the hook reads the OS setting on mount, it follows the setting when it
 * changes mid-session (the user does not have to reload the wallet to calm
 * it), and it unsubscribes on unmount. jsdom has no `matchMedia`, so the
 * media query list is stubbed — which is also what lets the test flip it.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The shared barrel drags react-native into a jsdom suite; the hook only
// needs the query string, so the mock carries the same literal the token owns.
vi.mock('@salmon/shared', () => ({
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
}));

const reducedMotion = { query: '(prefers-reduced-motion: reduce)' };

const { useReducedMotion } = await import('./useReducedMotion');

type Listener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  const query = {
    matches: initialMatches,
    media: reducedMotion.query,
    addEventListener: (_: 'change', listener: Listener) => listeners.add(listener),
    removeEventListener: (_: 'change', listener: Listener) => listeners.delete(listener),
  };
  const matchMedia = vi.fn((requested: string) => {
    expect(requested).toBe(reducedMotion.query);
    return query;
  });
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    listeners,
    setMatches(matches: boolean) {
      query.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('reads the OS setting on mount', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('is false when the OS asks for full motion', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it('follows the setting when it changes mid-session', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(media.listeners.size).toBe(0);
  });

  it('defaults to full motion when matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
