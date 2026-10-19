/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { startTestAnalytics, type SentEvent } from '@salmon/shared/test-utils/analytics';

const mockUseDAppMetadata = vi.fn();
const mockPrepareSignInMessage = vi.fn();
const mockApproveSolanaSignIn = vi.fn();

vi.mock('@salmon/shared', async () => ({
  // The real analytics client: the test reads what leaves the window.
  ...(await vi.importActual<object>('@salmon/shared/analytics')),
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
  prepareSignInMessage: (...args: unknown[]) => mockPrepareSignInMessage(...args),
  approveSolanaSignIn: (...args: unknown[]) => mockApproveSolanaSignIn(...args),
}));

vi.mock('@salmon/shared/utils/account', () => ({
  isSolanaAccount: () => true,
  isSignableSolanaAccount: () => true,
}));

vi.mock('@salmon/ui', () => ({
  DAppSignInApprovalView: (props: Record<string, unknown>) => (
    <div
      data-testid="sign-in-view"
      data-app-name={String(props.appName ?? '')}
      data-message={String(props.messageText ?? '')}
      data-disabled={String(props.disabled ?? '')}
    >
      <button type="button" data-testid="approve-button" onClick={props.onApprove as () => void} />
      <button type="button" data-testid="reject-button" onClick={props.onReject as () => void} />
    </div>
  ),
}));

import { DAppSignInApprovalPage } from './DAppSignInApprovalPage';
import type { DAppSignInRequest } from '@salmon/shared';

const signInInput = { statement: 'Sign in to Example' };
const baseRequest: DAppSignInRequest = {
  id: 'req-siws-1',
  method: 'signIn',
  params: { input: signInInput },
} as unknown as DAppSignInRequest;

const fakeAccount = {
  kind: 'solana',
  getReceiveAddress: () => 'Address1111111111111111111111111111111111111',
} as unknown as Parameters<typeof DAppSignInApprovalPage>[0]['account'];

const baseProps = {
  origin: 'https://dapp.example',
  request: baseRequest,
  account: fakeAccount,
  onDismiss: vi.fn(),
};

function stubChrome() {
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  return sendMessage;
}

describe('DAppSignInApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    mockPrepareSignInMessage.mockReturnValue({
      fields: { domain: 'dapp.example' },
      message: 'dapp.example wants you to sign in',
      domainMismatch: false,
      addressMismatch: false,
    });
  });

  it('sends a user-rejection error to the background and dismisses on reject', () => {
    const sendMessage = stubChrome();
    const onDismiss = vi.fn();

    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(getByTestId('reject-button'));

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'User rejected the request', id: 'req-siws-1' },
    });
    expect(onDismiss).toHaveBeenCalledWith(false);
    expect(mockApproveSolanaSignIn).not.toHaveBeenCalled();
  });

  it('sends the fixed unavailable-account error when approving without a Solana account', () => {
    const sendMessage = stubChrome();
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppSignInApprovalPage {...baseProps} account={undefined} onDismiss={onDismiss} />
    );
    fireEvent.click(getByTestId('approve-button'));

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'Solana account not available', id: 'req-siws-1' },
    });
    expect(onDismiss).toHaveBeenCalledWith(false);
    expect(mockApproveSolanaSignIn).not.toHaveBeenCalled();
  });

  it('approves via the shared sign-in path and returns the result payload', async () => {
    const sendMessage = stubChrome();
    const onDismiss = vi.fn();
    const payload = { account: { address: 'Address1' }, signedMessage: 'b64', signature: 'b64sig' };
    mockApproveSolanaSignIn.mockResolvedValue(payload);

    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(true));

    expect(mockApproveSolanaSignIn).toHaveBeenCalledWith(
      baseProps.account,
      signInInput,
      baseProps.origin
    );
    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { result: payload, id: 'req-siws-1' },
    });
  });

  it('sends only the fixed protocol string when sign-in fails, never the raw error', async () => {
    const sendMessage = stubChrome();
    const onDismiss = vi.fn();
    mockApproveSolanaSignIn.mockRejectedValue(new Error('some internal RPC detail'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(false));

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { error: 'Sign-in failed', id: 'req-siws-1' },
    });
    // The internal error detail must never leak to the dApp origin; it goes to the console.
    expect(JSON.stringify(sendMessage.mock.calls)).not.toContain('some internal RPC detail');
    expect(consoleError).toHaveBeenCalledWith('[dapp-approval]', expect.any(Error));
    consoleError.mockRestore();
  });
});

// FR-011–FR-013, FR-015: a standalone Sign-In With Solana is a signed message,
// counted once with no props and already on its way when the background hears
// the answer; nothing for a refusal, a guard error or a failed signature.
describe('DAppSignInApprovalPage analytics', () => {
  let analytics: Awaited<ReturnType<typeof startTestAnalytics>>;
  let atAnswer: SentEvent[][];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseDAppMetadata.mockReturnValue({ metadata: null });
    mockPrepareSignInMessage.mockReturnValue({
      fields: { domain: 'dapp.example' },
      message: 'dapp.example wants you to sign in',
      domainMismatch: false,
      addressMismatch: false,
    });
    analytics = await startTestAnalytics();
    atAnswer = [];
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(() => atAnswer.push(analytics.delivered())) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts an approved sign-in as a signed message before answering, with no props', async () => {
    mockApproveSolanaSignIn.mockResolvedValue({ signature: 'sig' });
    const onDismiss = vi.fn();

    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(true));

    expect(atAnswer).toEqual([[{ event: 'dapp_message_signed', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_message_signed', props: {} }]);
  });

  it('records nothing when the user rejects', async () => {
    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} />);
    fireEvent.click(getByTestId('reject-button'));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
  });

  it('records nothing when the approval is refused before signing', async () => {
    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} account={undefined} />);
    fireEvent.click(getByTestId('approve-button'));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
  });

  it('records nothing when signing fails', async () => {
    mockApproveSolanaSignIn.mockRejectedValue(new Error('rpc'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onDismiss = vi.fn();

    const { getByTestId } = render(<DAppSignInApprovalPage {...baseProps} onDismiss={onDismiss} />);
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith(false));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
    consoleError.mockRestore();
  });
});
