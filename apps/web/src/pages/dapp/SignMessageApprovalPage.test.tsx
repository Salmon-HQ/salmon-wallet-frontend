/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseDAppMetadata = vi.fn();
const mockDecodeDAppMessage = vi.fn();
const mockApproveSolanaSignMessage = vi.fn();
const mockApproveSolanaSignOffchainMessage = vi.fn();
const mockSendResponse = vi.fn();
let onRequestCallback: ((incoming: unknown) => void) | null = null;

vi.mock('@salmon/shared', () => ({
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
  decodeDAppMessage: (data: number[]) => mockDecodeDAppMessage(data),
  approveSolanaSignMessage: (...args: unknown[]) => mockApproveSolanaSignMessage(...args),
  approveSolanaSignOffchainMessage: (...args: unknown[]) =>
    mockApproveSolanaSignOffchainMessage(...args),
  useAccountsContext: () => [{
    activeAccount: null,
    activeBlockchainAccount: null,
    pathIndex: 0,
  }],
}));

const fakeAccount = { kind: 'solana' };

vi.mock('@salmon/shared/utils/account', () => ({
  getActiveSolanaApprovalAccount: () => fakeAccount,
}));

vi.mock('../../utils/walletBridge', () => ({
  onRequest: (callback: (incoming: unknown) => void) => {
    onRequestCallback = callback;
    return () => { onRequestCallback = null; };
  },
  sendResponse: (...args: unknown[]) => mockSendResponse(...args),
}));

vi.mock('@salmon/ui', () => ({
  DAppSignMessageApprovalView: (props: Record<string, unknown>) => (
    <div
      data-testid="sign-message-view"
      data-message={String(props.messageText ?? '')}
      data-disabled={String(props.disabled ?? '')}
      data-data={props.data === undefined ? 'undefined' : JSON.stringify(props.data)}
      data-required-signers={
        props.requiredSigners === undefined ? 'undefined' : JSON.stringify(props.requiredSigners)
      }
    >
      <button
        type="button"
        data-testid="approve-button"
        onClick={props.onApprove as () => void}
      />
    </div>
  ),
}));

import { SignMessageApprovalPage } from './SignMessageApprovalPage';

const messageBytes = [72, 101, 108, 108, 111];
const signer = '11111111111111111111111111111111';

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/dapp/sign-message?requestId=r1&origin=https%3A%2F%2Fdapp.example']}
    >
      <SignMessageApprovalPage />
    </MemoryRouter>,
  );
}

describe('SignMessageApprovalPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    onRequestCallback = null;
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    mockDecodeDAppMessage.mockReturnValue({ text: 'Hello' });
    vi.spyOn(window, 'close').mockImplementation(() => {});
  });

  it('routes an incoming signOffchain request into the OCMS view mode', () => {
    const { getByTestId } = renderPage();

    act(() => {
      onRequestCallback?.({
        requestId: 'r1',
        origin: 'https://dapp.example',
        request: {
          id: 'r1',
          method: 'signOffchain',
          params: { data: messageBytes, requiredSigners: [signer] },
        },
      });
    });

    const view = getByTestId('sign-message-view');
    expect(view.dataset.data).toBe(JSON.stringify(messageBytes));
    expect(view.dataset.requiredSigners).toBe(JSON.stringify([signer]));
    expect(view.dataset.disabled).toBe('false');
  });

  it('approves a signOffchain request via the OCMS approval path', async () => {
    const payload = {
      signedOffchainMessage: 'bs58-buffer',
      signature: 'bs58-signature',
      signatureType: 'ed25519',
    };
    mockApproveSolanaSignOffchainMessage.mockReturnValue(payload);
    const { getByTestId } = renderPage();

    act(() => {
      onRequestCallback?.({
        requestId: 'r1',
        origin: 'https://dapp.example',
        request: {
          id: 'r1',
          method: 'signOffchain',
          params: { data: messageBytes, requiredSigners: [signer] },
        },
      });
    });
    getByTestId('approve-button').click();
    await vi.waitFor(() =>
      expect(mockSendResponse).toHaveBeenCalledWith({
        requestId: 'r1',
        approved: true,
        payload,
      }),
    );

    const [accountArg, dataArg, signersArg] =
      mockApproveSolanaSignOffchainMessage.mock.calls[0];
    expect(accountArg).toBe(fakeAccount);
    expect(dataArg).toEqual(messageBytes);
    expect(signersArg).toHaveLength(1);
    expect(signersArg[0].toBase58()).toBe(signer);
    expect(mockApproveSolanaSignMessage).not.toHaveBeenCalled();
  });

  it('passes raw data (banner path) but no requiredSigners on the legacy sign method', async () => {
    mockApproveSolanaSignMessage.mockReturnValue({ signature: 's', publicKey: 'p' });
    const { getByTestId } = renderPage();

    act(() => {
      onRequestCallback?.({
        requestId: 'r1',
        origin: 'https://dapp.example',
        request: { id: 'r1', method: 'sign', params: { data: messageBytes } },
      });
    });

    const view = getByTestId('sign-message-view');
    expect(view.dataset.data).toBe(JSON.stringify(messageBytes));
    expect(view.dataset.requiredSigners).toBe('undefined');

    getByTestId('approve-button').click();
    await vi.waitFor(() =>
      expect(mockApproveSolanaSignMessage).toHaveBeenCalledWith(fakeAccount, messageBytes),
    );
    expect(mockApproveSolanaSignOffchainMessage).not.toHaveBeenCalled();
  });
});
