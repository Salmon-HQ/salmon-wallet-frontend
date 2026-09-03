/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./useAvatarNfts', () => ({
  useAvatarNfts: ({ enabled }: { enabled: boolean }) => ({
    nfts: enabled ? [{ id: 'nft-1' }] : [],
    loading: false,
  }),
}));

import { useAvatarPicker } from './useAvatarPicker';

describe('useAvatarPicker', () => {
  it('saves only a changed selection, and asks for NFTs only on their tab', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAvatarPicker({ currentAvatarUrl: 'a.png', account: undefined, onSave })
    );
    expect(result.current.hasChanged).toBe(false);
    expect(result.current.nfts).toEqual([]);

    act(() => result.current.save());
    expect(onSave).not.toHaveBeenCalled();

    act(() => result.current.setActiveTab('nfts'));
    expect(result.current.nfts).toHaveLength(1);

    act(() => result.current.setSelectedUrl('b.png'));
    expect(result.current.hasChanged).toBe(true);
    act(() => result.current.save());
    expect(onSave).toHaveBeenCalledWith('b.png');
  });
});
