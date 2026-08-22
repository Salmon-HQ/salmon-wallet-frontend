/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUseDAppMetadata = vi.fn();
const mockGetSummary = vi.fn();
const mockUseApproval = vi.fn();

vi.mock('@salmon/shared', () => ({
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
  approveSolanaTransactionRequest: vi.fn(),
  getDAppTransactionRequestSummary: (method: string) => mockGetSummary(method),
  useSolanaTransactionApproval: (params: unknown) => mockUseApproval(params),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  isSolanaAccount: () => true,
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
    />
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
