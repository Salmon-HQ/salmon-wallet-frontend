/**
 * @vitest-environment jsdom
 *
 * The recipient field reads a pasted payment link once it settles: a
 * transaction request goes to the merchant flow, a transfer request starts
 * the Send flow, and a collectible's send takes neither (spec 043 T033).
 */
import React from 'react';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { StepRecipient } from './StepRecipient';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// The network-bound halves are stubbed; the link reading stays real.
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAddressValidation: () => ({
    validationState: 'idle',
    isValidating: false,
    isValid: false,
    resolvedAddress: null,
    message: null,
    messageType: null,
  }),
  useSendContacts: () => ({ contacts: [], ownWallets: [] }),
  useTransactions: () => ({ transactions: [], loading: false }),
}));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));
vi.mock('../TokenPickerSheet', () => ({ TokenPickerSheet: () => null }));

const RECIPIENT = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const account = { getReceiveAddress: () => 'Sender1111111111111111111111111111111111111' };

function renderStep(props: Partial<React.ComponentProps<typeof StepRecipient>> = {}) {
  return renderInMode(
    'dark',
    <StepRecipient
      account={account as never}
      networkId="solana-mainnet"
      recipient={null}
      onContinue={vi.fn()}
      onBack={vi.fn()}
      token={null}
      tokens={[]}
      tokensLoading={false}
      liveBalance={undefined}
      onSelectToken={vi.fn()}
      {...props}
    />
  );
}

function paste(text: string) {
  fireEvent.change(screen.getByTestId('send-recipient-input'), { target: { value: text } });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

const field = () => screen.getByTestId('send-recipient-input') as HTMLInputElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StepRecipient payment links', () => {
  it('hands a transaction request to the merchant flow and clears the field', () => {
    const onTransactionRequest = vi.fn();
    const onRequest = vi.fn();
    renderStep({ onTransactionRequest, onRequest });

    paste('solana:https://merchant.example/pay?order=1');

    expect(onTransactionRequest).toHaveBeenCalledWith({
      url: 'https://merchant.example/pay?order=1',
      host: 'merchant.example',
    });
    expect(onRequest).not.toHaveBeenCalled();
    expect(field().value).toBe('');
    expect(screen.queryByTestId('send-request-refused')).toBeNull();
  });

  it('still starts the Send flow from a transfer request', () => {
    const onTransactionRequest = vi.fn();
    const onRequest = vi.fn(() => ({ ok: true as const, next: 'review' as const }));
    renderStep({ onTransactionRequest, onRequest });

    paste(`solana:${RECIPIENT}?amount=1`);

    expect(onRequest).toHaveBeenCalledWith(expect.objectContaining({ recipient: RECIPIENT }));
    expect(onTransactionRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['a transaction request', 'solana:https://merchant.example/pay'],
    ['a transfer request', `solana:${RECIPIENT}?amount=1`],
  ])('refuses %s in a collectible send', (_name, link) => {
    renderStep({ nft: { name: 'Fish', blockchain: 'solana' } as never });

    paste(link);

    expect(screen.getByTestId('send-request-refused').textContent).toBe(
      'send.request.errors.paymentLinkNotHere'
    );
  });
});
