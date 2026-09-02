/**
 * NftSectionHeader — a chain section's heading inside the NFTs grid.
 *
 * The chain label only paints when there is more than one section (mainnet
 * plus devnet), because a lone "Solana" over the only grid on screen labels
 * nothing. What always paints is the sub-account selector, and — while the
 * section loads — the skeleton grid at the grid's own geometry.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fontFamilyNative, fontSize, s, spacing, vs, type Semantic } from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { NftCardSkeleton } from '../NftCard';
import { SectionLabel } from '../SectionLabel';
import { SubAccountSelector, type SubAccount } from '../SubAccountSelector';

export interface NftSectionHeaderProps {
  /** The chain heading. Absent ⇒ this is the only section, so it is not drawn. */
  title?: string;
  count: number;
  loading: boolean;
  subAccounts: SubAccount[];
  activeIndex: number;
  onSelectSubAccount: (index: number) => void;
  /** Row keys for the placeholder grid, so the count stays the tab's decision. */
  skeletonRows: readonly string[];
  rowStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
}

export function NftSectionHeader({
  title,
  count,
  loading,
  subAccounts,
  activeIndex,
  onSelectSubAccount,
  skeletonRows,
  rowStyle,
  cardStyle,
}: NftSectionHeaderProps) {
  const styles = useThemedStyles(stylesFor);

  // On the ordinary run there is no title (one chain), no choice of derived
  // account and no skeleton — the block draws nothing, and a block that draws
  // nothing must take no height: with the seam still applied the grid's first
  // row started a component gap lower than the token list's first card under
  // the same sub-tab row (owner, on device).
  // `subAccounts.length > 1` is `SubAccountSelector`'s own guard: one derived
  // account is not a choice, so the row renders nothing.
  const paints = !!title || subAccounts.length > 1 || loading;

  return (
    <View style={paints ? styles.block : undefined}>
      {!!title && (
        <View style={styles.heading}>
          <SectionLabel variant="group">{title}</SectionLabel>
          <Text style={styles.count}>({count})</Text>
        </View>
      )}

      <SubAccountSelector
        accounts={subAccounts}
        activeIndex={activeIndex}
        onSelect={onSelectSubAccount}
        // The Home shell owns the screen gutter for the whole tab; the
        // selector's own inset would be a second one.
        style={styles.selector}
      />

      {loading && (
        // Four lonely cards read as an empty grid that finished loading, and
        // the shimmer alone is too quiet against this palette to say
        // otherwise. The skeletons fill the fold so the screen looks like a
        // grid arriving rather than a grid that is over.
        <View testID="collectibles-loading">
          {skeletonRows.map((rowKey) => (
            <View key={rowKey} style={rowStyle}>
              <NftCardSkeleton style={cardStyle} />
              <NftCardSkeleton style={cardStyle} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /** The heading, the selector and the skeletons are one composed block; the
        component gap separates it from the grid below. Applied only when the
        block has something in it — see `paints`. */
    block: {
      gap: vs(spacing.md),
      marginBottom: vs(spacing.screenGutter),
    },
    selector: {
      paddingHorizontal: 0,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    count: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      color: t.text.tertiary,
    },
  });
