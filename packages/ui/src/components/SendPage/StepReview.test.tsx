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
