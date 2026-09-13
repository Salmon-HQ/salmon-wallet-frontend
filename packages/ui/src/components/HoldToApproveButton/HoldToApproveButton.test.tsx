/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// The real barrel: the progress ink now comes off `useSemantic()`, which falls
// back to the shared dark set when no provider is mounted.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
}));

vi.mock('../Button', () => ({
  PrimaryButton: ({
    onPress,
    disabled,
    children,
  }: {
    onPress?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button type="button" onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { HoldToApproveButton } from './HoldToApproveButton';

/** Drives the component's requestAnimationFrame loop by `ms` of wall clock. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('HoldToApproveButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom drives rAF off timers under fake timers, but `performance.now` is
    // what the hold measures, so both have to move together.
    vi.stubGlobal('performance', { now: () => Date.now() });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not approve on a plain pointer click', () => {
    const onApprove = vi.fn();
    render(<HoldToApproveButton onApprove={onApprove}>Hold to approve</HoldToApproveButton>);

    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button, { detail: 1 });

    expect(onApprove).not.toHaveBeenCalled();
  });

  it('approves once the pointer has been held long enough', () => {
    const onApprove = vi.fn();
    render(<HoldToApproveButton onApprove={onApprove}>Hold to approve</HoldToApproveButton>);

    fireEvent.pointerDown(screen.getByRole('button'));
    advance(200);
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.getByTestId('hold-progress')).toBeInTheDocument();

    advance(400);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('abandons the hold when the pointer leaves before it completes', () => {
    const onApprove = vi.fn();
    render(<HoldToApproveButton onApprove={onApprove}>Hold to approve</HoldToApproveButton>);

    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    advance(300);
    fireEvent.pointerLeave(button);
    advance(600);

    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.queryByTestId('hold-progress')).not.toBeInTheDocument();
  });

  it('commits immediately from the keyboard, which must never be gated behind a held key', () => {
    const onApprove = vi.fn();
    render(<HoldToApproveButton onApprove={onApprove}>Hold to approve</HoldToApproveButton>);

    // A keyboard activation arrives as a click with `detail === 0`.
    fireEvent.click(screen.getByRole('button'), { detail: 0 });

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('cannot be held while disabled', () => {
    const onApprove = vi.fn();
    render(
      <HoldToApproveButton onApprove={onApprove} disabled>
        Hold to approve
      </HoldToApproveButton>
    );

    fireEvent.pointerDown(screen.getByRole('button'));
    advance(800);

    expect(onApprove).not.toHaveBeenCalled();
  });
});
