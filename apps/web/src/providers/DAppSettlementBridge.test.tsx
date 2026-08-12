/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAppSettlementBridge } from './DAppSettlementBridge';

const mockSettleAfterTx = vi.fn();
const mockUnsubscribe = vi.fn();
let settlementCallback:
  ((request: { accountId: string; networkId?: string; kinds: string[] }) => void) | null = null;

vi.mock('@salmon/shared', () => ({
  useSettleAfterTx: () => mockSettleAfterTx,
}));

vi.mock('../utils/walletBridge', () => ({
  onSettlementRequest: (callback: typeof settlementCallback) => {
    settlementCallback = callback;
    return mockUnsubscribe;
  },
}));

describe('DAppSettlementBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettleAfterTx.mockResolvedValue(undefined);
    settlementCallback = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('settles balances and transactions from web dApp approval messages', async () => {
    render(<DAppSettlementBridge />);

    expect(settlementCallback).toBeTypeOf('function');
    settlementCallback?.({
      accountId: 'account-address',
      networkId: 'solana-mainnet',
      kinds: ['balance', 'transactions'],
    });

    await waitFor(() => {
      expect(mockSettleAfterTx).toHaveBeenCalledWith({
        accountId: 'account-address',
        networkId: 'solana-mainnet',
        kinds: ['balance', 'transactions'],
      });
    });
  });

  it('unsubscribes from the bridge on unmount', () => {
    const result = render(<DAppSettlementBridge />);

    result.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
