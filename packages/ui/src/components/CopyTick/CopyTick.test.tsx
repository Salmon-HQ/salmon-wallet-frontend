/**
 * @vitest-environment jsdom
 *
 * The crossfade contract: both icons stay mounted whichever way the state is
 * heading — that is what makes the return trip (tick → copy) animatable at
 * all — and visibility flips as opacity, with the hidden layer removed from
 * the accessibility tree. Reduce motion is a pure-CSS media block
 * (`reducedMotion.query` collapses the transition); what is asserted here is
 * the structure that block acts on.
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

const { CopyTick } = await import('./CopyTick');

afterEach(cleanup);

function renderTick(copied: boolean) {
  render(
    <CopyTick
      copied={copied}
      copy={<span data-testid="copy-icon" />}
      tick={<span data-testid="tick-icon" />}
    />
  );
}

describe('CopyTick', () => {
  it('keeps both icons mounted so the crossfade can run in either direction', () => {
    renderTick(false);
    expect(screen.getByTestId('copy-icon')).toBeTruthy();
    expect(screen.getByTestId('tick-icon')).toBeTruthy();
  });

  it('shows the copy affordance and hides the tick while idle', () => {
    renderTick(false);
    const copyLayer = screen.getByTestId('copy-icon').parentElement!;
    const tickLayer = screen.getByTestId('tick-icon').parentElement!;
    expect(getComputedStyle(copyLayer).opacity).toBe('1');
    expect(getComputedStyle(tickLayer).opacity).toBe('0');
    expect(copyLayer.getAttribute('aria-hidden')).toBe('false');
    expect(tickLayer.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the tick and hides the copy affordance while copied', () => {
    renderTick(true);
    const copyLayer = screen.getByTestId('copy-icon').parentElement!;
    const tickLayer = screen.getByTestId('tick-icon').parentElement!;
    expect(getComputedStyle(copyLayer).opacity).toBe('0');
    expect(getComputedStyle(tickLayer).opacity).toBe('1');
    expect(copyLayer.getAttribute('aria-hidden')).toBe('true');
    expect(tickLayer.getAttribute('aria-hidden')).toBe('false');
  });

  it('travels on the vocabulary: opacity over swell, nothing bounces', () => {
    renderTick(false);
    const copyLayer = screen.getByTestId('copy-icon').parentElement!;
    const transition = getComputedStyle(copyLayer).transition;
    expect(transition).toContain('opacity');
    expect(transition).toContain('180ms');
    expect(transition).not.toContain('bounce');
  });
});
