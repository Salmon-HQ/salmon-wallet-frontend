/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallback?: string | Record<string, unknown>,
      values?: Record<string, unknown>
    ) => {
      const template = typeof fallback === 'string' ? fallback : key;
      if (!values) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(values[name] ?? ''));
    },
  }),
}));

vi.mock('@salmon/shared', () => ({
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  borderRadius: { full: 999, md: 8, lg: 12, xl: 16 },
  semantic: { status: { danger: '#f00', dangerTint: '#500', warning: '#fa0', warningTint: '#540', success: '#0f0' } },
  colors: {
    background: { primary: '#000', secondary: '#111', card: '#050505' },
    border: { subtle: '#222', default: '#333' },
    text: { primary: '#fff', secondary: '#ccc' },
    interactive: { surface: '#444' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  fontFamily: { sans: 'sans-serif', mono: 'monospace' },
  fontSize: { xs: 10, sm: 12, base: 14, bodyLg: 16, title: 20 },
  fontWeight: { medium: 500, semibold: 600, bold: 700 },
  // Mirrors the real exact formatter closely enough for rendering assertions;
  // its own edge cases are covered in `packages/shared/src/utils/formatting.test.ts`.
  formatBaseUnits: (amount: bigint, decimals: number) => {
    const magnitude = amount < 0n ? -amount : amount;
    if (decimals <= 0) return magnitude.toString();
    const digits = magnitude.toString().padStart(decimals + 1, '0');
    const whole = digits.slice(0, digits.length - decimals);
    const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole;
  },
  getShortAddress: (address: string) => address,
}));

import { TransactionEffectsCard } from './TransactionEffectsCard';

const ACCOUNT = 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' as never;
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as never;
const TOKEN_ACCOUNT = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi' as never;
const SPENDER = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' as never;

describe('TransactionEffectsCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows what leaves and what enters, with the sign as its own glyph', () => {
    render(
      <TransactionEffectsCard
        loading={false}
        effects={{
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: -1_500_000_000n, feeLamports: 5_000n },
          tokens: [
            {
              tokenAccount: TOKEN_ACCOUNT,
              mint: MINT,
              amount: 12_500_000n,
              decimals: 6,
              symbol: 'USDC',
            },
          ],
          approvals: [],
        }}
      />
    );

    expect(screen.getByText('−1.5')).toBeInTheDocument();
    expect(screen.getByText('Leaves your wallet')).toBeInTheDocument();
    expect(screen.getByText('+12.5')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('Includes the 0.000005 SOL network fee.')).toBeInTheDocument();
  });

  it('calls out an unlimited spending permission and names the spender', () => {
    render(
      <TransactionEffectsCard
        loading={false}
        effects={{
          kind: 'effects',
          account: ACCOUNT,
          sol: { lamports: -5_000n, feeLamports: 5_000n },
          tokens: [],
          approvals: [
            {
              tokenAccount: TOKEN_ACCOUNT,
              mint: MINT,
              spender: SPENDER,
              amount: 18_446_744_073_709_551_615n,
              decimals: 6,
              symbol: 'USDC',
              scope: 'unlimited',
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Spending permission')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${SPENDER} would be able to move an unlimited amount of USDC out of your wallet, now and in the future, until you revoke it.`
      )
    ).toBeInTheDocument();
  });

  it('never renders an unavailable preview as an empty list of changes', () => {
    render(
      <TransactionEffectsCard
        loading={false}
        effects={{
          kind: 'undetermined',
          account: ACCOUNT,
          reason: 'simulation-unavailable',
          detail: 'offline',
        }}
      />
    );

    expect(screen.getByText('Salmon could not determine what this does')).toBeInTheDocument();
    expect(
      screen.getByText('The network could not be reached to simulate it.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No balance changes')).not.toBeInTheDocument();
  });

  it('distinguishes a transaction that would fail from one that changes nothing', () => {
    const { rerender } = render(
      <TransactionEffectsCard
        loading={false}
        effects={{
          kind: 'transaction-would-fail',
          account: ACCOUNT,
          error: 'InsufficientFundsForRent' as never,
          logs: ['Program log: failed'],
        }}
      />
    );

    expect(screen.getByText('This transaction would fail')).toBeInTheDocument();
    expect(screen.queryByText('No balance changes')).not.toBeInTheDocument();

    rerender(
      <TransactionEffectsCard loading={false} effects={{ kind: 'no-effect', account: ACCOUNT }} />
    );

    expect(screen.getByText('No balance changes')).toBeInTheDocument();
    expect(screen.queryByText('This transaction would fail')).not.toBeInTheDocument();
  });

  it('says it is still simulating rather than showing nothing', () => {
    render(<TransactionEffectsCard loading effects={null} />);

    expect(screen.getByText('Simulating this transaction…')).toBeInTheDocument();
  });
});
