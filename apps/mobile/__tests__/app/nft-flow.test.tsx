/**
 * The NFT flow provider — the mobile seam around `useNftFlowState`.
 *
 * The state machine (recipient verdicts, burn preview, receipt, settle) is
 * tested once in `packages/shared/src/hooks/useNftFlowState.test.tsx`. What is
 * mobile's alone, and what this file pins: the NFT is resolved from the list
 * the grid already loaded, the signing sub-account is the route's, the route's
 * mint is the flow's identity, and an unsupported burn becomes an `Alert`.
 */
import React from 'react';
import { Alert, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const mockUseNftFlowState = jest.fn();
const mockCanonicalNftToSolanaNftData = jest.fn();
const mockAccount = {
  getReceiveAddress: () => 'Owner111',
  getNetworkId: () => 'solana-mainnet',
};
const mockRawNft = { mint: { address: 'Mint111' } };
const mockNftData = { mint: 'Mint111', name: 'Burnable NFT', blockchain: 'solana' };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  canonicalNftToSolanaNftData: (...args: unknown[]) => mockCanonicalNftToSolanaNftData(...args),
  useAccountsContext: () => [
    {
      ready: true,
      activeAccount: { id: 'acct-1', networksAccounts: { 'solana-mainnet': [mockAccount] } },
    },
    {},
  ],
  useSolanaNfts: () => ({ nfts: [mockRawNft], loading: false }),
  useNftFlowState: (...args: unknown[]) => mockUseNftFlowState(...args),
}));

jest.mock('../../src/contexts/DeveloperModeContext', () => ({
  useUnverifiedTokens: () => false,
}));

import { NftFlowProvider, useNftFlow } from '../../src/contexts/NftFlowContext';

function Probe() {
  const flow = useNftFlow();
  return (
    <>
      <Text testID="probe-nft">{flow.nft?.name ?? 'none'}</Text>
      <Text testID="probe-account">{flow.account?.getReceiveAddress() ?? 'none'}</Text>
      <Text testID="probe-success">{`${flow.successKind ?? 'none'}:${flow.successTxId ?? ''}`}</Text>
    </>
  );
}

const flowStub = {
  recipient: '',
  setRecipient: jest.fn(),
  validatedRecipient: null,
  resolvedRecipient: null,
  setValidatedRecipient: jest.fn(),
  sending: false,
  sendError: null,
  submitSend: jest.fn(),
  burnPreview: null,
  burnPreparing: false,
  burnError: null,
  prepareBurn: jest.fn(),
  confirmBurn: jest.fn(),
  resetBurn: jest.fn(),
  successKind: 'burn',
  successTxId: 'signature-111',
  successSettling: false,
  explorerUrl: null,
  settleAfterSend: jest.fn(),
  acknowledgeSuccess: jest.fn(),
  reset: jest.fn(),
};

describe('the NFT flow provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanonicalNftToSolanaNftData.mockReturnValue(mockNftData);
    mockUseNftFlowState.mockReturnValue(flowStub);
  });

  it('resolves the NFT from the list the grid already loaded and hands the flow its identity', () => {
    render(
      <NftFlowProvider mint="Mint111" networkId="solana-mainnet" subAccountIndex={0}>
        <Probe />
      </NftFlowProvider>
    );

    expect(screen.getByTestId('probe-nft').props.children).toBe('Burnable NFT');
    expect(screen.getByTestId('probe-account').props.children).toBe('Owner111');
    expect(screen.getByTestId('probe-success').props.children).toBe('burn:signature-111');
    expect(mockUseNftFlowState).toHaveBeenCalledWith(
      expect.objectContaining({
        nft: mockNftData,
        account: mockAccount,
        networkId: 'solana-mainnet',
        activeAccountId: 'acct-1',
        flowKey: 'Mint111',
      })
    );
  });

  it('turns an unsupported burn into an alert — the flow itself stays silent', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(
      <NftFlowProvider mint="Mint111" networkId="solana-mainnet" subAccountIndex={0}>
        <Probe />
      </NftFlowProvider>
    );

    const { onBurnUnsupported } = mockUseNftFlowState.mock.calls[0][0] as {
      onBurnUnsupported: (blockchain: string) => void;
    };
    onBurnUnsupported('bitcoin');

    expect(alertSpy).toHaveBeenCalledWith(
      'Not Supported',
      'Burning {{blockchain}} NFTs is not yet supported.'
    );
    alertSpy.mockRestore();
  });

  it('throws outside the provider — an NFT screen with no flow has no NFT to show', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useNftFlow must be used inside NftFlowProvider');
    spy.mockRestore();
  });
});
