/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { SCREEN_POP_MS, SCREEN_PUSH_MS } from '@salmon/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlideStack } from './SlideStack';

function stubMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

const stack = (key: string, depth: number) => (
  <SlideStack screenKey={key} depth={depth} testID="stack">
    <div data-testid={`screen-${key}`}>{key}</div>
  </SlideStack>
);

describe('SlideStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('a push slides the new screen in over the old one, then drops the old one', () => {
    stubMatchMedia(false);
    const { rerender } = render(stack('home', 0));
    rerender(stack('wallets', 1));

    const current = screen.getByTestId('slide-stack-current');
    const held = screen.getByTestId('slide-stack-held');
    expect(current.style.animation).toContain('sw-screen-slide-in');
    expect(current.style.animation).toContain(`${SCREEN_PUSH_MS}ms`);
    expect(held.style.animation).toBe('');
    expect(Number(current.style.zIndex)).toBeGreaterThan(Number(held.style.zIndex));
    expect(screen.getByTestId('screen-home')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(SCREEN_PUSH_MS);
    });
    expect(screen.queryByTestId('slide-stack-held')).toBeNull();
    expect(screen.getByTestId('screen-wallets')).toBeTruthy();
  });

  it('a pop slides the old screen out over the new one, to the right', () => {
    stubMatchMedia(false);
    const { rerender } = render(stack('wallets', 1));
    rerender(stack('home', 0));

    const current = screen.getByTestId('slide-stack-current');
    const held = screen.getByTestId('slide-stack-held');
    expect(held.style.animation).toContain('sw-screen-slide-out');
    expect(held.style.animation).toContain(`${SCREEN_POP_MS}ms`);
    expect(current.style.animation).toBe('');
    expect(Number(held.style.zIndex)).toBeGreaterThan(Number(current.style.zIndex));

    act(() => {
      vi.advanceTimersByTime(SCREEN_POP_MS);
    });
    expect(screen.queryByTestId('slide-stack-held')).toBeNull();
  });

  it('is a cut under reduce motion', () => {
    stubMatchMedia(true);
    const { rerender } = render(stack('home', 0));
    rerender(stack('wallets', 1));

    expect(screen.queryByTestId('slide-stack-held')).toBeNull();
    expect(screen.getByTestId('slide-stack-current').style.animation).toBe('');
    expect(screen.getByTestId('screen-wallets')).toBeTruthy();
  });
});
