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
  borderRadius: { full: 999, md: 8, lg: 12, xl: 16 },
  colors: {
    background: { primary: '#000', secondary: '#111', card: '#050505' },
    border: { subtle: '#222', default: '#333' },
    text: { primary: '#fff', secondary: '#ccc' },
    interactive: { surface: '#444' },
    status: { error: '#f00', errorBackground: '#500' },
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
  fontSize: { xs: 10, sm: 12, base: 14, md: 16, title: 20 },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
  letterSpacing: { widest: '1px' },
  shadowsCSS: { none: 'none' },
  opacity: { soft: 0.8 },
  duration: { normal: '200ms', fastest: '80ms' },
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
