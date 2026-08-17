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

vi.mock('@salmon/shared', () => ({
  motionDuration: { swell: '180ms' },
  motionEasing: {
    current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    settle: { css: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  },
  motionMs: { pulseCycle: 1200 },
  opacity: { disabled: 0.5, full: 1 },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
}));

const { PendingValue } = await import('./PendingValue');

afterEach(cleanup);

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

  it('styles the value differently while pending than at rest', () => {
    const { rerender } = render(<PendingValue pending>1.23 USDC</PendingValue>);
    const node = screen.getByText('1.23 USDC');
    const breathing = node.className;

    rerender(<PendingValue pending={false}>1.23 USDC</PendingValue>);

    // The breath is the whole signal; at rest the value carries none of it.
    expect(node.className).not.toBe(breathing);
    expect(document.head.innerHTML).toContain('animation');
  });
});
