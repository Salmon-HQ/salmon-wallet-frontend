/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUseDAppMetadata = vi.fn();

vi.mock('@salmon/shared', () => ({
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
    />
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
