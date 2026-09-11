/**
 * MemoTab — the Memo Powerup's Home surface on mobile: the account's inputs
 * to the shared screen, nothing more.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAccountsContext } from '@salmon/shared';
import type { PowerupTabProps } from '../powerups';
import { StateBlock } from '../components';
import { MemoScreen } from '../components/MemoScreen';

export default function MemoTab({ onNavigateHome }: PowerupTabProps) {
  const { t } = useTranslation();
  const [{ ready, activeAccount, activeBlockchainAccount, networkId }] = useAccountsContext();

  if (!ready || !activeAccount || !activeBlockchainAccount) {
    return (
      <View style={styles.centered}>
        <StateBlock tone="empty" title={t('swap.errors.noAccount')} />
      </View>
    );
  }

  return (
    <MemoScreen
      publicKey={activeBlockchainAccount.getReceiveAddress()}
      networkId={networkId ?? null}
      onNavigateHome={onNavigateHome}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
});
