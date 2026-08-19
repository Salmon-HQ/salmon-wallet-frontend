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
const { FLOAT_DELAY_MS, FLOAT_ENTER_SCALE, SINK_EXIT_SCALE, SINK_OUT_MS } = await import(
  '../../../../shared/src/motion/sinkFloat'
);
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

  it('carries the travel, the depth and the two clocks as styles, so overrides need no new stylesheet', () => {
    stubMatchMedia(false);
    render(
      <SinkFloat transitionKey="solana" distance={14} scale={0.8} floatMs={280} sinkMs={180}>
        <span>content</span>
      </SinkFloat>
    );

    const frame = screen.getByText('content').parentElement as HTMLElement;
    expect(frame.style.getPropertyValue('--salmon-sink-float-travel')).toBe('14px');
    expect(frame.style.getPropertyValue('--salmon-sink-float-scale')).toBe('0.8');
    expect(frame.style.getPropertyValue('--salmon-sink-float-in')).toBe('280ms');
    expect(frame.style.getPropertyValue('--salmon-sink-float-out')).toBe('180ms');
  });

  it('arrives from depth: the float rises from the shared enter scale', () => {
    stubMatchMedia(false);
    render(
      <SinkFloat transitionKey="solana">
        <span>content</span>
      </SinkFloat>
    );

    const frame = screen.getByText('content').parentElement as HTMLElement;
    expect(frame.style.getPropertyValue('--salmon-sink-float-scale')).toBe(
      String(FLOAT_ENTER_SCALE)
    );
  });

  it('recedes on the way out — the half that was missing, when the exit only slid and dimmed', () => {
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

    // Still the outgoing subtree, and it now goes away from the viewer rather
    // than off a shelf: the depth is on the frame and the sink keyframe spends
    // it on a scale, not on travel and light alone.
    const sinking = screen.getByText('solana').parentElement as HTMLElement;
    expect(sinking.style.getPropertyValue('--salmon-sink-float-scale')).toBe(
      String(SINK_EXIT_SCALE)
    );
    const css = document.head.innerHTML;
    const transformAnimation = css
      .split(`.${sinking.className.split(' ').pop()}{`)[1]
      ?.match(/animation:([\w-]+)/)?.[1];
    expect(transformAnimation).toBeDefined();
    const sinkKeyframes = css.split(`@keyframes ${transformAnimation}{`)[1]?.split('}}')[0];
    expect(sinkKeyframes).toContain('transform:none');
    expect(sinkKeyframes).toContain('scale(var(--salmon-sink-float-scale))');
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
