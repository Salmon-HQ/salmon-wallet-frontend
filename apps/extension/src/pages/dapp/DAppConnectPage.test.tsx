/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { startTestAnalytics, type SentEvent } from '@salmon/shared/test-utils/analytics';

const mockUseDAppMetadata = vi.fn();

vi.mock('@salmon/shared', async () => ({
  // The real analytics client: the test reads what leaves the window.
  ...(await vi.importActual<object>('@salmon/shared/analytics')),
  useDAppMetadata: (origin: string) => mockUseDAppMetadata(origin),
}));

vi.mock('@salmon/ui', () => ({
  DAppConnectApprovalView: (props: Record<string, unknown>) => (
    <div
      data-testid="dapp-connect-view"
      data-app-name={String(props.appName ?? '')}
      data-app-icon={String(props.appIcon ?? '')}
      data-origin={String(props.origin ?? '')}
      data-address={String(props.address ?? '')}
      data-disabled={String(props.disabled ?? '')}
    >
      <button type="button" data-testid="approve-button" onClick={props.onApprove as () => void} />
      <button type="button" data-testid="reject-button" onClick={props.onReject as () => void} />
    </div>
  ),
}));

import { DAppConnectPage } from './DAppConnectPage';
import type { DAppConnectRequest } from '@salmon/shared';

const baseRequest: DAppConnectRequest = {
  id: 'req-1',
  method: 'connect',
  params: {},
} as unknown as DAppConnectRequest;

const baseProps = {
  origin: 'https://dapp.example',
  request: baseRequest,
  address: 'Sol1111111111111111111111111111111111111111',
  networkId: 'solana-mainnet',
  onApprove: vi.fn(),
  onDeny: vi.fn(),
  onDismiss: vi.fn(),
};

describe('DAppConnectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the approval view with dApp metadata when available', () => {
    mockUseDAppMetadata.mockReturnValue({
      metadata: { name: 'Example dApp', icon: 'https://dapp.example/icon.png' },
    });

    const { getByTestId } = render(<DAppConnectPage {...baseProps} />);

    const view = getByTestId('dapp-connect-view');
    expect(view.dataset.appName).toBe('Example dApp');
    expect(view.dataset.appIcon).toBe('https://dapp.example/icon.png');
    expect(view.dataset.origin).toBe(baseProps.origin);
    expect(view.dataset.address).toBe(baseProps.address);
    expect(view.dataset.disabled).toBe('false');
  });

  it('renders without throwing when metadata is null', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });

    const { getByTestId } = render(<DAppConnectPage {...baseProps} />);

    const view = getByTestId('dapp-connect-view');
    expect(view.dataset.appName).toBe('');
    expect(view.dataset.appIcon).toBe('');
  });

  it('disables the approval view when no address or networkId is available', () => {
    mockUseDAppMetadata.mockReturnValue({ metadata: null });

    const { getByTestId } = render(<DAppConnectPage {...baseProps} address="" networkId={null} />);

    expect(getByTestId('dapp-connect-view').dataset.disabled).toBe('true');
  });
});

// FR-011–FR-013, FR-015: one prop-less event per granted connection, already on
// its way when the background hears the answer (it closes this window on it);
// nothing for a denial or a grant that failed.
describe('DAppConnectPage analytics', () => {
  let analytics: Awaited<ReturnType<typeof startTestAnalytics>>;
  let atAnswer: SentEvent[][];
  let sendMessage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseDAppMetadata.mockReturnValue({
      metadata: { name: 'Example dApp', icon: 'https://dapp.example/icon.png' },
    });
    analytics = await startTestAnalytics();
    atAnswer = [];
    sendMessage = vi.fn(() => atAnswer.push(analytics.delivered()));
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts an approved connection before answering, with no props', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppConnectPage {...baseProps} onApprove={onApprove} onDismiss={onDismiss} />
    );
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalled());

    expect(sendMessage).toHaveBeenCalledWith({
      channel: 'salmon_extension_background_channel',
      data: { method: 'connected', params: { publicKey: baseProps.address }, id: 'req-1' },
    });
    expect(atAnswer).toEqual([[{ event: 'dapp_connected', props: {} }]]);
    expect(await analytics.sent()).toEqual([{ event: 'dapp_connected', props: {} }]);
  });

  it('records nothing when the user denies', async () => {
    const { getByTestId } = render(<DAppConnectPage {...baseProps} />);
    fireEvent.click(getByTestId('reject-button'));

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
  });

  it('records nothing when the connection could not be granted', async () => {
    const onApprove = vi.fn().mockRejectedValue(new Error('storage'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onDismiss = vi.fn();

    const { getByTestId } = render(
      <DAppConnectPage {...baseProps} onApprove={onApprove} onDismiss={onDismiss} />
    );
    fireEvent.click(getByTestId('approve-button'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalled());

    expect(atAnswer).toEqual([[]]);
    expect(await analytics.sent()).toEqual([]);
    consoleError.mockRestore();
  });
});
