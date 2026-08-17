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

// `@salmon/shared` pulls React Native through its barrel, which Vitest cannot
// parse. Mock the tokens this step reads and keep the real `chunkAddress`
// behaviour, which is what the assertions are about.
vi.mock('@salmon/shared', () => ({
  chunkAddress: (address?: string | null) =>
    address ? address.replace(/(.{4})/g, '$1 ').trim() : '',
  colors: {
    text: { primary: '#fff', secondary: '#999' },
    status: { error: '#f00', success: '#0f0' },
    accent: { border: '#0f0' },
    button: {
      cancelBackground: '#111',
      primaryText: '#070911',
      primaryBackground: '#FF5C45',
      secondaryBackground: '#1B2233',
      secondaryText: '#EDF1F7',
      disabledOpacity: 0.5,
    },
    background: { card: '#111' },
    border: { default: '#444' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
  // The action row is the shared PrimaryButton / SecondaryButton now, so this
  // mock has to cover the tokens those buttons read too.
  componentSizes: {
    buttonHeightMedium: 48,
    tokenIconXL: 80,
    buttonHeight: 56,
    buttonRadius: 12,
    buttonMinWidth: 120,
    buttonFleshScale: 1,
  },
  semantic: {
    surface: { crest: '#1B2233' },
    text: { primary: '#EDF1F7', disabled: '#6F7B95' },
    flesh: { band: '#FFF1EE' },
  },
  palette: { salmon: { 500: '#FF5C45', 600: '#E64A34' }, neutral: { 0: '#fff', 1000: '#070911' } },
  letterSpacing: { widest: 1 },
  fleshTile: { width: 380, height: 40 },
  fleshFades: [],
  fleshTiledStrokes: [],
  fontFamily: { sans: 'Geist, sans-serif', mono: 'Geist Mono, ui-monospace, monospace' },
  fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700, extraBold: 800 },
  useSendTransaction: () => ({
    status: 'idle',
    error: null,
    feeEstimateFailed: false,
    estimateFee: mockEstimateFee,
    sendTransaction: vi.fn(),
    reset: vi.fn(),
  }),
  copyToClipboard: (value: string) => mockCopyToClipboard(value),
  borderRadius: { md: 12, lg: 16, full: 9999 },
  borderWidth: { thin: 1, medium: 2 },
  fontSize: { xs: 12, sm: 14, md: 16, '3xl': 28, title: 32 },
  shadowsCSS: { button: 'none', bezel: 'none', none: 'none' },
  opacity: { high: 0.85, medium: 0.6, soft: 0.8 },
  duration: { fast: '120ms', normal: '200ms', fastest: '80ms' },
  durationMs: { feedbackLong: 2000 },
  easing: { ease: 'ease' },
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
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
