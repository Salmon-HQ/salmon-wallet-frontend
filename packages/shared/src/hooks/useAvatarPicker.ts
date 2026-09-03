/**
 * The avatar picker's state — presets or the wallet's NFTs, a selection, and
 * a save that only fires on a change. Both `AccountAvatarPanel`s draw it.
 */
import { useCallback, useState } from 'react';

import { useAvatarNfts } from './useAvatarNfts';

type AvatarAccount = Parameters<typeof useAvatarNfts>[0]['account'];

export type AvatarPickerTab = 'presets' | 'nfts';

export function useAvatarPicker({
  currentAvatarUrl,
  account,
  onSave,
}: {
  currentAvatarUrl?: string;
  account: AvatarAccount;
  onSave: (url: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<AvatarPickerTab>('presets');
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(currentAvatarUrl);

  // The NFT grid costs a request; it is fetched only once the tab is opened.
  const { nfts, loading: nftsLoading } = useAvatarNfts({
    account,
    enabled: activeTab === 'nfts',
  });

  const hasChanged = selectedUrl !== currentAvatarUrl;

  const save = useCallback(() => {
    if (selectedUrl && hasChanged) onSave(selectedUrl);
  }, [selectedUrl, hasChanged, onSave]);

  return {
    activeTab,
    setActiveTab,
    selectedUrl,
    setSelectedUrl,
    nfts,
    nftsLoading,
    hasChanged,
    save,
  };
}
