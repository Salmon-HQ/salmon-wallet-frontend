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

vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual('../../../../shared/src/utils/formatting')),
  ...(await vi.importActual('../../../../shared/src/utils/network')),
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  semantic: {
    status: { danger: '#f00', warning: '#fc0', success: '#0f0' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD', disabled: '#6F7B95' },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    scales: {
      deepFieldStroke: 'rgba(199, 211, 232, 0.06)',
      deepFieldScale: 3.2,
      deepFieldHeight: 180,
      fishStroke: 'rgba(7, 9, 17, 0.10)',
      fishScale: 1,
    },
    flesh: { band: '#FFF1EE' },
    water: { light: '#9FE0EF' },
  },
  fleshTile: { width: 380, height: 40 },
  fleshFills: [],
  palette: {
    salmon: { 500: '#FF5C45', 600: '#E64A34' },
    neutral: { 0: '#FFFFFF', 1000: '#070911' },
  },
  sanitizeDecimalInput: (text: string) => text.replace(/,/g, '.'),
  borderRadius: { lg: 16, md: 12, sm: 8, button: 16, iconContainer: 18, scrollbar: 8 },
  borderWidth: { thin: 1 },
  colors: {
    text: { primary: '#fff', secondary: '#999' },
    accent: { border: '#0f0' },
    button: {
      cancelBackground: '#111',
      secondaryBackground: '#222',
      secondaryText: '#EDF1F7',
      primaryBackground: '#FF5C45',
      primaryText: '#070911',
      disabledOpacity: 0.5,
    },
    background: { card: '#111', tertiary: '#333' },
    border: { default: '#444' },
    interactive: { hoverMedium: '#555' },
  },
  // The action row is the shared PrimaryButton / SecondaryButton now, so this
  // mock has to cover the tokens those buttons read too.
  componentSizes: {
    buttonHeightMedium: 48,
    iconSizeXL: 40,
    scrollbarWidthSm: 6,
    buttonHeight: 56,
    buttonRadius: 12,
    buttonMinWidth: 120,
    buttonFleshScale: 1,
  },
  letterSpacing: { widest: 1 },
  duration: { fast: '120ms', normal: '200ms', fastest: '80ms' },
  motionDuration: { flick: '90ms' },
  motionEasing: { current: { css: 'cubic-bezier(0.32, 0.72, 0, 1)' } },
  durationMs: { debounce: 0 },
  easing: { ease: 'ease' },
  fontFamily: { sans: 'Inter, sans-serif' },
  fontSize: { xs: 12, sm: 14, base: 16, bodyLg: 18, xl: 24 },
  fontWeight: { medium: 500, semibold: 600, bold: 700, extraBold: 800 },
  getShortAddress: (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`,
  gradients: { disabledCSS: '#555', primaryCSS: '#0f0' },
  lineHeight: { condensed: 1.2 },
  opacity: { full: 1, high: 0.85, medium: 0.6, soft: 0.8 },
  shadowsCSS: { button: 'none', bezel: 'none', none: 'none' },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, base: 10 },
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
