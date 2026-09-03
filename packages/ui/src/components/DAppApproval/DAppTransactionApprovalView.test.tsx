/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
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
import { DAppTransactionApprovalView } from './DAppTransactionApprovalView';

function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

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

  it('shows every technical field and, in light, the decode error in the danger ink', () => {
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
        <DAppTransactionApprovalView
          {...baseProps}
          effects={{ kind: 'no-effect', account: ACCOUNT }}
          parsingError="boom"
        />
      </ThemeContext.Provider>
    );

    // What the user signs on is unchanged by the rendering: fee, count, payer, blockhash.
    expect(screen.getByText('0.000005 SOL')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('FeePayer1111111111111111111111111111111111')).toBeInTheDocument();
    expect(screen.getByText('Block1111111111111111111111111111111111111')).toBeInTheDocument();
    expect(screen.getByText('Review unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'APPROVE & SIGN' })).toBeDisabled();

    expect(screen.getByTestId('dapp-transaction-approval').style.backgroundColor).toBe(
      hexToRgb(light.surface.bedrock)
    );
    expect(
      within(screen.getByTestId('decode-error')).getByText(
        'This transaction could not be decoded. Do not approve unless you trust this site.'
      ).style.color
    ).toBe(hexToRgb(light.status.danger));
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
