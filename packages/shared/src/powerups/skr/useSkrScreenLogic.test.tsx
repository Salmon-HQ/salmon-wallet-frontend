/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../../api/services/staking', () => ({ getSkrStake: vi.fn(), getStakeAccounts: vi.fn() }));
vi.mock('../../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: 'usd' },
    { formatValue: (v: number) => `$${v.toFixed(2)}` },
  ],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

import { getSkrStake } from '../../api/services/staking';
import { createTestQueryClient, QueryWrapper } from '../../test-utils/query-wrapper';
import { useSkrScreenLogic } from './useSkrScreenLogic';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryWrapper client={createTestQueryClient()}>{children}</QueryWrapper>
);
const base = {
  mint: 'SKR',
  decimals: 6,
  sharePrice: '1000000000',
  cooldownSeconds: 172800,
  apy: null,
  usdPrice: null,
  liquid: '0',
  positions: [],
};

beforeEach(() => vi.clearAllMocks());

describe('useSkrScreenLogic', () => {
  it('is ready with the facts once the position arrives', async () => {
    vi.mocked(getSkrStake).mockResolvedValue({ ...base, liquid: '1000000' });

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.summary[0]).toMatchObject({ key: 'liquid', value: '1 SKR' });
  });

  it('is empty without any SKR', async () => {
    vi.mocked(getSkrStake).mockResolvedValue(base);

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('empty'));
  });

  it('is an error when the read fails', async () => {
    vi.mocked(getSkrStake).mockRejectedValue(new Error('503'));

    const { result } = renderHook(() => useSkrScreenLogic({ publicKey: 'Owner' }), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('error'));
  });
});
