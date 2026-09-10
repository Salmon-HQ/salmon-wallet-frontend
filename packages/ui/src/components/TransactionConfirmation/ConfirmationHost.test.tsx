/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';

const mockHost = {
  request: null as null | { proposal: { display: Record<string, unknown> }; phase: string; error: null },
  refreshing: false,
  confirmLabel: 'Confirm (10)',
  confirmOrRefresh: vi.fn(),
  cancel: vi.fn(),
};

vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  useSignatureRequestHost: () => mockHost,
}));
vi.mock('../../contexts/TaskChromeContext', () => ({ useTaskChromeClaim: () => vi.fn() }));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));
vi.mock('../LoadingScreen', () => ({
  LoadingScreen: ({ visible, onExited }: { visible?: boolean; onExited?: () => void }) => {
    React.useEffect(() => {
      if (!visible) onExited?.();
    }, [visible, onExited]);
    return <div data-testid="confirmation-wave" data-visible={String(visible)} />;
  },
}));
vi.mock('./TransactionConfirmation', () => ({
  TransactionConfirmation: ({
    onBack,
    onConfirm,
    confirmLabel,
  }: {
    onBack: () => void;
    onConfirm: () => void;
    confirmLabel: string;
  }) => (
    <div data-testid="transaction-confirmation" data-label={confirmLabel}>
      <button type="button" data-testid="stub-back" onClick={onBack} />
      <button type="button" data-testid="stub-confirm" onClick={onConfirm} />
    </div>
  ),
}));

import { ConfirmationHost } from './ConfirmationHost';

const proposal = { display: { title: 'Swap Review', pendingTitle: 'Processing swap' } };

describe('ConfirmationHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHost.request = null;
  });
  afterEach(cleanup);

  it('draws nothing while no proposal is parked', () => {
    renderInMode('dark', <ConfirmationHost />);
    expect(screen.queryByTestId('confirmation-window')).toBeNull();
  });

  it('covers the panel with the confirmation and wires the controls to core', () => {
    mockHost.request = { proposal, phase: 'review', error: null };
    renderInMode('dark', <ConfirmationHost />);
    const window = screen.getByTestId('confirmation-window');
    expect(window.getAttribute('role')).toBe('dialog');
    expect(screen.getByTestId('transaction-confirmation').getAttribute('data-label')).toBe(
      'Confirm (10)'
    );
    fireEvent.click(screen.getByTestId('stub-confirm'));
    fireEvent.click(screen.getByTestId('stub-back'));
    expect(mockHost.confirmOrRefresh).toHaveBeenCalledTimes(1);
    expect(mockHost.cancel).toHaveBeenCalledTimes(1);
  });

  it('replaces the confirmation with the wave while core signs', () => {
    mockHost.request = { proposal, phase: 'signing', error: null };
    renderInMode('dark', <ConfirmationHost />);
    expect(screen.queryByTestId('transaction-confirmation')).toBeNull();
    expect(screen.getByTestId('confirmation-wave').getAttribute('data-visible')).toBe('true');
  });

  it('holds the cover until the wave has left, then removes it', () => {
    mockHost.request = { proposal, phase: 'signing', error: null };
    const view = renderInMode('dark', <ConfirmationHost />);
    expect(screen.getByTestId('confirmation-window')).toBeTruthy();
    mockHost.request = null;
    view.rerender(
      <React.Fragment>
        <ConfirmationHost />
      </React.Fragment>
    );
    expect(screen.queryByTestId('confirmation-window')).toBeNull();
  });
});
