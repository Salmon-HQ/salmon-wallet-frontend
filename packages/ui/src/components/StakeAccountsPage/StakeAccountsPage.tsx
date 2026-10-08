/**
 * StakeAccountsPage — what Assets' "Staked SOL" row opens on the DOM
 * (spec 038). Mobile twin: the route `apps/mobile/app/(app)/staking.tsx`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { stakeAccountsBlocks } from '@salmon/shared';

import { BlockList } from '../BlockList';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { StakeAccountsPageProps } from './types';

export function StakeAccountsPage({ onBack, state, cards, onRetry }: StakeAccountsPageProps) {
  const { t } = useTranslation();
  return (
    <SettingsPanelContent
      testID="staking-screen"
      title={t('staking.detail.title')}
      subtitle={t('staking.detail.subtitle')}
      onBack={onBack}
    >
      <BlockList
        testID="stake-accounts"
        blocks={stakeAccountsBlocks({ state, cards, onRetry }, t)}
      />
    </SettingsPanelContent>
  );
}
