/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountsContext } from '../contexts/AccountsContext';
import { useCheckDerivables } from './useCheckDerivables';
import { useDerivedAccountsScan } from './useDerivedAccountsScan';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('./useDerivedAccountsScan', () => ({ useDerivedAccountsScan: vi.fn() }));

const accountsMock = vi.mocked(useAccountsContext);
const scanMock = vi.mocked(useDerivedAccountsScan);
const rescan = vi.fn(async () => {});

const scanState = (over: Partial<ReturnType<typeof useDerivedAccountsScan>> = {}) =>
  ({
    scanningAccountId: null,
    rescanningAccountId: null,
    sheetVisible: false,
    sheetRequested: false,
    finds: [],
    rescan,
    importFinds: vi.fn(),
    dismiss: vi.fn(),
    ...over,
  }) as ReturnType<typeof useDerivedAccountsScan>;

beforeEach(() => {
  vi.clearAllMocks();
  accountsMock.mockReturnValue([{ activeAccount: { id: 'w1' } }, {}] as unknown as ReturnType<
    typeof useAccountsContext
  >);
  scanMock.mockReturnValue(scanState());
});

describe('useCheckDerivables', () => {
  it('mounts the scan with the automatic pass off', () => {
    renderHook(() => useCheckDerivables());
    expect(scanMock).toHaveBeenCalledWith({ automatic: false });
  });

  it('checks the active wallet, and nothing without one', () => {
    const { result } = renderHook(() => useCheckDerivables());
    act(() => result.current.check());
    expect(rescan).toHaveBeenCalledWith('w1');

    accountsMock.mockReturnValue([{ activeAccount: null }, {}] as unknown as ReturnType<
      typeof useAccountsContext
    >);
    const { result: without } = renderHook(() => useCheckDerivables());
    act(() => without.current.check());
    expect(rescan).toHaveBeenCalledTimes(1);
  });

  it('keeps the sheet up for the wait and for the answer', () => {
    scanMock.mockReturnValue(scanState({ rescanningAccountId: 'w1' }));
    const { result, rerender } = renderHook(() => useCheckDerivables());
    expect(result.current.scanning).toBe(true);
    expect(result.current.sheet).toMatchObject({ visible: true, scanning: true });

    scanMock.mockReturnValue(scanState({ sheetVisible: true, sheetRequested: true }));
    rerender();
    expect(result.current.scanning).toBe(false);
    expect(result.current.sheet).toMatchObject({ visible: true, scanning: false });
  });
});
