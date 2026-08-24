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

vi.mock('@salmon/shared', async () => ({
  // The ending's bands and the verb's constants are the real ones: this screen
  // reads the onboarding grid rather than restating it, so a test that mocked
  // the table would be asserting its own numbers.
  ...(await vi.importActual('../../../../shared/src/theme/onboardingGrid')),
  ...(await vi.importActual('../../../../shared/src/motion/sinkFloat')),
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
  // The scales tile and the motion vocabulary are read by the ground the
  // receipt sits on; the shared PrimaryButton carries the press specular.
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
  fleshFills: [],
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
  letterSpacing: { snug: -0.12, wide: 0.5, widest: 1 },
  // The assist band's control is the shared TextButton.
  opacity: { low: 0.6 },
  lineHeight: { none: 1, tight: 1.25 },
  // The continue action is the shared PrimaryButton now, so this mock has to
  // cover the tokens that button reads too.
  componentSizes: {
    logoSizeSmall: 80,
    // The assist band reserves exactly the assist control's own height.
    buttonHeightSmall: 44,
    buttonHeightCompact: 48,
    buttonMinWidthLg: 200,
    buttonMinWidth: 120,
    buttonHeight: 56,
    buttonRadius: 12,
    buttonFleshScale: 1,
    // The token marks are the graphic's subject, drawn at the ramp's top step.
    iconSize3XL: 48,
  },
  shadowsCSS: { bezel: 'none' },
  gradients: { primaryCSS: 'linear-gradient(#0f0, #0c0)' },
  duration: {
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    stagger1: '100ms',
    stagger2: '200ms',
    stagger3: '300ms',
  },
  easing: { ease: 'ease', easeOut: 'ease-out', bounce: 'ease-out' },
}));

vi.mock('../LoadingScreen', () => ({
  LoadingScreen: ({ title }: { title?: string }) => <div data-testid="loading-screen">{title}</div>,
}));

import {
  resolveOnboardingBands,
  resolveOnboardingGrid,
  SINK_FLOAT_STAGGER_MS,
} from '@salmon/shared';
import { TransactionSuccessScreen } from './TransactionSuccessScreen';

/** The bands the receipt reads: the onboarding ending's, with no secondary. */
const endingBands = resolveOnboardingBands(resolveOnboardingGrid('identity'), false);

const exchange = {
  send: { label: 'Sent', symbol: 'USDC', amount: '1.1 USDC', logo: 'https://x/usdc.png' },
  receive: { label: 'Received', symbol: 'SOL', amount: '0.014 SOL' },
};

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

    it('puts the assist band over the primary, the way the onboarding ending composes', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const link = screen.getByTestId('tx-success-explorer-link');
      const button = screen.getByTestId('tx-success-continue-button');

      // The primary is the bottom-most control; the quiet link sits above it.
      // The wallet still outranks the block explorer, and what says so is the
      // wave order below, not the position.
      expect(link.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('holds the assist band open when the chain has no explorer link', () => {
      const { rerender } = render(<TransactionSuccessScreen {...baseProps} />);
      const withLink = getComputedStyle(screen.getByTestId('tx-success-assist')).height;

      rerender(<TransactionSuccessScreen {...baseProps} explorerUrl={null} />);
      const withoutLink = getComputedStyle(screen.getByTestId('tx-success-assist')).height;

      // A Bitcoin receipt and a Solana receipt put their primary at the same
      // Y: the button under the thumb never moves because of what the chain
      // happened to support.
      expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
      expect(withoutLink).toBe(withLink);
      expect(withoutLink).toBe(`${endingBands.assist}px`);
    });

    it('takes both bottom bands from the grid instead of restating them', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      // The receipt does not approximate the onboarding ending — it reads the
      // same table, so the primary lands on the bottom edge the grid defines
      // and nothing under it is reserved twice.
      expect(getComputedStyle(screen.getByTestId('tx-success-assist')).height).toBe(
        `${endingBands.assist}px`
      );
      expect(getComputedStyle(screen.getByTestId('tx-success-action')).height).toBe(
        `${endingBands.action}px`
      );
      // The column's own bottom padding was a second reservation under the
      // primary; the action band owns that edge now.
      expect(getComputedStyle(screen.getByTestId('tx-success-screen')).paddingBottom).toBe('0px');
    });

    it('replaces the status sentence with the graphic on an exchange', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      // The graphic says what happened: the mark of what left, the arrow down
      // to what arrived, and the tick on it. No sentence is printed.
      expect(screen.queryByTestId('tx-success-status')).toBeNull();
      expect(screen.queryByText('Swap Complete')).toBeNull();
      const hero = screen.getByTestId('tx-success-hero');
      // A group, not an image: the amounts inside it have to stay readable,
      // and the result the sentence used to carry is the group's label.
      expect(hero.getAttribute('role')).toBe('group');
      expect(hero.getAttribute('aria-label')).toBe('Swap Complete');
      // The arrow is decoration — it is neither announced nor focusable.
      const arrow = screen.getByTestId('tx-success-arrow');
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
      expect(arrow.getAttribute('tabindex')).toBeNull();
      // And the tick belongs to the token that arrived, not to the block.
      const received = screen.getByTestId('tx-success-received');
      expect(received.contains(screen.getByTestId('tx-success-tick'))).toBe(true);
      expect(screen.getByTestId('tx-success-sent').querySelector('svg')).toBeNull();
    });

    it('keeps the status sentence on a receipt with a single token', () => {
      // A send has one token, not two: an arrow between two marks would be
      // meaningless, so the sentence stays and is the only thing that says
      // what happened.
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByTestId('tx-success-status')).toBeTruthy();
      expect(screen.queryByTestId('tx-success-hero')).toBeNull();
    });

    it('reads the exchange down the screen, each amount with its own token', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          exchange={exchange}
          exchangeRate="1 USDC ≈ 0.0127 SOL"
          exchangeFee="0.85%"
        />
      );

      const sent = screen.getByTestId('tx-success-sent');
      const arrow = screen.getByTestId('tx-success-arrow');
      const received = screen.getByTestId('tx-success-received');
      const rows = screen.getByTestId('tx-success-receipt');

      // What left, the arrow down from it, what arrived, the fine print — and
      // the reading order is the visual order, because it is the DOM order.
      const follows = (a: Element, b: Element) =>
        !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(follows(sent, arrow)).toBe(true);
      expect(follows(arrow, received)).toBe(true);
      expect(follows(received, rows)).toBe(true);
      // The amounts stay with their tokens.
      expect(sent.textContent).toContain('1.1 USDC');
      expect(received.textContent).toContain('0.014 SOL');
      expect(screen.getByText('1 USDC ≈ 0.0127 SOL')).toBeTruthy();
      expect(screen.getByText('0.85%')).toBeTruthy();
      expect(screen.getByText('Time')).toBeTruthy();
    });

    it('carries both tokens\u2019 marks on the graphic', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      const marks = screen.getAllByTestId('tx-success-token-logo');
      expect(marks).toHaveLength(2);
      // The one that arrived with a logo draws it; the one that did not falls
      // back to its own initials rather than to a hole in the graphic.
      expect(marks[0].getAttribute('src')).toBe('https://x/usdc.png');
      expect(marks[1].textContent).toBe('SOL');
    });

    it('omits rate and fee rows when the flow did not have the data', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      expect(screen.queryByText('Rate')).toBeNull();
      expect(screen.queryByText('Salmon fee')).toBeNull();
      expect(screen.getByText('Time')).toBeTruthy();
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

  describe('the arrival', () => {
    // jsdom resolves the shorthand but not `animationDelay`, so the beat is
    // read off the declaration: it is the ms that follows the easing.
    const delayOf = (node: Element) =>
      Number(getComputedStyle(node).animation.match(/\)\s+(\d+)ms\s+both/)?.[1]);

    it('reveals a send receipt top to bottom — status, amount, actions', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const status = delayOf(screen.getByTestId('tx-success-status'));
      const amount = delayOf(screen.getByTestId('tx-success-amount').parentElement!);
      const actions = delayOf(screen.getByTestId('tx-success-assist').parentElement!);

      // The plain shape is the same rhythm as the exchange, not a second one:
      // each element after the one above it, one stagger step apart.
      expect(status).toBeLessThan(amount);
      expect(amount).toBeLessThan(actions);
      expect(amount - status).toBe(SINK_FLOAT_STAGGER_MS);
      expect(actions - amount).toBe(SINK_FLOAT_STAGGER_MS);
    });

    it('reveals an exchange receipt top to bottom — sent, arrow, received, rows, actions', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          exchange={exchange}
          exchangeRate="1 USDC ≈ 0.0127 SOL"
        />
      );

      const sent = delayOf(screen.getByTestId('tx-success-sent'));
      const arrow = delayOf(screen.getByTestId('tx-success-arrow'));
      const received = delayOf(screen.getByTestId('tx-success-received'));
      const rows = delayOf(screen.getByTestId('tx-success-receipt'));
      const actions = delayOf(screen.getByTestId('tx-success-assist').parentElement!);

      // Never all at once and never bottom-up: the order down the screen is
      // the order the parts arrive in.
      expect(sent).toBeLessThan(arrow);
      expect(arrow).toBeLessThan(received);
      expect(received).toBeLessThan(rows);
      expect(rows).toBeLessThan(actions);
      // The tick rides with the token that arrived, so it is that beat.
      expect(delayOf(screen.getByTestId('tx-success-tick').parentElement!)).toBe(received);
      // Every step is one of the verb's own staggers, never a minted number.
      for (const [after, before] of [
        [arrow, sent],
        [received, arrow],
        [rows, received],
        [actions, rows],
      ]) {
        expect(after - before).toBe(SINK_FLOAT_STAGGER_MS);
      }
    });

    it('cuts rather than reorders under reduced motion', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      // The mapping is parallel, not a hole: every band that carries a beat
      // carries the same escape, so nothing is staggered and nothing is
      // resequenced — the receipt is simply there.
      const css = Array.from(document.querySelectorAll('style'))
        .map((tag) => tag.textContent ?? '')
        .join('');
      const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\{[^}]*\}/g) ?? [];

      expect(reduced.length).toBeGreaterThan(0);
      for (const block of reduced) {
        expect(block).toContain('animation:none');
      }
    });
  });
});
