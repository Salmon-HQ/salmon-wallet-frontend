/**
 * The non-swap half of the transaction detail: the tokens that moved, and an
 * NFT's metadata when one of them is a collectible.
 *
 * A send, a receive, a mint and a burn are the same two lists with different
 * signs, so they are one file.
 */
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, iconSize } from '../../icons';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatRawAmount,
  lineHeight,
  s,
  semantic,
  spacing,
  tabularNums,
} from '@salmon/shared';

import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import { TokenLogo } from '../TokenLogo';
import type { NftAttribute, Transaction, TransactionTokenAmount } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so copy it once here.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/** The token mark in a moved-tokens row. */
const TOKEN_MARK_SIZE = 42;

const NFT_PREVIEW_SIZE = 120;

/**
 * One token that moved: mark, symbol over name, signed amount.
 */
const TokenAmountRow: React.FC<{ token: TransactionTokenAmount; sign: '+' | '-' }> = ({
  token,
  sign,
}) => (
  <View style={styles.tokenRow}>
    <TokenLogo uri={token.logo || undefined} symbol={token.symbol} size={TOKEN_MARK_SIZE} />
    <View style={styles.tokenInfo}>
      <Text style={styles.tokenSymbol} maxFontSizeMultiplier={fontScaleCap.dense}>
        {token.symbol}
      </Text>
      {token.name && (
        <Text style={styles.tokenName} numberOfLines={1} maxFontSizeMultiplier={fontScaleCap.dense}>
          {token.name}
        </Text>
      )}
    </View>
    <Text
      style={[
        styles.tokenAmount,
        { color: sign === '+' ? semantic.status.success : semantic.status.danger },
      ]}
      maxFontSizeMultiplier={fontScaleCap.dense}
    >
      {sign} {formatRawAmount(token.amount, token.decimals)}
    </Text>
  </View>
);

/**
 * One NFT trait, as a key/value pair inside the metadata card.
 */
const NftAttributeRow: React.FC<{ attribute: NftAttribute }> = ({ attribute }) => (
  <KeyValueRow label={attribute.trait_type} value={String(attribute.value)} labelWeight={600} />
);

const NftMetadataCard: React.FC<{ token: TransactionTokenAmount }> = ({ token }) => {
  const { t } = useTranslation();
  if (!token.isNft) return null;

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-nft">
      <Text style={styles.cardTitle}>{t('transactions.detail.nftDetails', 'NFT Details')}</Text>

      {token.nftMedia && (
        <View style={styles.nftMedia}>
          <Image
            source={{ uri: token.nftMedia }}
            style={styles.nftPreview}
            resizeMode="cover"
            accessibilityLabel={t('transactions.detail.nftMediaAlt', 'NFT media')}
          />
        </View>
      )}

      {token.nftCollection && (
        <View style={styles.collectionRow}>
          <KeyValueRow
            label={t('transactions.detail.collection', 'Collection')}
            value={token.nftCollection}
            labelWeight={600}
            style={styles.collectionValue}
          />
          {token.nftCollectionVerified && (
            <CheckCircleIcon size={iconSize.sm} color={semantic.status.success} />
          )}
        </View>
      )}

      {token.nftAttributes && token.nftAttributes.length > 0 && (
        <>
          <SectionLabel variant="caps">
            {t('transactions.detail.attributes', 'Attributes')}
          </SectionLabel>
          {token.nftAttributes.map((attribute, index) => (
            <NftAttributeRow key={`${attribute.trait_type}-${index}`} attribute={attribute} />
          ))}
        </>
      )}
    </Card>
  );
};

export interface TransactionDetailTransferProps {
  transaction: Transaction;
}

export const TransactionDetailTransfer: React.FC<TransactionDetailTransferProps> = ({
  transaction,
}) => {
  const { t } = useTranslation();
  const { inputs, outputs } = transaction;
  const nftTokens = [...inputs, ...outputs].filter((token) => token.isNft);

  return (
    <>
      {(outputs.length > 0 || inputs.length > 0) && (
        <Card padding="lg" gap={spacing.md} testID="tx-detail-tokens">
          {outputs.length > 0 && (
            <>
              <Text style={styles.cardTitle}>{t('transactions.detail.sentLabel', 'Sent')}</Text>
              {outputs.map((token, index) => (
                <TokenAmountRow key={`out-${index}`} token={token} sign="-" />
              ))}
            </>
          )}
          {outputs.length > 0 && inputs.length > 0 && <View style={styles.divider} />}
          {inputs.length > 0 && (
            <>
              <Text style={styles.cardTitle}>
                {t('transactions.detail.receivedLabel', 'Received')}
              </Text>
              {inputs.map((token, index) => (
                <TokenAmountRow key={`in-${index}`} token={token} sign="+" />
              ))}
            </>
          )}
        </Card>
      )}

      {nftTokens.map((token, index) => (
        <NftMetadataCard key={`nft-${index}`} token={token} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: s(fontSize.mono),
    lineHeight: s(fontSize.mono) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: semantic.border.hairline,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  tokenInfo: {
    flex: 1,
    minWidth: 0,
  },
  tokenSymbol: {
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  tokenName: {
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
  },
  tokenAmount: {
    fontSize: s(fontSize.bodyLg),
    lineHeight: s(fontSize.bodyLg) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    textAlign: 'right',
    ...TABULAR,
  },
  nftMedia: {
    alignItems: 'center',
  },
  nftPreview: {
    width: s(NFT_PREVIEW_SIZE),
    height: s(NFT_PREVIEW_SIZE),
    borderRadius: borderRadius.r3,
    backgroundColor: semantic.surface.raised,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  collectionValue: {
    flex: 1,
  },
});

export default TransactionDetailTransfer;
