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
  colors: {
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
    accent: { primary: '#0f0', border: '#0c0' },
    background: { tertiary: '#111' },
    status: { success: '#0f0' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40 },
  borderRadius: { lg: 16, full: '50%', card: 12 },
  borderWidth: { accent: 1 },
  fontFamily: { sans: 'Inter, sans-serif' },
  fontSize: { sm: 14, base: 16, md: 18, title: 22, '4xl': 36 },
  fontWeight: { semibold: 600, bold: 700 },
  lineHeight: { none: 1 },
  componentSizes: { logoSizeSmall: 80, buttonHeightCompact: 48, buttonMinWidthLg: 200 },
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

    it('keeps the bridge deposit instructions', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          title="Bridge Initiated"
          bridgeDepositAddress="bc1qdeposit"
          bridgeAmountIn="33 USDC"
        />,
      );

      expect(screen.getByText('bc1qdeposit')).toBeTruthy();
      expect(screen.getByText('33 USDC')).toBeTruthy();
    });
  });
});
