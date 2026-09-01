/**
 * NftsTabHeader — everything above the grid, in one stack.
 *
 * The host's balance block, the developer-mode banner, a load failure, a
 * partial load, an empty answer: siblings on the same surface, so they sit
 * the component gap (20) apart (DESIGN.md §Layout). It is the `SectionList`'s
 * `ListHeaderComponent`, which is why the balance scrolls away with the grid.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamilyNative, fontSize, s, semantic, spacing, vs } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { StateBlock } from '../StateBlock';
import { WarningNotice } from '../WarningNotice';
import { CodeIcon, iconSize } from '../../icons';

export interface NftsTabHeaderProps {
  /** The host's own block (Home's balance), first in the stack. */
  listHeader?: ReactNode;
  developerMode: boolean;
  loadError: boolean;
  partialLoad: boolean;
  isEmpty: boolean;
  onRetry: () => void;
}

export function NftsTabHeader({
  listHeader,
  developerMode,
  loadError,
  partialLoad,
  isEmpty,
  onRetry,
}: NftsTabHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.blocks}>
      {/* Home's balance block on the NFTs sub-tab. It is the list's header
          rather than a pinned sibling, so it scrolls away with the grid while
          the sub-tab row above stays reachable — and the grid keeps being the
          screen's only scroll view. */}
      {listHeader}

      {/* The visible "My Collectibles" heading sat directly under the
          Collectibles tab, repeating a label the user had just tapped. It is
          not deleted, only unpainted: React Native has no DOM and therefore no
          `visuallyHidden` clip rectangle, so the platform equivalent is a 1x1
          transparent node that stays in the accessibility tree with
          `accessibilityRole="header"`. Screen-reader users keep a heading to
          orient by; the eye gets ~78px of vertical chrome back. Zero width or
          `display: none` would drop it from the tree on Android, which is why
          the box is 1x1 rather than 0x0. */}
      <Text
        style={styles.assistiveHeading}
        accessibilityRole="header"
        importantForAccessibility="yes"
      >
        {t('wallet.my_nfts', 'My Collectibles')}
      </Text>

      {developerMode && (
        <Card tone="accent" padding="md" radius="lg" style={styles.devBanner}>
          <IconBubble
            size={36}
            shape="rounded"
            radius="lg"
            tone="accent-tint"
            icon={CodeIcon}
            iconSize={iconSize.md}
          />
          <Text style={styles.devBannerText}>
            {t('collectibles.developer_banner', 'Developer Mode - Showing testnet NFTs')}
          </Text>
        </Card>
      )}

      {/* Load failure — explicit retry (pull-to-refresh also works). */}
      {loadError && (
        <StateBlock
          tone="error"
          title={t('collectibles.load_error', "Your collectibles couldn't be loaded right now.")}
          onRetry={onRetry}
          retryLabel={t('actions.retry', 'Retry')}
          testID="collectibles-load-error"
          retryTestID="collectibles-retry-button"
        />
      )}

      {/* A short list, not a failed one: the grid below is real, it is just
          missing whatever the failed page held. A warning over live content,
          so it stays a notice rather than a state. */}
      {!loadError && partialLoad && (
        <WarningNotice
          tone="warning"
          testID="collectibles-partial-load"
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
        <StateBlock
          tone="empty"
          title={t('nft.emptyTitle', 'No Collectibles')}
          body={t(
            'nft.emptySubtitle',
            'Your NFTs and Ordinals will appear here once you receive some'
          )}
          testID="collectibles-empty"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: {
    gap: vs(spacing.screenGutter),
    marginBottom: vs(spacing.screenGutter),
  },
  /** Present to assistive tech, absent to the eye. See the render comment. */
  assistiveHeading: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  devBannerText: {
    flex: 1,
    fontFamily: fontFamilyNative.medium,
    fontSize: s(fontSize.body),
    color: semantic.accent.ink,
  },
  partialRetry: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: s(fontSize.body),
    color: semantic.accent.ink,
  },
});
