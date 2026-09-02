/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAddressValidation = vi.fn();
const mockUseSendContacts = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object') {
        const template = (fallback.defaultValue as string | undefined) ?? key;
        return template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(fallback[name] ?? ''));
      }
      return key;
    },
  }),
}));

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useAddressValidation: (...args: unknown[]) => mockUseAddressValidation(...args),
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatPrecise: (value: number) => value.toFixed(2) },
  ],
  useSendContacts: (...args: unknown[]) => mockUseSendContacts(...args),
}));

vi.mock('../../utils/styled', async () => {
  const actual = await vi.importActual<typeof import('../../utils/styled')>('../../utils/styled');
  return actual;
});

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { StepAddressAmount } from './StepAddressAmount';

const account = {
  getReceiveAddress: () => 'Sender111111111111111111111111111111',
} as any;

const token = {
  name: 'USD Coin',
  symbol: 'USDC',
  uiAmount: 4,
  decimals: 2,
  price: 2,
} as any;

describe('StepAddressAmount', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();

    mockUseSendContacts.mockReturnValue({
      contacts: [
        {
          name: 'Alice',
          address: 'Alice11111111111111111111111111111',
          blockchain: 'solana',
          networkName: 'Devnet',
        },
      ],
      ownWallets: [{ accountName: 'Vault', address: 'Vault11111111111111111111111111111' }],
    });

    mockUseAddressValidation.mockImplementation((address: string) => {
      if (address.trim() === 'Alice11111111111111111111111111111') {
        return {
          validationState: 'valid',
          isValidating: false,
          isValid: true,
          resolvedAddress: 'ResolvedAlice111111111111111111111111',
          message: null,
          messageType: null,
        };
      }

      return {
        validationState: address ? 'invalid' : 'idle',
        isValidating: false,
        isValid: false,
        resolvedAddress: null,
        message: address ? 'Invalid recipient' : null,
        messageType: address ? 'error' : null,
      };
    });
  });

  // Fund safety, not cosmetics: a contact saved on a test network must never
  // read as its mainnet twin on the screen where a send destination is picked.
  it('names the environment of a non-mainnet contact, never the chain alone', () => {
    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={vi.fn()}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Solana Devnet')).toBeTruthy();
    expect(screen.queryByText('Solana')).toBeNull();
  });

  // The selected-token card is a way back to token selection. A flow that has
  // no token-selection step must not render it as a control at all.
  it('makes the selected token card actionable only when there is a token-selection step', () => {
    const onBack = vi.fn();

    const { rerender } = render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={onBack}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const card = screen.getByTestId('send-selected-token');
    expect(card.tagName).toBe('BUTTON');
    fireEvent.click(card);
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(
      <StepAddressAmount
        token={token}
        blockchain="bitcoin"
        account={account}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const inertCard = screen.getByTestId('send-selected-token');
    expect(inertCard.tagName).not.toBe('BUTTON');
    expect(inertCard.getAttribute('aria-label')).toBeNull();
    fireEvent.click(inertCard);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses quick fill to update amount and fiat conversion', () => {
    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={vi.fn()}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'general.max' }));

    expect(screen.getByDisplayValue('4')).toBeTruthy();
    expect(screen.getByText('8.00 USD')).toBeTruthy();
  });

  it('fills recipient from the address book and sends resolved address on review', () => {
    const onReview = vi.fn();

    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={vi.fn()}
        onReview={onReview}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Alice/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('token.send.blockchainAddress'), {
      target: { value: 'Alice11111111111111111111111111111 ' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'token.send.reviewAndSend' }));

    expect(onReview).toHaveBeenCalledWith(
      'Alice11111111111111111111111111111',
      '1.5',
      'ResolvedAlice111111111111111111111111'
    );
  });

  it('uses liveBalance over snapshot uiAmount for MAX quick fill', () => {
    // token snapshot says 4 USDC but liveBalance reflects an inbound transfer
    // of 6 USDC bringing the live total to 10. MAX must fill 10, not 4.
    render(
      <StepAddressAmount
        token={token}
        liveBalance={10}
        blockchain="solana"
        account={account}
        onBack={vi.fn()}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'general.max' }));

    expect(screen.getByDisplayValue('10')).toBeTruthy();
  });

  it('renders the balance in the app language while MAX still fills a parseable amount', async () => {
    const i18n = (await import('i18next')).default;
    const originalLanguage = i18n.language;
    i18n.language = 'es';

    try {
      render(
        <StepAddressAmount
          token={token}
          liveBalance={10.5}
          blockchain="solana"
          account={account}
          onBack={vi.fn()}
          onReview={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('10,5 USDC')).toBeTruthy();

      // The displayed string is never parsed back: MAX derives from the number.
      fireEvent.click(screen.getByRole('button', { name: 'general.max' }));
      expect(screen.getByDisplayValue('10.5')).toBeTruthy();
    } finally {
      i18n.language = originalLanguage;
    }
  });

  it('keeps review disabled for invalid recipient state', () => {
    render(
      <StepAddressAmount
        token={token}
        blockchain="solana"
        account={account}
        onBack={vi.fn()}
        onReview={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('token.send.blockchainAddress'), {
      target: { value: 'bad-address' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '1' },
    });

    expect(screen.getByText('Invalid recipient')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'token.send.reviewAndSend' })).toHaveProperty(
      'disabled',
      true
    );
  });
});
