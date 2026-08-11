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
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@salmon/shared', () => ({
  sanitizeDecimalInput: (text: string) => text.replace(/,/g, '.'),
  borderRadius: { lg: 16, md: 12, sm: 8, button: 16, iconContainer: 18, scrollbar: 8 },
  borderWidth: { thin: 1 },
  colors: {
    text: { primary: '#fff', secondary: '#999' },
    status: { error: '#f00', warning: '#fc0', success: '#0f0' },
    accent: { border: '#0f0' },
    button: { cancelBackground: '#111', secondaryBackground: '#222' },
    background: { card: '#111', tertiary: '#333' },
    border: { default: '#444' },
    interactive: { hoverMedium: '#555' },
  },
  componentSizes: {
    buttonHeightMedium: 48,
    iconSizeXL: 40,
    scrollbarWidthSm: 6,
  },
  duration: { fast: '120ms' },
  durationMs: { debounce: 0 },
  easing: { ease: 'ease' },
  fontFamily: { sans: 'Inter, sans-serif' },
  fontSize: { xs: 12, sm: 14, base: 16, md: 18, xl: 24 },
  fontWeight: { medium: 500, semibold: 600, bold: 700, extraBold: 800 },
  getShortAddress: (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`,
  gradients: { disabledCSS: '#555', primaryCSS: '#0f0' },
  lineHeight: { condensed: 1.2 },
  opacity: { full: 1, high: 0.85, medium: 0.6 },
  shadowsCSS: { button: 'none' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, base: 10 },
  useAddressValidation: (...args: unknown[]) => mockUseAddressValidation(...args),
  useCurrencyContext: () => [{ currency: 'usd' }, { formatPrecise: (value: number) => value.toFixed(2) }],
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
      contacts: [{ name: 'Alice', address: 'Alice11111111111111111111111111111', blockchain: 'solana' }],
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

    fireEvent.click(screen.getByRole('button', { name: 'MAX' }));

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
    fireEvent.change(screen.getByPlaceholderText('Solana Address'), {
      target: { value: 'Alice11111111111111111111111111111 ' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review & Send' }));

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

    fireEvent.click(screen.getByRole('button', { name: 'MAX' }));

    expect(screen.getByDisplayValue('10')).toBeTruthy();
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

    fireEvent.change(screen.getByPlaceholderText('Solana Address'), {
      target: { value: 'bad-address' },
    });
    fireEvent.change(screen.getByPlaceholderText('0'), {
      target: { value: '1' },
    });

    expect(screen.getByText('Invalid recipient')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review & Send' })).toHaveProperty('disabled', true);
  });
});
