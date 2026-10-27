/**
 * @vitest-environment jsdom
 *
 * Review, when Send was started from a payment request (spec 033 US3): the
 * requester's words above what it fixed, no token change, and a balance
 * under the request blocks the commit rather than swapping the token.
 */
import React from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { StepReview } from './StepReview';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../TokenPickerSheet', () => ({ TokenPickerSheet: () => null }));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));

const usdc = { address: 'usdc', name: 'USD Coin', symbol: 'USDC', decimals: 6, uiAmount: 1 };
const request = {
  request: {
    recipient: 'Dest',
    amount: '1',
    splToken: 'usdc',
    references: ['Ref'],
    label: 'Café',
    message: 'Table 4',
  },
  token: usdc,
  locked: { recipient: true as const, token: true as const, amount: true },
};

const baseProps = () => ({
  recipient: { address: 'Dest' },
  onBack: vi.fn(),
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  isSending: false,
  token: usdc as never,
  tokens: [usdc] as never,
  tokensLoading: false,
  amount: '1',
  estimatedFee: '0.000005 SOL',
  estimateFee: vi.fn(),
  feeEstimateFailed: false,
  onSelectToken: vi.fn(),
});

afterEach(() => cleanup());

describe('StepReview with a payment request', () => {
  it('shows who asked and what for, and offers no token change', () => {
    renderInMode('dark', <StepReview {...baseProps()} request={request} liveBalance={1} />);
    expect(screen.getByTestId('send-review-requested-by')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
    expect(screen.getByTestId('send-review-for')).toBeTruthy();
    expect(screen.getByText('Table 4')).toBeTruthy();
    expect(screen.queryByTestId('send-review-change-token')).toBeNull();
    expect((screen.getByTestId('send-confirm-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('a balance under the request blocks the commit and never swaps the token', () => {
    renderInMode('dark', <StepReview {...baseProps()} request={request} liveBalance={0.5} />);
    expect(screen.getByTestId('send-review-insufficient')).toBeTruthy();
    expect((screen.getByTestId('send-confirm-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('send-review-change-token')).toBeNull();
  });

  it('without a request the token stays changeable', () => {
    renderInMode('dark', <StepReview {...baseProps()} />);
    expect(screen.getByTestId('send-review-change-token')).toBeTruthy();
    expect(screen.queryByTestId('send-review-requested-by')).toBeNull();
  });
});

describe('StepReview with a recipient no key controls', () => {
  // Scanned, pasted or typed, the recipient reaches the review through the
  // flow's state; the review warns and still lets the user confirm.
  it('warns about an off-curve recipient without blocking the commit', () => {
    renderInMode(
      'dark',
      <StepReview {...baseProps()} recipientWarning="send.validation.off_curve_no_funds" />
    );
    expect(screen.getByTestId('send-review-recipient-warning')).toBeTruthy();
    expect(screen.getByText('send.validation.off_curve_no_funds')).toBeTruthy();
    expect((screen.getByTestId('send-confirm-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows no warning for an ordinary recipient', () => {
    renderInMode('dark', <StepReview {...baseProps()} />);
    expect(screen.queryByTestId('send-review-recipient-warning')).toBeNull();
  });
});

describe('StepReview address row', () => {
  it('shows no second address row when "To" already is the address', () => {
    renderInMode('dark', <StepReview {...baseProps()} />);
    expect(screen.getByTestId('send-review-to')).toBeTruthy();
    expect(screen.queryByTestId('send-confirm-address')).toBeNull();
  });

  it('shows the address under a contact name', () => {
    renderInMode(
      'dark',
      <StepReview {...baseProps()} recipient={{ address: 'Dest', name: 'Ana' }} />
    );
    expect(screen.getByTestId('send-confirm-address')).toBeTruthy();
  });
});

describe('StepReview for a collectible', () => {
  const nft = { mint: 'Mint', name: 'Fish #1', image: '' } as never;

  it('offers the send again after an ordinary failure', () => {
    renderInMode(
      'dark',
      <StepReview {...baseProps()} nft={nft} nftError="transaction.errors.networkBusy" />
    );
    expect((screen.getByTestId('nft-send-confirm-button') as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it('never offers it again when the outcome is unknown', () => {
    renderInMode(
      'dark',
      <StepReview {...baseProps()} nft={nft} nftError="transaction.errors.broadcastUnknown" />
    );
    expect((screen.getByTestId('nft-send-confirm-button') as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});
