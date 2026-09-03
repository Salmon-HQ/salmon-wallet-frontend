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

import { createSemantic, shadows, ThemeContext } from '@salmon/shared';
import type { ThemeContextValue } from '@salmon/shared';
import { TransactionEffectsCard } from './TransactionEffectsCard';

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

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
        // getShortAddress truncates a 44-char base58 address to its first/last 4 chars.
        '9WzD...AWWM would be able to move an unlimited amount of USDC out of your wallet, now and in the future, until you revoke it.'
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

  it('edges a failing transaction in the danger ink of the live mode', () => {
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
        <TransactionEffectsCard
          loading={false}
          effects={{
            kind: 'transaction-would-fail',
            account: ACCOUNT,
            error: 'InsufficientFundsForRent' as never,
            logs: [],
          }}
        />
      </ThemeContext.Provider>
    );

    expect(screen.getByTestId('effects-would-fail').style.borderColor).toBe(
      hexToRgb(light.status.danger)
    );
  });

  it('says it is still simulating rather than showing nothing', () => {
    render(<TransactionEffectsCard loading effects={null} />);

    expect(screen.getByText('Simulating this transaction…')).toBeInTheDocument();
  });
});
