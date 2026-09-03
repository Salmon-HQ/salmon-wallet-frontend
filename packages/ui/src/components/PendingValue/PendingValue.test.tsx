/**
 * @vitest-environment jsdom
 *
 * Refreshing a quote updates numbers inside a screen the user is already
 * reading. The container is not what is loading, so it is never replaced by a
 * placeholder — and a value that comes back identical must not animate, or the
 * screen reports a change that did not happen.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PendingValue } from './PendingValue';

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('PendingValue', () => {
  it('keeps the value on screen while it is being recalculated', () => {
    render(<PendingValue pending>1.23 USDC</PendingValue>);

    expect(screen.getByText('1.23 USDC')).toBeTruthy();
  });

  it('does not remount the value when the refresh returns the same number', () => {
    const { rerender } = render(<PendingValue pending>1.23 USDC</PendingValue>);
    const before = screen.getByText('1.23 USDC');

    rerender(<PendingValue pending={false}>1.23 USDC</PendingValue>);

    // Same DOM node: nothing is keyed on the value, so a number that came back
    // unchanged has no arrival animation to play.
    expect(screen.getByText('1.23 USDC')).toBe(before);
  });

  it('breathes while pending and rests at full opacity afterwards', () => {
    const { rerender } = render(<PendingValue pending>1.23 USDC</PendingValue>);
    const node = screen.getByText('1.23 USDC');

    // The breath is the whole signal; at rest the value carries none of it.
    expect(node.style.animation).toContain('sw-pending-value-breathe');
    expect(document.head.innerHTML).toContain('sw-pending-value-breathe');

    rerender(<PendingValue pending={false}>1.23 USDC</PendingValue>);
    expect(node.style.animation).toBe('');
    expect(node.style.opacity).toBe('1');
  });

  it('sits at the dimmed end of the breath under reduce motion', () => {
    stubMatchMedia(true);
    render(<PendingValue pending>1.23 USDC</PendingValue>);
    const node = screen.getByText('1.23 USDC');

    expect(node.style.animation).toBe('');
    expect(Number(node.style.opacity)).toBeLessThan(1);
  });
});
