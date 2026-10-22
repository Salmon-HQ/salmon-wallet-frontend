/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
import { armApproval } from '../../test/armApproval';
import { DAppTransactionApprovalView } from './DAppTransactionApprovalView';
import { APPROVE_ARM_MS } from './useApprovalArming';

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
  signingAccount: { address: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf' },
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('DAppTransactionApprovalView', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the account that signs, as the current wallet when it has no name', () => {
    render(<DAppTransactionApprovalView {...baseProps} effects={null} effectsLoading />);

    const row = screen.getByTestId('signing-account');
    expect(row).toHaveTextContent('Current wallet');
    expect(row).toHaveTextContent('Fg6P...KzXf');
  });

  it('says the overview covers only the first transaction of a batch', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        requestSummary="signAllTransactions"
        transactionCount={4}
        effects={{
          kind: 'undetermined',
          account: ACCOUNT,
          reason: 'batch-not-previewable',
          detail: 'four transactions',
        }}
      />
    );

    expect(screen.getByTestId('batch-first-only')).toHaveTextContent('describe only the first one');
  });

  it('leaves the overview unqualified for a single transaction', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{ kind: 'no-effect', account: ACCOUNT }}
      />
    );

    expect(screen.queryByTestId('batch-first-only')).not.toBeInTheDocument();
  });

  it('cannot be approved while the preview is still running', () => {
    render(<DAppTransactionApprovalView {...baseProps} effectsLoading effects={null} />);

    expect(screen.getByRole('button', { name: 'APPROVE & SIGN' })).toBeDisabled();
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

  // The hold has a keyboard path (Enter commits at once); a key press counts
  // there too only after Approve has held the focus for the arming delay.
  it('holds back a key press on Hold to Approve until it has had the focus a moment', () => {
    vi.useFakeTimers();
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{
          kind: 'undetermined',
          account: ACCOUNT,
          reason: 'unanalysed-program',
          detail: '',
        }}
      />
    );
    armApproval();
    const hold = screen.getByRole('button', { name: 'HOLD TO APPROVE' });

    act(() => hold.focus());
    expect(fireEvent.keyDown(hold, { key: 'Enter' })).toBe(false);
    act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));
    expect(fireEvent.keyDown(hold, { key: 'Enter' })).toBe(true);
    vi.useRealTimers();
  });

  // A preview that settled with no answer is not an absence of warnings.
  it('demands a hold when the preview settled with no answer', () => {
    render(<DAppTransactionApprovalView {...baseProps} effects={null} effectsLoading={false} />);

    expect(screen.getByRole('button', { name: 'HOLD TO APPROVE' })).toBeInTheDocument();
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

describe('DAppTransactionApprovalView network mismatch', () => {
  it('surfaces the mismatch and refuses approval when the request targets another network', () => {
    render(
      <DAppTransactionApprovalView
        {...baseProps}
        effects={{ kind: 'no-effect', account: ACCOUNT }}
        networkMismatch={{ requested: 'solana-devnet', active: 'solana-mainnet' }}
      />
    );

    expect(screen.getByTestId('network-mismatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'APPROVE & SIGN' })).toBeDisabled();
  });
});
