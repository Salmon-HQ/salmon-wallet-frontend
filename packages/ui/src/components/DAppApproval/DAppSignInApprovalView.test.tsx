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

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  // The approval header draws the mark from the vector rather than Logo.png.
  markPaths: ['M0 0H1V1H0Z'],
}));

import { createSemantic, shadows, ThemeContext } from '@salmon/shared';
import type { ThemeContextValue } from '@salmon/shared';
import { DAppSignInApprovalView } from './DAppSignInApprovalView';

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

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
    // The real `formatOrigin` strips the origin down to its hostname, so the
    // header and the SIWS domain field both render 'app.example.com'.
    expect(screen.getAllByText('app.example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Fg6P...KzXf')).toBeInTheDocument();
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

  it('stands on bedrock and reads the live mode — light inks in light', () => {
    const light = createSemantic('light');
    const value = {
      mode: 'light',
      preference: 'light',
      setPreference: async () => undefined,
      semantic: light,
      shadows,
      ready: true,
    } as unknown as ThemeContextValue;

    render(
      <ThemeContext.Provider value={value}>
        <DAppSignInApprovalView {...baseProps} />
      </ThemeContext.Provider>
    );

    // Bedrock rule: the gate is an opaque plane, never water or glass.
    expect(screen.getByTestId('dapp-sign-in-approval').style.backgroundColor).toBe(
      hexToRgb(light.surface.bedrock)
    );
    expect(screen.getByTestId('approval-title').style.color).toBe(hexToRgb(light.text.primary));
    // The mark is the brand accent in both modes.
    expect(screen.getByTestId('brand-mark').getAttribute('fill')).toBe(light.accent.fill);
  });

  it('notes the OCMS-envelope path when isOffchainMessage is set', () => {
    render(<DAppSignInApprovalView {...baseProps} isOffchainMessage />);

    expect(
      screen.getByText('This message will be signed as a Solana off-chain message (OCMS).')
    ).toBeInTheDocument();
  });
});
