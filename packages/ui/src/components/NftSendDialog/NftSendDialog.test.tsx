/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockSendNft = vi.fn();
// Stable across renders: a fresh `reset` identity would re-fire the dialog's
// open-reset effect on every render and snap the flow back to the input step.
const mockNftTransfer = { sendNft: mockSendNft, reset: vi.fn(), settling: false };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallbackOrOptions?: unknown) =>
      typeof fallbackOrOptions === 'string'
        ? fallbackOrOptions
        : ((fallbackOrOptions as { defaultValue?: string } | undefined)?.defaultValue ?? _key),
  }),
}));

// `@salmon/shared` pulls React Native through its barrel, which Vitest cannot
// parse. Mock the tokens and helpers the dialog reads; the transfer hook is
// the seam the flow assertions are about.
vi.mock('@salmon/shared', () => ({
  colors: {
    text: { primary: '#fff', secondary: '#999' },
    accent: { primary: '#FF5C45' },
    background: { card: '#111' },
  },
  semantic: { status: { danger: '#f00' } },
  spacing: { sm: 8, md: 12, lg: 16 },
  fontFamily: { sans: 'DM Sans, sans-serif' },
  fontWeight: { medium: 500, semibold: 600 },
  borderRadius: { md: 12 },
  fontSize: { sm: 14, bodyLg: 16 },
  componentSizes: { buttonHeight: 56, iconSizeLarge: 32, dialogStageMinHeight: 420 },
  useNftTransfer: () => mockNftTransfer,
  classifyTransactionError: () => 'transaction.errors.unknown',
  getShortAddress: (address?: string) => (address ? `${address.slice(0, 4)}...end` : undefined),
  getTransactionUrl: () => 'https://explorer.example/tx123',
  getDefaultExplorer: () => 'solscan',
}));

// Structural stand-ins: the test exercises the dialog's step machine, not
// MUI's dialog chrome.
vi.mock('../BaseDialog', () => {
  function Base({ visible, children }: { visible: boolean; children?: React.ReactNode }) {
    return visible ? <div role="dialog">{children}</div> : null;
  }
  function Header({ title }: { title: string }) {
    return <h2>{title}</h2>;
  }
  function Section({ children }: { children?: React.ReactNode }) {
    return <div>{children}</div>;
  }
  Base.Header = Header;
  Base.Content = Section;
  Base.Actions = Section;
  const Button = ({
    children,
    onClick,
    disabled,
    testID,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    testID?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid={testID}>
      {children}
    </button>
  );
  Base.CancelButton = Button;
  Base.ActionButton = Button;
  return {
    BaseDialog: Base,
    MessageText: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  };
});

// A stub that fills in a valid recipient on demand (a mount effect would be
// clobbered by the dialog's own open-reset effect, which runs after it).
vi.mock('../InputAddress', () => ({
  InputAddress: ({
    onChange,
    onValidation,
  }: {
    onChange: (address: string) => void;
    onValidation: (result: { isValid: boolean }) => void;
  }) => (
    <button
      data-testid="input-address-fill"
      onClick={() => {
        onChange('DestAddr111');
        onValidation({ isValid: true });
      }}
    >
      fill
    </button>
  ),
}));

vi.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: ({ onContinue }: { onContinue: () => void }) => (
    <div data-testid="transaction-success-screen">
      <button data-testid="success-continue" onClick={onContinue}>
        Continue
      </button>
    </div>
  ),
}));

import { NftSendDialog } from './NftSendDialog';

const nft = {
  mint: 'Mint111',
  name: 'Blur NFT',
  image: 'https://example.com/nft.png',
  blockchain: 'solana',
  collectionName: 'Blur Collection',
} as never;

const account = { getNetworkId: () => 'mainnet' } as never;

describe('NftSendDialog', () => {
  afterEach(() => {
    cleanup();
    mockSendNft.mockReset();
  });

  const goToReview = () => {
    fireEvent.click(screen.getByTestId('input-address-fill'));
    fireEvent.click(screen.getByTestId('nft-send-continue-button'));
  };

  it('shows a review step with the NFT, collection and recipient before signing', () => {
    render(
      <NftSendDialog visible onClose={vi.fn()} nft={nft} account={account} onSuccess={vi.fn()} />
    );

    goToReview();

    expect(screen.getByText('Review Send')).toBeTruthy();
    expect(screen.getByText('Blur NFT')).toBeTruthy();
    expect(screen.getByText('Blur Collection')).toBeTruthy();
    expect(screen.getByTestId('nft-send-review-recipient').textContent).toBe('Dest...end');
    // Nothing was signed on the way to review.
    expect(mockSendNft).not.toHaveBeenCalled();
  });

  it('sends only from the review confirm, shows success, and reports on continue', async () => {
    mockSendNft.mockResolvedValue({ txId: 'tx123' });
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(
      <NftSendDialog visible onClose={onClose} nft={nft} account={account} onSuccess={onSuccess} />
    );

    goToReview();
    fireEvent.click(screen.getByTestId('nft-send-confirm-button'));

    await waitFor(() => {
      expect(screen.getByTestId('transaction-success-screen')).toBeTruthy();
    });
    expect(mockSendNft).toHaveBeenCalledWith(nft, 'DestAddr111');
    // The host is notified only when the user leaves the receipt.
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('success-continue'));
    expect(onSuccess).toHaveBeenCalledWith('tx123');
    expect(onClose).toHaveBeenCalled();
  });
});
