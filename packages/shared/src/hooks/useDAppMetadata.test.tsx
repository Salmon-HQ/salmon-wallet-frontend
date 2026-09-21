/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, QueryWrapper } from '../test-utils/query-wrapper';

vi.mock('../api/services', () => ({
  getDappMetadata: vi.fn(),
}));

let consent = true;
vi.mock('../analytics/client', () => ({
  getAnalytics: () => ({ getConsent: () => consent }),
}));

import { getDappMetadata } from '../api/services';
import { useDAppMetadata } from './useDAppMetadata';

const mockGetDappMetadata = vi.mocked(getDappMetadata);

function wrapWithClient() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('useDAppMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consent = true;
  });

  it('loads metadata for a valid origin', async () => {
    mockGetDappMetadata.mockResolvedValueOnce({
      name: 'Raydium',
      icon: 'https://raydium.io/icon.png',
    });

    const { result } = renderHook(() => useDAppMetadata('https://raydium.io'), {
      wrapper: wrapWithClient(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetDappMetadata).toHaveBeenCalledWith('https://raydium.io');
    expect(result.current.metadata).toEqual({
      name: 'Raydium',
      icon: 'https://raydium.io/icon.png',
    });
  });

  it('skips loading when origin is empty', () => {
    const { result } = renderHook(() => useDAppMetadata(''), { wrapper: wrapWithClient() });

    expect(mockGetDappMetadata).not.toHaveBeenCalled();
    expect(result.current.metadata).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  // Asking for the name sends the origin to salmon-api — one request per site
  // the user visits, which is their browsing history, beside requests that
  // carry their wallet address.
  it('does not send the origin anywhere when the user declined analytics', () => {
    consent = false;

    const { result } = renderHook(() => useDAppMetadata('https://raydium.io'), {
      wrapper: wrapWithClient(),
    });

    expect(mockGetDappMetadata).not.toHaveBeenCalled();
    // The approval row falls back to the origin and the globe, as it already
    // does for a site with no metadata.
    expect(result.current.metadata).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('falls back to null metadata when the request fails', async () => {
    mockGetDappMetadata.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useDAppMetadata('https://raydium.io'), {
      wrapper: wrapWithClient(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metadata).toBeNull();
  });
});
