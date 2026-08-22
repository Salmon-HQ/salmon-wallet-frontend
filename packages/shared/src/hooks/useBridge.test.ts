/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/services/bridge', () => ({
  getBridgeEstimatedAmount: vi.fn(),
  getBridgeMinimalAmount: vi.fn(),
  getBridgeAvailableTokens: vi.fn(),
  createBridgeExchange: vi.fn(),
  getBridgeTransaction: vi.fn(),
}));

import { useBridge } from './useBridge';
import {
  getBridgeEstimatedAmount,
  getBridgeMinimalAmount,
  createBridgeExchange,
  getBridgeTransaction,
} from '../api/services/bridge';

const mockGetBridgeEstimatedAmount = vi.mocked(getBridgeEstimatedAmount);
const mockGetBridgeMinimalAmount = vi.mocked(getBridgeMinimalAmount);
const mockCreateBridgeExchange = vi.mocked(createBridgeExchange);
const mockGetBridgeTransaction = vi.mocked(getBridgeTransaction);

describe('useBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps estimate failures to a user friendly minimum amount message', async () => {
    mockGetBridgeEstimatedAmount.mockRejectedValueOnce(
      new Error('Bridge fetch estimated amount failed: amount less than minimal')
    );
    mockGetBridgeMinimalAmount.mockResolvedValueOnce({ min: 0.75, max: null });

    const { result } = renderHook(() => useBridge());

    let caughtError: unknown = null;
    await act(async () => {
      try {
        await result.current.getEstimate('sol', 'eth', 0.5);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('Minimum bridge amount is 0.75 SOL');

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Minimum bridge amount is 0.75 SOL');
    });
  });

  it('stores a successful estimate even if minimum amount lookup fails', async () => {
    mockGetBridgeEstimatedAmount.mockResolvedValueOnce(1.23 as any);
    mockGetBridgeMinimalAmount.mockRejectedValueOnce(new Error('min unavailable'));

    const { result } = renderHook(() => useBridge());

    let estimate;
    await act(async () => {
      estimate = await result.current.getEstimate('sol', 'eth', 1);
    });

    expect(estimate).toEqual({
      estimatedAmount: 1.23,
      minAmount: 0,
      maxAmount: null,
      symbolIn: 'sol',
      symbolOut: 'eth',
    });
    expect(result.current.estimate).toEqual(estimate);
    expect(result.current.status).toBe('idle');
  });

  it('propagates the pair maximum through the estimate', async () => {
    mockGetBridgeEstimatedAmount.mockResolvedValueOnce(1.23 as any);
    mockGetBridgeMinimalAmount.mockResolvedValueOnce({ min: 0.1, max: 250 });

    const { result } = renderHook(() => useBridge());

    let estimate;
    await act(async () => {
      estimate = await result.current.getEstimate('sol', 'eth', 1);
    });

    expect(estimate).toEqual({
      estimatedAmount: 1.23,
      minAmount: 0.1,
      maxAmount: 250,
      symbolIn: 'sol',
      symbolOut: 'eth',
    });
  });

  it('maps estimate failures above the pair maximum to the aboveMaximum key', async () => {
    mockGetBridgeEstimatedAmount.mockRejectedValueOnce(
      new Error('Bridge fetch estimated amount failed: amount is too large')
    );
    mockGetBridgeMinimalAmount.mockResolvedValueOnce({ min: 0.1, max: 250 });

    const { result } = renderHook(() => useBridge());

    let caughtError: unknown = null;
    await act(async () => {
      try {
        await result.current.getEstimate('sol', 'eth', 500);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('bridge.errors.aboveMaximum');

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('bridge.errors.aboveMaximum');
    });
  });

  it('maps a no-route rejection to the pair-unavailable key', async () => {
    mockGetBridgeEstimatedAmount.mockRejectedValueOnce(
      new Error('Bridge fetch estimated amount failed: No exchange route available')
    );
    mockGetBridgeMinimalAmount.mockResolvedValueOnce({ min: 0.1, max: null });

    const { result } = renderHook(() => useBridge());

    let caughtError: unknown = null;
    await act(async () => {
      try {
        await result.current.getEstimate('btc', 'pump', 0.5);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('bridge.errors.pairUnavailable');

    await waitFor(() => {
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('bridge.errors.pairUnavailable');
    });
  });

  it('creates exchanges and exposes exchange-created state', async () => {
    mockCreateBridgeExchange.mockResolvedValueOnce({
      id: 'bridge-1',
      currencyFrom: 'sol',
      currencyTo: 'eth',
      amountExpectedFrom: 1,
      amountExpectedTo: 0.01,
      payinAddress: 'deposit-address',
      payoutAddress: '0xrecipient',
      status: 'waiting',
    } as any);

    const { result } = renderHook(() => useBridge());

    await act(async () => {
      await result.current.createExchange('sol', 'eth', 1, '0xrecipient');
    });

    expect(result.current.exchange?.id).toBe('bridge-1');
    expect(result.current.status).toBe('exchange-created');
  });

  it('tracks bridge transaction success and reset clears state', async () => {
    mockGetBridgeTransaction.mockResolvedValueOnce({
      id: 'bridge-1',
      currencyFrom: 'sol',
      currencyTo: 'eth',
      payinAddress: 'deposit',
      payoutAddress: '0xrecipient',
      status: 'success',
    } as any);

    const { result } = renderHook(() => useBridge());

    await act(async () => {
      await result.current.getTransactionStatus('bridge-1');
    });

    expect(result.current.transaction?.status).toBe('success');
    expect(result.current.status).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.transaction).toBeNull();
    expect(result.current.exchange).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
