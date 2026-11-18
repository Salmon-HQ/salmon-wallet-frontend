/**
 * UpdateRequiredScreen - full-screen blocking state shown when the installed
 * build is older than the minimum the team publishes for the store.
 *
 * Rendered by the root layout INSTEAD of the navigator, before any route or
 * lock screen: an unsupported build is not opened at all. The one action
 * opens the store listing; there is no way past this screen inside the app,
 * which is the point. Mobile-only — the browser store updates the extension
 * itself (see `scripts/check-dom-parity.mjs`, MOBILE_ONLY).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Semantic } from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { blockingScreenStyles } from '../../theme/blockingScreenStyles';
import type { UpdateRequiredScreenProps } from './types';

export type { UpdateRequiredScreenProps };

export function UpdateRequiredScreen({
  onOpenStore,
}: UpdateRequiredScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);

  return (
    <View style={styles.container} testID="update-required">
      <Text style={styles.title}>{t('updates.required_title', 'Update Salmon to continue')}</Text>
      <Text style={styles.body}>
        {t(
          'updates.required_body',
          'This version is no longer supported. Your accounts and funds are safe; install the latest version from the store to keep using the wallet.'
        )}
      </Text>
      {/* The screen's committing action is the shared button, as on the
          wallet-init gate. Height is the only override. */}
      <PrimaryButton
        style={styles.action}
        onPress={onOpenStore}
        testID="update-required-open-store"
      >
        {t('updates.open_store', 'Open the store')}
      </PrimaryButton>
    </View>
  );
}

const stylesFor = (t: Semantic) => StyleSheet.create(blockingScreenStyles(t));
