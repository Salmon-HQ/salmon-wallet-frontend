/**
 * @vitest-environment jsdom
 *
 * The fade-through contract on the DOM: a changed key remounts the content so
 * the entrance replays, and reduce motion drops the animation entirely — the
 * swap stays the instant cut it always was. The pixels of the keyframes live
 * in CSS; what is asserted is the decision.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The root `@salmon/shared` barrel drags React Native into a jsdom suite; the
// component only reads the motion vocabulary, which is the real one so a
// token change shows up here.
vi.mock('@salmon/shared', async () => ({
  ...(await import('../../../../shared/src/theme/durations')),
}));

const { reducedMotion } = await import('../../../../shared/src/theme/durations');
const { FadeThrough } = await import('./FadeThrough');

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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FadeThrough', () => {
  it('plays the entrance with full motion', () => {
    stubMatchMedia(false);

    render(
      <FadeThrough transitionKey="solana">
        <span>content</span>
      </FadeThrough>
    );

    const frame = screen.getByText('content').parentElement as HTMLElement;
    expect(frame.className).not.toBe('');
    // The animation is real CSS in the head, built from the vocabulary.
    expect(document.head.innerHTML).toContain('animation');
    expect(document.head.innerHTML).toContain('scale(0.97)');
  });

  it('chooses the instant cut under reduce motion', () => {
    stubMatchMedia(false);
    const { unmount } = render(
      <FadeThrough transitionKey="solana">
        <span>content</span>
      </FadeThrough>
    );
    const animatedClass = (screen.getByText('content').parentElement as HTMLElement).className;
    unmount();

    stubMatchMedia(true);
    render(
      <FadeThrough transitionKey="solana">
        <span>calm</span>
      </FadeThrough>
    );

    // A different styled variant: the calm frame carries no entrance.
    const calmClass = (screen.getByText('calm').parentElement as HTMLElement).className;
    expect(calmClass).not.toBe(animatedClass);
  });

  it('remounts the content when the key changes, so the entrance replays', () => {
    stubMatchMedia(false);
    const { rerender } = render(
      <FadeThrough transitionKey="solana">
        <span>content</span>
      </FadeThrough>
    );
    const before = screen.getByText('content').parentElement;

    rerender(
      <FadeThrough transitionKey="bitcoin">
        <span>content</span>
      </FadeThrough>
    );

    // New DOM node — a fresh mount is what makes CSS play the animation again.
    expect(screen.getByText('content').parentElement).not.toBe(before);
  });
});
