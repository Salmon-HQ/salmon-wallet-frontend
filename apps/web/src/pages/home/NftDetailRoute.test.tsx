/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NftDetailRoute } from './NftDetailRoute';

const mockNavigate = vi.fn();
const mockCreateBurnTransaction = vi.fn();
const mockSignAndSendPreparedSolanaTransactions = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: {
      mint: 'Mint111',
      name: 'Burned NFT',
      blockchain: 'solana',
    },
  }),
}));

vi.mock('@salmon/shared', () => ({
  colors: {
    background: { primary: '#000' },
    text: { secondary: '#aaa' },
    accent: { primary: '#0f0' },
  },
  fontFamily: { sans: 'sans-serif' },
  fontSize: { lg: 18, bodyLg: 16 },
  spacing: { '2xl': 24, md: 12 },
  useAccountsContext: () => [
    {
      activeAccount: {
        networksAccounts: {
          'solana-mainnet': [
            {
              getReceiveAddress: () => 'Owner111',
              getCredit: vi.fn().mockResolvedValue(10_000_000),
            },
          ],
        },
      },
    },
  ],
  isSolanaNft: () => true,
  createBurnTransaction: (...args: unknown[]) => mockCreateBurnTransaction(...args),
  signAndSendPreparedSolanaTransactions: (...args: unknown[]) =>
    mockSignAndSendPreparedSolanaTransactions(...args),
  isSolanaAccount: () => true,
  isSignableSolanaAccount: () => true,
  isWatchOnlyAccount: () => false,
  useNftBurn: () => ({
    burnNft: (...args: unknown[]) => mockSignAndSendPreparedSolanaTransactions(...args),
    settling: false,
  }),
  useSettleAfterTx: () => vi.fn().mockResolvedValue(undefined),
}));

// NftDetailRoute imports isSignableSolanaAccount from the deep sub-path
// '@salmon/shared/utils/account', a different specifier than the barrel mock
// above — without mocking it too, the real module loads and its @bonfida
// import runs a PDA derivation at load time that crashes under Vitest's jsdom.
vi.mock('@salmon/shared/utils/account', () => ({
  isSolanaAccount: () => true,
  isSignableSolanaAccount: () => true,
  isWatchOnlyAccount: () => false,
}));

vi.mock('@salmon/ui', () => ({
  NftDetailPage: ({
    onBurnPress,
    onBurnConfirm,
    onBurnSuccessContinue,
    burnStep,
  }: {
    onBurnPress: () => void;
    onBurnConfirm: () => void;
    onBurnSuccessContinue: () => void;
    burnStep: 'idle' | 'review' | 'success';
  }) => (
    <div>
      <button onClick={onBurnPress}>Prepare Burn</button>
      <button onClick={onBurnConfirm}>Confirm Burn</button>
      {burnStep === 'success' ? <button onClick={onBurnSuccessContinue}>Continue</button> : null}
    </div>
  ),
  NftSendDialog: () => null,
}));

describe('NftDetailRoute burn navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateBurnTransaction.mockResolvedValue({ transaction: 'burn-tx' });
    mockSignAndSendPreparedSolanaTransactions.mockResolvedValue(['sig-111']);
  });

  it('navigates home after burn success', async () => {
    render(<NftDetailRoute />);

    fireEvent.click(screen.getByText('Prepare Burn'));

    await waitFor(() => {
      expect(mockCreateBurnTransaction).toHaveBeenCalledWith({
        mintAddress: 'Mint111',
        ownerAddress: 'Owner111',
      });
    });

    fireEvent.click(screen.getByText('Confirm Burn'));

    await waitFor(() => {
      expect(mockSignAndSendPreparedSolanaTransactions).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Continue'));

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});
