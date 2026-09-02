/**
 * NftsTabHeader — the notices that can appear above the grid.
 *
 * There is no stack and no wrapper: a load failure, a partial load and an
 * empty answer are plain siblings of the grid's first
 * row, each carrying the component gap (20) only when it paints. A gapped
 * container around them (and the hidden heading that used to live in it) gave
 * the ordinary run — no banner, no error, no empty state — a reserved height,
 * so the first NFT row started a component gap lower than Portfolio's first
 * token card under the same sub-tab row (owner, on device).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamilyNative, fontSize, s, vs, spacing, type Semantic } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';

export interface NftsTabHeaderProps {
  loadError: boolean;
  partialLoad: boolean;
  isEmpty: boolean;
  onRetry: () => void;
}

export function NftsTabHeader({ loadError, partialLoad, isEmpty, onRetry }: NftsTabHeaderProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);

  return (
    <>
      {/* Load failure — explicit retry (pull-to-refresh also works). */}
      {loadError && (
        <View style={styles.seam}>
          <StateBlock
            tone="error"
            title={t('collectibles.load_error', "Your collectibles couldn't be loaded right now.")}
            onRetry={onRetry}
            retryLabel={t('actions.retry', 'Retry')}
            testID="collectibles-load-error"
            retryTestID="collectibles-retry-button"
          />
        </View>
      )}

      {/* A short list, not a failed one: the grid below is real, it is just
          missing whatever the failed page held. A warning over live content,
          so it stays a notice rather than a state. */}
      {!loadError && partialLoad && (
        <WarningNotice
          tone="warning"
          testID="collectibles-partial-load"
          style={styles.seam}
          title={t(
            'collectibles.partial_error',
            'Some of your collectibles could not be loaded. Pull to refresh to try again.'
          )}
          action={
            <Text
              accessibilityRole="button"
              onPress={onRetry}
              style={styles.partialRetry}
              testID="collectibles-partial-retry-button"
            >
              {t('actions.retry', 'Retry')}
            </Text>
          }
        />
      )}

      {isEmpty && (
        <View style={styles.seam}>
          <StateBlock
            tone="empty"
            title={t('nft.emptyTitle', 'No Collectibles')}
            body={t(
              'nft.emptySubtitle',
              'Your NFTs and Ordinals will appear here once you receive some'
            )}
            testID="collectibles-empty"
          />
        </View>
      )}
    </>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /** The component gap (20) to whatever follows — carried by the block itself. */
    seam: {
      marginBottom: vs(spacing.screenGutter),
    },
    partialRetry: {
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.body),
      color: t.accent.ink,
    },
  });
