/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUseDAppMetadata = vi.fn();
const mockDecodeDAppMessage = vi.fn();
const mockApproveSolanaSignMessage = vi.fn();
const mockApproveSolanaSignOffchainMessage = vi.fn();

vi.mock('@salmon/shared', () => ({
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
  decodeDAppMessage: (data: number[]) => mockDecodeDAppMessage(data),
  approveSolanaSignMessage: (...args: unknown[]) => mockApproveSolanaSignMessage(...args),
  approveSolanaSignOffchainMessage: (...args: unknown[]) =>
    mockApproveSolanaSignOffchainMessage(...args),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  isSolanaAccount: () => true,
}));

vi.mock('@salmon/ui', () => ({
  DAppSignMessageApprovalView: (props: Record<string, unknown>) => (
    <div
      data-testid="sign-message-view"
      data-app-name={String(props.appName ?? '')}
      data-app-icon={String(props.appIcon ?? '')}
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
      <button
        type="button"
        data-testid="reject-button"
        onClick={props.onReject as () => void}
      />
    </div>
  ),
}));

import { DAppSignMessageApprovalPage } from './DAppSignMessageApprovalPage';
import type { DAppSignMessageRequest, DAppSignOffchainMessageRequest } from '@salmon/shared';

const messageBytes = [72, 101, 108, 108, 111];
const baseRequest: DAppSignMessageRequest = {
  id: 'req-msg-1',
  method: 'signMessage',
  params: { data: messageBytes },
} as unknown as DAppSignMessageRequest;

const fakeAccount = { kind: 'solana' } as unknown as Parameters<typeof DAppSignMessageApprovalPage>[0]['account'];

const baseProps = {
  origin: 'https://dapp.example',
  request: baseRequest,
  account: fakeAccount,
  onDismiss: vi.fn(),
};

describe('DAppSignMessageApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeDAppMessage.mockReturnValue({ text: 'Hello' });
  });

  it('renders sign-message view with metadata and decoded message', () => {
    mockUseDAppMetadata.mockReturnValue({
      metadata: { name: 'Signer dApp', icon: 'https://dapp.example/icon.png' },
    });

    const { getByTestId } = render(<DAppSignMessageApprovalPage {...baseProps} />);

    const view = getByTestId('sign-message-view');
    expect(view.dataset.appName).toBe('Signer dApp');
    expect(view.dataset.appIcon).toBe('https://dapp.example/icon.png');
    expect(view.dataset.message).toBe('Hello');
    expect(view.dataset.disabled).toBe('false');
    expect(mockDecodeDAppMessage).toHaveBeenCalledWith(messageBytes);
  });

  it('renders without throwing when metadata is null', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });

    const { getByTestId } = render(<DAppSignMessageApprovalPage {...baseProps} />);

    const view = getByTestId('sign-message-view');
    expect(view.dataset.appName).toBe('');
    expect(view.dataset.appIcon).toBe('');
  });

  it('disables the view when message data is missing', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const requestWithoutData = {
      ...baseRequest,
      params: {},
    } as unknown as DAppSignMessageRequest;

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} request={requestWithoutData} />,
    );

    expect(getByTestId('sign-message-view').dataset.disabled).toBe('true');
    expect(mockDecodeDAppMessage).not.toHaveBeenCalled();
  });

  it('passes raw data (banner path) but no requiredSigners on the legacy sign method', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });

    const { getByTestId } = render(<DAppSignMessageApprovalPage {...baseProps} />);

    const view = getByTestId('sign-message-view');
    expect(view.dataset.data).toBe(JSON.stringify(messageBytes));
    expect(view.dataset.requiredSigners).toBe('undefined');
  });

  it('passes data and requiredSigners to the view for a signOffchain request', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const signer = '11111111111111111111111111111111';
    const offchainRequest: DAppSignOffchainMessageRequest = {
      id: 'req-ocms-1',
      method: 'signOffchain',
      params: { data: messageBytes, requiredSigners: [signer] },
    };

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} request={offchainRequest} />,
    );

    const view = getByTestId('sign-message-view');
    expect(view.dataset.data).toBe(JSON.stringify(messageBytes));
    expect(view.dataset.requiredSigners).toBe(JSON.stringify([signer]));
  });

  it('approves a signOffchain request via the OCMS approval path and returns the payload', async () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const payload = {
      signedOffchainMessage: 'bs58-buffer',
      signature: 'bs58-signature',
      signatureType: 'ed25519',
    };
    mockApproveSolanaSignOffchainMessage.mockReturnValue(payload);
    const signer = '11111111111111111111111111111111';
    const onDismiss = vi.fn();
    const offchainRequest: DAppSignOffchainMessageRequest = {
      id: 'req-ocms-2',
      method: 'signOffchain',
      params: { data: messageBytes, requiredSigners: [signer] },
    };

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage
        {...baseProps}
        request={offchainRequest}
        onDismiss={onDismiss}
      />,
    );
    getByTestId('approve-button').click();
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledWith(true));

    expect(mockApproveSolanaSignOffchainMessage).toHaveBeenCalledTimes(1);
    const [accountArg, dataArg, signersArg] = mockApproveSolanaSignOffchainMessage.mock.calls[0];
    expect(accountArg).toBe(baseProps.account);
    expect(dataArg).toEqual(messageBytes);
    expect(signersArg).toEqual([signer]);
    expect(mockApproveSolanaSignMessage).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { result: payload, id: 'req-ocms-2' },
    });
    vi.unstubAllGlobals();
  });

  it('approves a legacy sign request via the raw sign path (unchanged)', async () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const payload = { signature: 'bs58-signature', publicKey: 'pubkey' };
    mockApproveSolanaSignMessage.mockReturnValue(payload);
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} onDismiss={onDismiss} />,
    );
    getByTestId('approve-button').click();
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledWith(true));

    expect(mockApproveSolanaSignMessage).toHaveBeenCalledWith(baseProps.account, messageBytes);
    expect(mockApproveSolanaSignOffchainMessage).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { result: payload, id: 'req-msg-1' },
    });
    vi.unstubAllGlobals();
  });

  it('sends a user-rejection error to the background and dismisses on reject', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} onDismiss={onDismiss} />,
    );
    getByTestId('reject-button').click();

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'User rejected the request', id: 'req-msg-1' },
    });
    expect(onDismiss).toHaveBeenCalledWith(false);
    expect(mockApproveSolanaSignMessage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sends the fixed unavailable-account error when approving without a Solana account', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} account={undefined} onDismiss={onDismiss} />,
    );
    getByTestId('approve-button').click();

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'Solana account not available', id: 'req-msg-1' },
    });
    expect(onDismiss).toHaveBeenCalledWith(false);
    expect(mockApproveSolanaSignMessage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sends the fixed missing-data error when approving a request without message data', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const onDismiss = vi.fn();
    const requestWithoutData = {
      ...baseRequest,
      params: {},
    } as unknown as DAppSignMessageRequest;

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage
        {...baseProps}
        request={requestWithoutData}
        onDismiss={onDismiss}
      />,
    );
    getByTestId('approve-button').click();

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'Missing message data', id: 'req-msg-1' },
    });
    expect(onDismiss).toHaveBeenCalledWith(false);
    expect(mockApproveSolanaSignMessage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sends only the fixed protocol string when signing fails, never the raw error', async () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const onDismiss = vi.fn();
    mockApproveSolanaSignMessage.mockRejectedValue(new Error('some internal RPC detail'));

    const { getByTestId } = render(
      <DAppSignMessageApprovalPage {...baseProps} onDismiss={onDismiss} />,
    );
    getByTestId('approve-button').click();
    await vi.waitFor(() => expect(onDismiss).toHaveBeenCalledWith(false));

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'Message signing failed', id: 'req-msg-1' },
    });
    // The internal error detail must never leak to the dApp origin.
    expect(JSON.stringify(sendMessage.mock.calls)).not.toContain('some internal RPC detail');
    vi.unstubAllGlobals();
  });
});
