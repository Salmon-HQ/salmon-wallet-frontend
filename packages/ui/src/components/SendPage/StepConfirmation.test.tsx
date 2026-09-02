/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCopyToClipboard = vi.fn(async (_address: string) => true);
const mockEstimateFee = vi.fn(async () => null);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) =>
      options && typeof options === 'object'
        ? `${key}:${Object.values(options as Record<string, unknown>).join(',')}`
        : key,
  }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useSendTransaction: () => ({
    status: 'idle',
    error: null,
    feeEstimateFailed: false,
    estimateFee: mockEstimateFee,
    sendTransaction: vi.fn(),
    reset: vi.fn(),
  }),
  copyToClipboard: (value: string) => mockCopyToClipboard(value),
}));

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { StepConfirmation } from './StepConfirmation';

const RESOLVED = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const CHUNKED_RESOLVED = '7xKX tg2C W87d 97TX JSDp bD5j Bkhe TqA8 3TZR uJos gAsU';

const baseProps = {
  token: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  amount: '1',
  blockchain: 'solana',
  account: {},
  onBack: () => {},
  onCancel: () => {},
  onSuccess: () => {},
} as never as React.ComponentProps<typeof StepConfirmation>;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('StepConfirmation destination address', () => {
  it('shows the resolved address, not the domain, when the recipient was a domain', () => {
    render(
      <StepConfirmation
        {...baseProps}
        recipientAddress="alice.sol"
        resolvedRecipientAddress={RESOLVED}
      />
    );

    expect(screen.getByTestId('send-confirm-address').textContent).toBe(CHUNKED_RESOLVED);
    expect(screen.getByTestId('send-confirm-resolved-from').textContent).toBe(
      'token.send.resolvedFrom:alice.sol'
    );
  });

  it('copies the resolved address, which is what the transfer will pay', () => {
    render(
      <StepConfirmation
        {...baseProps}
        recipientAddress="alice.sol"
        resolvedRecipientAddress={RESOLVED}
      />
    );

    fireEvent.click(screen.getByTestId('send-confirm-copy-address'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith(RESOLVED);
  });

  it('shows no domain line when the user pasted a plain address', () => {
    render(<StepConfirmation {...baseProps} recipientAddress={RESOLVED} />);

    expect(screen.getByTestId('send-confirm-address').textContent).toBe(CHUNKED_RESOLVED);
    expect(screen.queryByTestId('send-confirm-resolved-from')).toBeNull();
  });

  // Three times now this surface has grown its own confirm button — a gradient
  // box at a local radius, with the shared button's material missing. The
  // flesh is only ever drawn by PrimaryButton, so its presence inside the
  // control is the cheapest proof the shared button is what is rendered.
  it('commits through the shared primary button, flesh and all', () => {
    render(<StepConfirmation {...baseProps} recipientAddress={RESOLVED} />);

    const confirm = screen.getByTestId('send-confirm-button');
    expect(confirm.tagName).toBe('BUTTON');
    expect(confirm.querySelector('svg')).not.toBeNull();
    // A control label is never uppercase (DESIGN.md §Typography).
    expect(confirm.textContent).toBe('actions.confirm');
  });
});
