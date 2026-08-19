/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@salmon/shared', () => ({
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  // The real gate is `useWaitGate` and it is tested where it lives
  // (packages/shared). Here it is transparent, so these cases stay about what
  // the screen renders in each state rather than about timing.
  useWaitGate: (active: boolean) => active,
  // Likewise the hold that keeps the wait mounted until its closing wave has
  // left. Transparent here: `useWaitExit` is tested in packages/shared, and
  // these cases are about what the screen renders in each state.
  useWaitExit: (showWait: boolean) => ({ held: showWait, onExited: () => {} }),
  semantic: {
    status: { success: '#0f0' },
    surface: {
      shelf: '#10131C',
      raised: '#161C2D',
      crest: '#1B2233',
      bedrock: '#0B0F19',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      deepFieldHeight: 180,
      deepFieldFloor: 0.35,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
      refractionScale: 0.5,
    },
    flesh: { band: '#FFF1EE' },
    water: { light: '#9FE0EF' },
  },
  // The Surfacing reads the motion vocabulary, the caustic band draws the
  // scales tile, and the shared PrimaryButton now carries the press specular.
  seigaihaTile: { width: 120, height: 60 },
  seigaihaTiledPaths: ['M0 0h1v1H0z'],
  motionMs: {
    flick: 90,
    swell: 180,
    ebb: 180,
    drift: 280,
    rise: 420,
    tide: 720,
    stagger: 24,
  },
  motionDuration: { flick: '90ms' },
  motionEasing: {
    current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    settle: { css: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    sink: { css: 'cubic-bezier(0.4, 0, 1, 1)' },
  },
  reducedMotion: { query: '(prefers-reduced-motion: reduce)' },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  fleshVariantTiles: { marbled: { width: 150, height: 88 }, chevron: { width: 144, height: 84 } },
  fleshVariantFills: { marbled: [], chevron: [] },
  palette: {
    salmon: { 500: '#FF5C45', 600: '#E64A34' },
    neutral: { 0: '#FFFFFF', 1000: '#070911' },
  },
  colors: {
    button: { primaryBackground: '#FF5C45', primaryText: '#070911', disabledOpacity: 0.5 },
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
    accent: { primary: '#0f0', border: '#0c0' },
    background: { tertiary: '#111' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48 },
  borderRadius: { lg: 16, full: '50%', card: 12 },
  borderWidth: { accent: 1 },
  fontFamily: { sans: 'Inter, sans-serif' },
  fontSize: { sm: 12, base: 14, body: 14, bodyLg: 16, title: 20, headline: 24, '4xl': 36 },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
  letterSpacing: { snug: -0.12, widest: 1 },
  lineHeight: { none: 1, tight: 1.25 },
  // The continue action is the shared PrimaryButton now, so this mock has to
  // cover the tokens that button reads too.
  componentSizes: {
    logoSizeSmall: 80,
    buttonHeightCompact: 48,
    buttonMinWidthLg: 200,
    buttonMinWidth: 120,
    buttonHeight: 56,
    buttonRadius: 12,
    buttonFleshScale: 1,
  },
  shadowsCSS: { bezel: 'none' },
  gradients: { primaryCSS: 'linear-gradient(#0f0, #0c0)' },
  duration: {
    slow: '300ms',
    slower: '500ms',
    stagger1: '100ms',
    stagger2: '200ms',
    stagger3: '300ms',
  },
  easing: { easeOut: 'ease-out', bounce: 'ease-out' },
}));

vi.mock('../LoadingScreen', () => ({
  LoadingScreen: ({ title }: { title?: string }) => <div data-testid="loading-screen">{title}</div>,
}));

import { TransactionSuccessScreen } from './TransactionSuccessScreen';

const baseProps = {
  title: 'Swap Complete',
  summary: '1 SOL → 200 USDC',
  explorerUrl: 'https://solscan.io/tx/abc',
  onContinue: vi.fn(),
};

describe('TransactionSuccessScreen', () => {
  afterEach(cleanup);

  describe('while settling', () => {
    it('shows the loader with the pending title instead of the success content', () => {
      render(<TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />);

      expect(screen.getByTestId('loading-screen').textContent).toBe('Processing swap');
      expect(screen.queryByText('Swap Complete')).toBeNull();
    });

    it('falls back to the success title when no pending title is given', () => {
      render(<TransactionSuccessScreen {...baseProps} settling />);

      expect(screen.getByTestId('loading-screen').textContent).toBe('Swap Complete');
    });

    it('hides the controls that would navigate away from an unsettled balance', () => {
      render(<TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />);

      expect(screen.queryByTestId('tx-success-continue-button')).toBeNull();
      expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
    });
  });

  describe('once settled', () => {
    it('shows the success content and the e2e selectors', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByText('Swap Complete')).toBeTruthy();
      expect(screen.getByText('1 SOL → 200 USDC')).toBeTruthy();
      expect(screen.getByTestId('tx-success-continue-button').hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('tx-success-explorer-link')).toBeTruthy();
      expect(screen.queryByTestId('loading-screen')).toBeNull();
    });

    it('keeps the amount on one line — a receipt prints an amount, not a sentence', () => {
      render(<TransactionSuccessScreen {...baseProps} summary="0.0512345 SOL → 8.1234567 USDC" />);

      const amount = screen.getByTestId('tx-success-amount');
      const { whiteSpace, maxWidth } = getComputedStyle(amount);
      expect(whiteSpace).toBe('nowrap');
      expect(maxWidth).toBe('100%');
    });

    it('gives the amount the one thing CSS cannot know: how long the string is', () => {
      const summary = '0.0512345 SOL → 8.1234567 USDC';
      render(<TransactionSuccessScreen {...baseProps} summary={summary} />);

      const amount = screen.getByTestId('tx-success-amount');
      // Without the character count the size budget falls back to a guess, and
      // a guess is what was clipping the number in a 360px column.
      expect(amount.style.getPropertyValue('--tx-amount-chars')).toBe(String(summary.length));
    });

    it('puts the continue action before the explorer link — the wallet outranks the block explorer', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const button = screen.getByTestId('tx-success-continue-button');
      const link = screen.getByTestId('tx-success-explorer-link');

      expect(button.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('keeps the bridge deposit instructions', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          title="Bridge Initiated"
          bridgeDepositAddress="bc1qdeposit"
          bridgeAmountIn="33 USDC"
        />
      );

      expect(screen.getByText('bc1qdeposit')).toBeTruthy();
      expect(screen.getByText('33 USDC')).toBeTruthy();
    });
  });

  /**
   * The Surfacing (DESIGN.md §The Surfacing). What is worth asserting here is
   * not that pixels move — the timing is `surfacingTimeline`'s and is tested
   * in `surfacing.test.ts` — but that the phases are mounted on the receipt
   * and that the reduce-motion signal chooses the calm variant. Same shape as
   * `LoadingScreen.ground.test.tsx`.
   */
  describe('The Surfacing', () => {
    const setReducedMotion = (matches: boolean) => {
      window.matchMedia = ((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    };

    afterEach(() => {
      delete (window as { matchMedia?: unknown }).matchMedia;
    });

    it('mounts the membrane that clears and the caustic band that travels', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByTestId('tx-surfacing-membrane')).toBeTruthy();
      const band = screen.getByTestId('tx-surfacing-band');
      expect(band.getAttribute('data-surfacing-mode')).toBe('travel');
    });

    it('does not play the moment behind the wait', () => {
      render(<TransactionSuccessScreen {...baseProps} settling />);

      expect(screen.queryByTestId('tx-surfacing-membrane')).toBeNull();
      expect(screen.queryByTestId('tx-surfacing-band')).toBeNull();
    });

    it('chooses the calm variant under reduced motion — static light, no travel', () => {
      setReducedMotion(true);
      render(<TransactionSuccessScreen {...baseProps} />);

      // The moment stays recognizable; it just does not travel. The membrane
      // still clears and the caustic light is drawn once, static.
      expect(screen.getByTestId('tx-surfacing-membrane')).toBeTruthy();
      expect(screen.getByTestId('tx-surfacing-band').getAttribute('data-surfacing-mode')).toBe(
        'static'
      );
    });
  });
});
