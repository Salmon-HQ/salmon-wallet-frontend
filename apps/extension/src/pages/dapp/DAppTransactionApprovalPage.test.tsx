/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { startTestAnalytics, type SentEvent } from '@salmon/shared/test-utils/analytics';

const mockUseDAppMetadata = vi.fn();
const mockGetSummary = vi.fn();
const mockUseApproval = vi.fn();
const mockApproveTransactionRequest = vi.fn();

vi.mock('@salmon/shared', async () => ({
  // The real analytics client: the test reads what leaves the window.
  ...(await vi.importActual<object>('@salmon/shared/analytics')),
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
  approveSolanaTransactionRequest: (...args: unknown[]) => mockApproveTransactionRequest(...args),
  getDAppTransactionRequestSummary: (method: string) => mockGetSummary(method),
  useSolanaTransactionApproval: (params: unknown) => mockUseApproval(params),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  isSolanaAccount: () => true,
  isSignableSolanaAccount: () => true,
}));

vi.mock('@salmon/ui', () => ({
  DAppTransactionApprovalView: (props: Record<string, unknown>) => (
    <div
      data-testid="tx-approval-view"
      data-app-name={String(props.appName ?? '')}
      data-app-icon={String(props.appIcon ?? '')}
      data-summary={String(props.requestSummary ?? '')}
      data-fee-sol={String(props.feeSol ?? '')}
      data-instruction-count={String(props.instructionCount ?? '')}
      data-fee-payer={String(props.feePayer ?? '')}
      data-recent-blockhash={String(props.recentBlockhash ?? '')}
      data-parsing-error={String(props.parsingError ?? '')}
      data-effects-kind={String((props.effects as { kind?: string } | null)?.kind ?? '')}
      data-effects-loading={String(props.effectsLoading ?? '')}
      data-disabled={String(props.disabled ?? '')}
      data-network-mismatch={
        props.networkMismatch
          ? `${(props.networkMismatch as { requested: string }).requested}->${(props.networkMismatch as { active: string }).active}`
          : undefined
      }
    >
      <button type="button" data-testid="approve-button" onClick={props.onApprove as () => void} />
      <button type="button" data-testid="reject-button" onClick={props.onReject as () => void} />
    </div>
  ),
}));

import { DAppTransactionApprovalPage } from './DAppTransactionApprovalPage';
import type { DAppTransactionRequest } from '@salmon/shared';

const baseRequest: DAppTransactionRequest = {
  id: 'req-tx-1',
  method: 'signAndSendTransaction',
  params: { transaction: 'base64-tx' },
} as unknown as DAppTransactionRequest;

const fakeAccount = { kind: 'solana' } as unknown as Parameters<
  typeof DAppTransactionApprovalPage
>[0]['account'];

const baseProps = {
  origin: 'https://dapp.example',
  request: baseRequest,
  account: fakeAccount,
  networkId: 'solana-mainnet',
  onDismiss: vi.fn(),
};

describe('DAppTransactionApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSummary.mockReturnValue('Sign transaction');
    mockUseApproval.mockReturnValue({
      details: {
        feeLamports: 5000,
        instructionCount: 2,
        feePayer: 'FeePayer1111111111111111111111111111111111',
        recentBlockhash: 'Block1111111111111111111111111111111111111',
      },
      feeSol: '0.000005',
      parsingError: null,
      effects: { kind: 'no-effect', account: 'FeePayer1111111111111111111111111111111111' },
      effectsLoading: false,
    });
  });

  it('renders the approval view with metadata and decoded transaction details', () => {
    mockUseDAppMetadata.mockReturnValue({
      metadata: { name: 'Tx dApp', icon: 'https://dapp.example/icon.png' },
    });

    const { getByTestId } = render(<DAppTransactionApprovalPage {...baseProps} />);

    const view = getByTestId('tx-approval-view');
    expect(view.dataset.appName).toBe('Tx dApp');
    expect(view.dataset.appIcon).toBe('https://dapp.example/icon.png');
    expect(view.dataset.summary).toBe('Sign transaction');
    expect(view.dataset.disabled).toBe('false');
    expect(mockGetSummary).toHaveBeenCalledWith(baseRequest.method);

    expect(view.dataset.instructionCount).toBe('2');
    expect(view.dataset.feeSol).toBe('0.000005');
    expect(view.dataset.feePayer).toBe('FeePayer1111111111111111111111111111111111');
    expect(view.dataset.recentBlockhash).toBe('Block1111111111111111111111111111111111111');
    expect(view.dataset.effectsKind).toBe('no-effect');
  });

  it('renders without throwing when metadata is null and surfaces parsing errors', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    mockUseApproval.mockReturnValue({
      details: null,
      feeSol: null,
      parsingError: 'Failed to decode transaction',
      effects: null,
      effectsLoading: false,
    });

    const { getByTestId } = render(<DAppTransactionApprovalPage {...baseProps} />);

    const view = getByTestId('tx-approval-view');
    expect(view.dataset.appName).toBe('');
    expect(view.dataset.appIcon).toBe('');
    // Raw decode error messages must never surface; only the fixed string.
    expect(view.dataset.parsingError).toBe('Failed to decode transaction');
  });

  it('passes the pending preview through instead of rendering an empty change list', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    mockUseApproval.mockReturnValue({
      details: null,
      feeSol: null,
      parsingError: null,
      effects: null,
      effectsLoading: true,
    });

    const view = render(<DAppTransactionApprovalPage {...baseProps} />).getByTestId(
      'tx-approval-view'
    );

    expect(view.dataset.effectsLoading).toBe('true');
    expect(view.dataset.effectsKind).toBe('');
  });

  it('disables the view when networkId is missing', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });

    const { getByTestId } = render(<DAppTransactionApprovalPage {...baseProps} networkId={null} />);

    expect(getByTestId('tx-approval-view').dataset.disabled).toBe('true');
  });
});

describe('DAppTransactionApprovalPage network mismatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSummary.mockReturnValue('Sign transaction');
    mockUseApproval.mockReturnValue({
      details: null,
      feeSol: null,
      parsingError: null,
      effects: null,
      effectsLoading: false,
    });
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
  });

  it('refuses a request built for another network instead of failing at send time', () => {
    const request = {
      ...baseProps.request,
      params: { ...baseProps.request.params, network: 'solana-devnet' },
    } as typeof baseProps.request;

    const { getByTestId } = render(
      <DAppTransactionApprovalPage {...baseProps} request={request} networkId="solana-mainnet" />
    );

    expect(getByTestId('tx-approval-view').dataset.networkMismatch).toBe(
      'solana-devnet->solana-mainnet'
    );
  });

  it.each([
    ['mainnet', 'solana-mainnet'],
    ['mainnet-beta', 'solana-mainnet'],
    ['devnet', 'solana-devnet'],
    ['testnet', 'solana-testnet'],
    ['solana:mainnet', 'solana-mainnet'],
    ['solana:devnet', 'solana-devnet'],
    ['solana:testnet', 'solana-testnet'],
    ['solana-mainnet', 'solana-mainnet'],
    ['solana-devnet', 'solana-devnet'],
  ])('accepts %s on %s', (network, networkId) => {
    const request = {
      ...baseProps.request,
      params: { ...baseProps.request.params, network },
    } as typeof baseProps.request;

    const { getByTestId } = render(
      <DAppTransactionApprovalPage {...baseProps} request={request} networkId={networkId} />
    );

    expect(getByTestId('tx-approval-view').dataset.networkMismatch).toBeUndefined();
  });

  it.each(['mainnet', 'solana:mainnet', 'testnet', 'unknown', 'bitcoin-devnet'])(
    'still refuses %s on Solana Devnet',
    (network) => {
      const request = {
        ...baseProps.request,
        params: { ...baseProps.request.params, network },
      } as typeof baseProps.request;
      const view = render(
        <DAppTransactionApprovalPage {...baseProps} request={request} networkId="solana-devnet" />
      ).getByTestId('tx-approval-view');
      expect(view.dataset.networkMismatch).toBeDefined();
    }
  );
});

// FR-011–FR-013, FR-015: one prop-less event per approved request, however many
// transactions it holds, already on its way when the background hears the
// answer (it closes this window on it); nothing for a refusal, a guard error or
// a failed signature.
describe('DAppTransactionApprovalPage analytics', () => {
  let analytics: Awaited<ReturnType<typeof startTestAnalytics>>;
  let atAnswer: SentEvent[][];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetSummary.mockReturnValue('Sign transaction');
    mockUseApproval.mockReturnValue({
      details: null,
      feeSol: null,
      parsingError: null,
      effects: null,
      effectsLoading: false,
    });
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    analytics = await startTestAnalytics();
    atAnswer = [];
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(() => atAnswer.push(analytics.delivered())) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['signTransaction', 'signAllTransactions', 'signAndSendTransaction'])(
    'counts an approved %s request once before answering, with no props',
    async (method) => {
      mockApproveTransactionRequest.mockResolvedValue({ signatures: ['a', 'b'] });
      const onDismiss = vi.fn();
      const request = { ...baseRequest, method } as DAppTransactionRequest;

      const { getByTestId } = render(
        <DAppTransactionApprovalPage {...baseProps} request={request} onDismiss={onDismiss} />
      );
      fireEvent.click(getByTestId('approve-button'));
      await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(true));

      expect(atAnswer).toEqual([[{ event: 'dapp_transaction_signed', props: {} }]]);
      expect(await analytics.sent()).toEqual([{ event: 'dapp_transaction_signed', props: {} }]);
    }
  );

  it('records nothing when the user rejects', async () => {
    const { getByTestId } = render(<DAppTransactionApprovalPage {...baseProps} />);
    fireEvent.click(getByTestId('reject-button'));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
  });

  it('records nothing when the approval is refused before signing', async () => {
    const request = {
      ...baseRequest,
      params: { ...baseRequest.params, network: 'solana-devnet' },
    } as DAppTransactionRequest;

    const { getByTestId } = render(
      <DAppTransactionApprovalPage {...baseProps} request={request} />
    );
    fireEvent.click(getByTestId('approve-button'));

    expect(mockApproveTransactionRequest).not.toHaveBeenCalled();
    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
  });

  it('records nothing when signing or sending fails', async () => {
    mockApproveTransactionRequest.mockRejectedValue(new Error('rpc'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppTransactionApprovalPage {...baseProps} onDismiss={onDismiss} />
    );
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(false));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
    consoleError.mockRestore();
  });
});
