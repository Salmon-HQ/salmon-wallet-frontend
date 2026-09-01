/**
 * `NftFlowContext` — the burn state machine and the send call, after the move.
 *
 * This is the coverage `collectibles-burn.test.tsx` used to hold against
 * `NftsTab`: the burn preview is built from the same contract with the same
 * arguments, the prepared transaction reaches `useNftBurn` untouched, and the
 * transfer is fired with the NFT object and the recipient string exactly as
 * the sheet fired them. The machine moved one level; nothing it does changed,
 * and this file is what says so.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockCreateBurnTransaction = jest.fn();
const mockBurnNft = jest.fn();
const mockSendNft = jest.fn();
const mockSettleAfterTx = jest.fn();
const mockCanonicalNftToSolanaNftData = jest.fn();
const mockGetCredit = jest.fn();

const mockRawNft = { mint: { address: 'Mint111' }, name: 'Burnable NFT' };
const mockNftData = {
  mint: 'Mint111',
  name: 'Burnable NFT',
  image: 'https://example.com/nft.png',
  blockchain: 'solana',
};

const mockAccount = {
  getReceiveAddress: () => 'Owner111',
  getNetworkId: () => 'solana-mainnet',
  getCredit: (...args: unknown[]) => mockGetCredit(...args),
};

let mockAccountsState: Record<string, unknown> = {
  ready: true,
  activeAccount: {
    id: 'account-1',
    networksAccounts: { 'solana-mainnet': [mockAccount] },
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('@salmon/shared', () => ({
  // The components barrel the flow imports evaluates kit stylesheets at module
  // scope, so the theme has to be real here even though nothing renders it.
  ...jest.requireActual('../../test-utils/themeTokens'),
  SECTION_TO_NETWORK: { solana: 'solana-mainnet', 'solana-devnet': 'solana-devnet' },
  canonicalNftToSolanaNftData: (...args: unknown[]) => mockCanonicalNftToSolanaNftData(...args),
  classifyTransactionError: () => 'transaction.errors.generic',
  createBurnTransaction: (...args: unknown[]) => mockCreateBurnTransaction(...args),
  getDefaultExplorer: () => 'solscan',
  getTransactionUrl: () => 'https://explorer.example/tx',
  useAccountsContext: () => [mockAccountsState, {}],
  useNftBurn: () => ({ burnNft: mockBurnNft, settling: false }),
  useNftTransfer: () => ({ sendNft: mockSendNft, settling: false }),
  useSettleAfterTx: () => mockSettleAfterTx,
  useSolanaNfts: () => ({ nfts: [mockRawNft], loading: false }),
}));

jest.mock('../../src/contexts/DeveloperModeContext', () => ({
  useDeveloperMode: () => false,
}));

import { NftFlowProvider, useNftFlow } from '../../src/contexts/NftFlowContext';

/** A probe standing in for the five screens: every action, no chrome. */
function Probe() {
  const flow = useNftFlow();
  return (
    <>
      <Text testID="probe-nft">{flow.nft?.name ?? 'none'}</Text>
      <Text testID="probe-burn-preparing">{String(flow.burnPreparing)}</Text>
      <Text testID="probe-burn-error">{flow.burnError ?? 'none'}</Text>
      <Text testID="probe-success">{`${flow.successKind ?? 'none'}:${flow.successTxId ?? ''}`}</Text>
      <Text testID="probe-validated">{flow.validatedRecipient ?? 'none'}</Text>
      <TouchableOpacity
        testID="probe-recipient"
        onPress={() => flow.setValidatedRecipient('DestAddr111', null)}
      >
        <Text>set recipient</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="probe-recipient-domain"
        onPress={() => flow.setValidatedRecipient('bob.sol', 'ResolvedAddr222')}
      >
        <Text>set domain recipient</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="probe-edit" onPress={() => flow.setRecipient('Edited')}>
        <Text>edit recipient</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="probe-prepare-burn" onPress={() => void flow.prepareBurn()}>
        <Text>prepare</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="probe-confirm-burn" onPress={() => void flow.confirmBurn()}>
        <Text>confirm burn</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="probe-send" onPress={() => void flow.submitSend()}>
        <Text>send</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="probe-acknowledge" onPress={flow.acknowledgeSuccess}>
        <Text>acknowledge</Text>
      </TouchableOpacity>
    </>
  );
}

const renderFlow = () =>
  render(
    <NftFlowProvider mint="Mint111" sectionKey="solana" subAccountIndex={0}>
      <Probe />
    </NftFlowProvider>
  );

describe('the NFT flow provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanonicalNftToSolanaNftData.mockReturnValue(mockNftData);
    mockCreateBurnTransaction.mockResolvedValue({ transaction: 'burn-transaction' });
    mockBurnNft.mockResolvedValue(['signature-111']);
    mockSendNft.mockResolvedValue({ txId: 'tx123' });
    mockSettleAfterTx.mockResolvedValue(undefined);
    mockGetCredit.mockResolvedValue(0);
  });

  it('resolves the NFT from the list the grid already loaded', () => {
    renderFlow();
    expect(screen.getByTestId('probe-nft').props.children).toBe('Burnable NFT');
  });

  it('builds the burn preview from the same contract with the same arguments', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-prepare-burn'));

    await waitFor(() => {
      expect(mockCreateBurnTransaction).toHaveBeenCalledWith(
        { mintAddress: 'Mint111', ownerAddress: 'Owner111' },
        'solana-mainnet'
      );
    });
  });

  it('hands the prepared transaction to burnNft untouched, with the mint', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-prepare-burn'));
    await waitFor(() => expect(mockCreateBurnTransaction).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('probe-confirm-burn'));

    await waitFor(() => {
      expect(mockBurnNft).toHaveBeenCalledWith({ transaction: 'burn-transaction' }, 'Mint111');
    });
    expect(screen.getByTestId('probe-success').props.children).toBe('burn:signature-111');
  });

  it('refuses to confirm a burn that was never prepared', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-confirm-burn'));
    await act(async () => {});

    expect(mockBurnNft).not.toHaveBeenCalled();
  });

  // The lookup table locks rent before the burn is submitted, so a wallet that
  // cannot cover it must be stopped at the preview, not at the signature.
  it('flags an insufficient balance for the lookup table rent', async () => {
    mockCreateBurnTransaction.mockResolvedValue({
      transaction: 'burn-transaction',
      lookupTable: {
        estimatedRentLamports: 5_000_000,
        addressCount: 12,
        extendTransactionCount: 1,
      },
    });
    mockGetCredit.mockResolvedValue(1_000);

    renderFlow();
    fireEvent.press(screen.getByTestId('probe-prepare-burn'));

    await waitFor(() => {
      expect(screen.getByTestId('probe-burn-error').props.children).toBe(
        'nft.burn.insufficientFeeSol'
      );
    });
  });

  it('sends the NFT object and the recipient string exactly as typed', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-recipient'));
    fireEvent.press(screen.getByTestId('probe-send'));

    await waitFor(() => {
      expect(mockSendNft).toHaveBeenCalledWith(mockNftData, 'DestAddr111');
    });
    expect(screen.getByTestId('probe-success').props.children).toBe('send:tx123');
  });

  // The one transaction-input change in the move, and the reason it exists: a
  // domain signed verbatim pays nobody.
  it('pays a domain at the address it resolved to', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-recipient-domain'));
    fireEvent.press(screen.getByTestId('probe-send'));

    await waitFor(() => {
      expect(mockSendNft).toHaveBeenCalledWith(mockNftData, 'ResolvedAddr222');
    });
  });

  // No screen can forget to invalidate a verdict, because editing the string
  // is what drops it.
  it('drops the verdict the moment the recipient is edited', () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-recipient'));
    expect(screen.getByTestId('probe-validated').props.children).toBe('DestAddr111');

    fireEvent.press(screen.getByTestId('probe-edit'));
    expect(screen.getByTestId('probe-validated').props.children).toBe('none');
  });

  // The second settle the sheet fired from `NftsTab.handleSendSuccess`: it
  // carries the avatar account id, which `useNftTransfer`'s own settle does
  // not, so dropping it would leave a stale avatar behind a sent NFT.
  it('settles the caches the sheet settled once the receipt is acknowledged', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-recipient'));
    fireEvent.press(screen.getByTestId('probe-send'));
    await waitFor(() => expect(mockSendNft).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(screen.getByTestId('probe-acknowledge'));
    });

    expect(mockSettleAfterTx).toHaveBeenCalledWith({
      accountId: 'Owner111',
      avatarAccountId: 'account-1',
      networkId: 'solana-mainnet',
      kinds: ['balance', 'transactions', 'nfts', 'avatar-nfts'],
      removedNftMintAddresses: ['Mint111'],
    });
  });

  // A burn settles inside `useNftBurn`; the receipt must not fire a second one.
  it('does not double-settle after a burn', async () => {
    renderFlow();

    fireEvent.press(screen.getByTestId('probe-prepare-burn'));
    await waitFor(() => expect(mockCreateBurnTransaction).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('probe-confirm-burn'));
    await waitFor(() => expect(mockBurnNft).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(screen.getByTestId('probe-acknowledge'));
    });

    expect(mockSettleAfterTx).not.toHaveBeenCalled();
  });

  it('leaves the account that cannot be resolved without a burn preview', async () => {
    mockAccountsState = { ready: true, activeAccount: { id: 'account-1', networksAccounts: {} } };

    renderFlow();
    fireEvent.press(screen.getByTestId('probe-prepare-burn'));

    await waitFor(() => {
      expect(screen.getByTestId('probe-burn-error').props.children).toBe(
        'collectibles.no_account_for_network'
      );
    });
    expect(mockCreateBurnTransaction).not.toHaveBeenCalled();

    mockAccountsState = {
      ready: true,
      activeAccount: { id: 'account-1', networksAccounts: { 'solana-mainnet': [mockAccount] } },
    };
  });
});
