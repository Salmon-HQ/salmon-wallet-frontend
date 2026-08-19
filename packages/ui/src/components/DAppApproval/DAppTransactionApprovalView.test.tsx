/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === 'string'
        ? fallback
        : String((fallback as Record<string, unknown> | undefined)?.defaultValue ?? key),
  }),
}));

vi.mock('@salmon/shared', () => ({
  // The approval header draws the mark from the vector rather than Logo.png.
  markPaths: ['M0 0H1V1H0Z'],
  markViewBoxAttr: '0 0 253 236',
  markAspectRatio: 253 / 236,
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  semantic: {
    status: { danger: '#f00', dangerTint: '#500', warning: '#fa0', warningTint: '#540', success: '#0f0' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      deepFieldHeight: 180,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
    flesh: { band: '#FFF1EE' },
    water: { light: '#9FE0EF' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  palette: {
    salmon: { 500: '#FF5C45', 600: '#E64A34' },
    neutral: { 0: '#FFFFFF', 1000: '#070911' },
  },
  borderRadius: { full: 999, md: 8, lg: 12, xl: 16 },
  colors: {
    background: { primary: '#000', secondary: '#111', card: '#050505' },
    border: { subtle: '#222', default: '#333' },
    text: { primary: '#fff', secondary: '#ccc' },
    interactive: { surface: '#444' },
    button: {
      primaryBackground: '#fff',
      primaryText: '#000',
      secondaryBackground: '#222',
      secondaryText: '#fff',
      disabledOpacity: 0.5,
    },
  },
  componentSizes: { buttonMinWidth: 64, buttonHeight: 48, buttonRadius: 12 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  fontFamily: { sans: 'sans-serif', mono: 'monospace' },
  fontSize: { xs: 10, sm: 12, base: 14, bodyLg: 16, title: 20 },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
  letterSpacing: { widest: '1px' },
  shadowsCSS: { none: 'none' },
  opacity: { soft: 0.8 },
  duration: { normal: '200ms', fastest: '80ms' },
  motionDuration: { flick: '90ms' },
  motionEasing: { current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' } },
  easing: { ease: 'ease' },
  copyToClipboard: vi.fn().mockResolvedValue(undefined),
  formatDateTime: (ts: number) => String(ts),
  formatOrigin: (origin: string) => origin,
  getShortAddress: (address: string) => address,
  formatBaseUnits: (amount: bigint) => String(amount < 0n ? -amount : amount),
}));

import { DAppTransactionApprovalView } from './DAppTransactionApprovalView';

const ACCOUNT = 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' as never;

const baseProps = {
  origin: 'https://app.example.com',
  requestSummary: 'signTransaction',
  effectsLoading: false,
  feeSol: '0.000005',
  instructionCount: 2,
  feePayer: 'FeePayer1111111111111111111111111111111111',
  recentBlockhash: 'Block1111111111111111111111111111111111111',
  parsingError: null,
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('DAppTransactionApprovalView', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the ordinary button for a transaction the preview understood', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{ kind: 'no-effect', account: ACCOUNT }}
      />
    );

    expect(screen.getByRole('button', { name: 'APPROVE & SIGN' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'HOLD TO APPROVE' })).not.toBeInTheDocument();
  });

  it('demands a deliberate hold when the transaction grants a spending permission', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: -5000n, feeLamports: 5000n },
          tokens: [],
          approvals: [
            {
              tokenAccount: ACCOUNT,
              mint: ACCOUNT,
              spender: ACCOUNT,
              amount: 1n,
              decimals: 6,
              symbol: 'USDC',
              scope: 'unlimited',
            },
          ],
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'HOLD TO APPROVE' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'APPROVE & SIGN' })).not.toBeInTheDocument();
  });

  it('demands a hold when the effects could not be established at all', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{
          kind: 'undetermined',
          account: ACCOUNT,
          reason: 'simulation-unavailable',
          detail: 'offline',
        }}
      />
    );

    expect(screen.getByRole('button', { name: 'HOLD TO APPROVE' })).toBeInTheDocument();
  });
});
