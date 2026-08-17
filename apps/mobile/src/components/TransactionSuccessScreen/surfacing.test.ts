/**
 * The Surfacing's timing, tested against the real tokens.
 *
 * The tokens are deliberately *not* stubbed: the whole point of the assertions
 * is that the durations come out of `@salmon/shared`'s vocabulary rather than
 * out of a literal in the component, and a mocked `motionMs` would assert
 * nothing. The barrel is redirected at the theme module only because importing
 * it whole drags the Solana client into a test about milliseconds.
 */
jest.mock('@salmon/shared', () => require('@salmon/shared/src/theme'));

import { motionMs, semantic } from '@salmon/shared';

import {
  AMOUNT_LAG_MS,
  AMOUNT_RISE,
  BAND_TRAVEL_MS,
  MEMBRANE_ALPHA_FROM,
  MEMBRANE_ALPHA_TO,
  MEMBRANE_OPACITY_TO,
  STATIC_HIGHLIGHT_HOLD_MS,
  amountLandsAtMs,
  surfacingTimeline,
} from './surfacing';

describe('surfacingTimeline — full motion', () => {
  const timeline = surfacingTimeline(false);

  it('runs the membrane over `tide`, the one duration reserved for this moment', () => {
    expect(timeline.membrane.durationMs).toBe(motionMs.tide);
    expect(motionMs.tide).toBe(720);
  });

  it('lands the amount exactly one lag after the band arrives', () => {
    expect(amountLandsAtMs(timeline)).toBe(BAND_TRAVEL_MS + AMOUNT_LAG_MS);
  });

  it('settles the amount over `drift` rather than a hand-tuned number', () => {
    expect(timeline.amount.durationMs).toBe(motionMs.drift);
    expect(timeline.amount.delayMs).toBe(BAND_TRAVEL_MS + AMOUNT_LAG_MS - motionMs.drift);
  });

  it('translates the amount, and only by the specified rise', () => {
    expect(timeline.amount.rise).toBe(AMOUNT_RISE);
    expect(AMOUNT_RISE).toBe(6);
  });

  it('travels the band and dissipates it inside what `tide` has left', () => {
    expect(timeline.band.mode).toBe('travel');
    expect(timeline.band.durationMs).toBe(BAND_TRAVEL_MS);
    expect(timeline.band.fadeMs).toBe(motionMs.tide - BAND_TRAVEL_MS);
  });

  it('holds the rest of the screen until the Surfacing is over', () => {
    expect(timeline.chrome.delayMs).toBe(motionMs.tide);
    expect(timeline.chrome.durationMs).toBe(motionMs.drift);
    expect(timeline.chrome.staggerMs).toBe(motionMs.stagger);
  });

  it('finishes the whole moment inside `tide`', () => {
    expect(amountLandsAtMs(timeline)).toBeLessThanOrEqual(motionMs.tide);
    expect(timeline.band.durationMs + timeline.band.fadeMs).toBeLessThanOrEqual(motionMs.tide);
  });
});

describe('surfacingTimeline — reduced motion', () => {
  const timeline = surfacingTimeline(true);

  it('clears the membrane in one 180ms step instead of deleting it', () => {
    expect(timeline.membrane.durationMs).toBe(motionMs.swell);
    expect(motionMs.swell).toBe(180);
  });

  it('renders the caustic light once, static, and fades it', () => {
    expect(timeline.band.mode).toBe('static');
    expect(timeline.band.durationMs).toBe(STATIC_HIGHLIGHT_HOLD_MS);
    expect(timeline.band.fadeMs).toBe(motionMs.ebb);
  });

  it('does not translate the amount', () => {
    expect(timeline.amount.rise).toBe(0);
    expect(timeline.amount.delayMs).toBe(0);
  });

  it('drops the stagger entirely rather than shortening it', () => {
    expect(timeline.chrome.staggerMs).toBe(0);
  });

  it('keeps every part of the moment — nothing is left as a hole', () => {
    expect(timeline.membrane.durationMs).toBeGreaterThan(0);
    expect(timeline.band.durationMs).toBeGreaterThan(0);
    expect(timeline.chrome.durationMs).toBeGreaterThan(0);
  });
});

describe('the membrane alphas', () => {
  it('matches the alpha `surface.membraneThick` actually carries', () => {
    // MEMBRANE_OPACITY_TO is only correct while the token's own alpha is the
    // value this module starts from. If the token is retuned, the view opacity
    // stops meaning α 0.55 and nothing else would notice.
    const alpha = Number(/,\s*([\d.]+)\s*\)$/.exec(semantic.surface.membraneThick)?.[1]);
    expect(alpha).toBe(MEMBRANE_ALPHA_FROM);
  });

  it('clears to the specified alpha', () => {
    expect(MEMBRANE_OPACITY_TO * MEMBRANE_ALPHA_FROM).toBeCloseTo(MEMBRANE_ALPHA_TO, 5);
  });
});
