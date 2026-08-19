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

vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/hooks/useCopyFeedback')),
  // The approval header draws the mark from the vector rather than Logo.png.
  markPaths: ['M0 0H1V1H0Z'],
  markViewBoxAttr: '0 0 253 236',
  markAspectRatio: 253 / 236,
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  semantic: {
    status: { danger: '#f00', dangerTint: '#500' },
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
  fleshVariantTiles: { marbled: { width: 150, height: 88 }, chevron: { width: 144, height: 84 } },
  fleshVariantFills: { marbled: [], chevron: [] },
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
}));

import { DAppSignInApprovalView } from './DAppSignInApprovalView';

const siws = {
  domain: 'app.example.com',
  address: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf',
  statement: 'Sign in to Example.',
  uri: 'https://app.example.com/login',
  nonce: 'abcd1234',
};

const baseProps = {
  origin: 'https://app.example.com',
  siws,
  messageText: 'app.example.com wants you to sign in with your Solana account:\n...',
  domainMismatch: false,
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('DAppSignInApprovalView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the wallet-built SIWS fields', () => {
    render(<DAppSignInApprovalView {...baseProps} />);

    expect(screen.getByText('Sign in to Example.')).toBeInTheDocument();
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
    expect(screen.getByText('Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf')).toBeInTheDocument();
    expect(screen.getByText('https://app.example.com/login')).toBeInTheDocument();
    expect(screen.getByText('abcd1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SIGN IN' })).not.toBeDisabled();
  });

  it('shows the mismatch banner and blocks approval when the dApp claimed another domain', () => {
    render(<DAppSignInApprovalView {...baseProps} domainMismatch requestedDomain="evil.example" />);

    expect(screen.getByText('Domain mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SIGN IN' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'REJECT' })).not.toBeDisabled();
  });

  it('blocks approval and explains when the request could not be prepared', () => {
    render(<DAppSignInApprovalView {...baseProps} siws={null} />);

    expect(
      screen.getByText('This sign-in request is invalid and cannot be signed.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SIGN IN' })).toBeDisabled();
  });

  it('notes the OCMS-envelope path when isOffchainMessage is set', () => {
    render(<DAppSignInApprovalView {...baseProps} isOffchainMessage />);

    expect(
      screen.getByText('This message will be signed as a Solana off-chain message (OCMS).')
    ).toBeInTheDocument();
  });
});
