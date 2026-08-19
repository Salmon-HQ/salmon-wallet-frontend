/**
 * @vitest-environment jsdom
 *
 * The verb's contract on the DOM. The pixels live in CSS keyframes; what is
 * asserted here is the decision — that the outgoing content is held while it
 * sinks (the half the DOM does not give away), that the beat passes before the
 * swap, that one child is on screen at a time, and that reduce motion is a cut
 * that still swaps.
 */
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The root `@salmon/shared` barrel drags React Native into a jsdom suite; the
// component only reads the motion vocabulary, which is the real one so a token
// change shows up here.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/theme/durations')),
  ...(await vi.importActual('../../../../shared/src/motion/sinkFloat')),
}));

const { reducedMotion } = await import('../../../../shared/src/theme/durations');
const { FLOAT_DELAY_MS, SINK_OUT_MS } = await import('../../../../shared/src/motion/sinkFloat');
const { SinkFloat } = await import('./SinkFloat');

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: reducedMotion.query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

describe('SinkFloat', () => {
  it('holds the outgoing content while it sinks, then swaps after the beat', () => {
    stubMatchMedia(false);
    const { rerender } = render(
      <SinkFloat transitionKey="solana">
        <span>solana</span>
      </SinkFloat>
    );

    rerender(
      <SinkFloat transitionKey="bitcoin">
        <span>bitcoin</span>
      </SinkFloat>
    );

    // The DOM would have unmounted the outgoing node in this same frame; the
    // primitive keeps it, and only it — never both at once.
    expect(screen.getByText('solana')).toBeTruthy();
    expect(screen.queryByText('bitcoin')).toBeNull();

    // Still held once the sink itself has finished: the beat is what lets the
    // eye read the double gesture.
    act(() => {
      vi.advanceTimersByTime(SINK_OUT_MS);
    });
    expect(screen.getByText('solana')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(FLOAT_DELAY_MS - SINK_OUT_MS);
    });
    expect(screen.queryByText('solana')).toBeNull();
    expect(screen.getByText('bitcoin')).toBeTruthy();
  });

  it('spends the per-call clock when the caller overrides it', () => {
    stubMatchMedia(false);
    const { rerender } = render(
      <SinkFloat transitionKey="solana" holdMs={100}>
        <span>solana</span>
      </SinkFloat>
    );
    rerender(
      <SinkFloat transitionKey="bitcoin" holdMs={100}>
        <span>bitcoin</span>
      </SinkFloat>
    );

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(screen.getByText('solana')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText('bitcoin')).toBeTruthy();
  });

  it('carries the travel and the two clocks as styles, so overrides need no new stylesheet', () => {
    stubMatchMedia(false);
    render(
      <SinkFloat transitionKey="solana" distance={14} floatMs={280} sinkMs={180}>
        <span>content</span>
      </SinkFloat>
    );

    const frame = screen.getByText('content').parentElement as HTMLElement;
    expect(frame.style.getPropertyValue('--salmon-sink-float-travel')).toBe('14px');
    expect(frame.style.getPropertyValue('--salmon-sink-float-in')).toBe('280ms');
    expect(frame.style.getPropertyValue('--salmon-sink-float-out')).toBe('180ms');
    // The float is real CSS built from the vocabulary, both media at once.
    expect(document.head.innerHTML).toContain('scale(0.96)');
  });

  it('cuts instantly under reduce motion — and still swaps', () => {
    stubMatchMedia(true);
    const { rerender } = render(
      <SinkFloat transitionKey="solana">
        <span>solana</span>
      </SinkFloat>
    );
    const calmClass = (screen.getByText('solana').parentElement as HTMLElement).className;

    rerender(
      <SinkFloat transitionKey="bitcoin">
        <span>bitcoin</span>
      </SinkFloat>
    );

    // No hold, no travel: the new content is there in the same frame.
    expect(screen.getByText('bitcoin')).toBeTruthy();
    expect(screen.queryByText('solana')).toBeNull();
    expect((screen.getByText('bitcoin').parentElement as HTMLElement).className).toBe(calmClass);
  });

  it('does not hold anything on first mount — nothing sank, so it just floats', () => {
    stubMatchMedia(false);
    render(
      <SinkFloat transitionKey="solana">
        <span>solana</span>
      </SinkFloat>
    );
    expect(screen.getByText('solana')).toBeTruthy();
  });
});
