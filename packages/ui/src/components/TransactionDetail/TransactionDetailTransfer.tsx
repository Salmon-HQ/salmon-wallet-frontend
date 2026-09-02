/**
 * The non-swap half of the transaction detail: the tokens that moved, and an
 * NFT's metadata when one of them is a collectible.
 *
 * The mobile twin is
 * `apps/mobile/src/components/TransactionDetail/TransactionDetailTransfer.tsx`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  formatRawAmount,
  lineHeight,
  spacing,
  tabularNums,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import { TokenLogo } from '../TokenList/TokenLogo';
import { cardTitleStyle, dividerStyle } from './detailStyles';
import type { NftAttribute, Transaction, TransactionTokenAmount } from './types';

/** The token mark in a moved-tokens row. */
const TOKEN_MARK_SIZE = 42;

const NFT_PREVIEW_SIZE = 120;

/** One token that moved: mark, symbol over name, signed amount. */
function TokenAmountRow({ token, sign }: { token: TransactionTokenAmount; sign: '+' | '-' }) {
  const t = useSemantic();
  return (
    <div
      data-testid="tx-detail-token-row"
      style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}
    >
      <TokenLogo
        uri={token.logo || undefined}
        symbol={token.symbol}
        size={TOKEN_MARK_SIZE}
        borderRadius={borderRadius.full}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.body,
            lineHeight: `${fontSize.body * lineHeight.snug}px`,
            fontWeight: fontWeight.bold,
            color: t.text.primary,
          }}
        >
          {token.symbol}
        </div>
        {token.name && (
          <div
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.caption,
              lineHeight: `${fontSize.caption * lineHeight.snug}px`,
              fontWeight: fontWeight.medium,
              color: t.text.secondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {token.name}
          </div>
        )}
      </div>
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.bodyLg,
          lineHeight: `${fontSize.bodyLg * lineHeight.snug}px`,
          fontWeight: fontWeight.bold,
          textAlign: 'right',
          whiteSpace: 'nowrap',
          color: sign === '+' ? t.status.success : t.status.danger,
          ...tabularNums.css,
        }}
      >
        {sign} {formatRawAmount(token.amount, token.decimals)}
      </span>
    </div>
  );
}

/** One NFT trait, as a key/value pair inside the metadata card. */
function NftAttributeRow({ attribute }: { attribute: NftAttribute }) {
  return (
    <KeyValueRow label={attribute.trait_type} value={String(attribute.value)} labelWeight={600} />
  );
}

function NftMetadataCard({ token }: { token: TransactionTokenAmount }) {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  if (!token.isNft) return null;

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-nft">
      <h3 style={cardTitleStyle(t)}>
        {translate('transactions.detail.nftDetails', 'NFT Details')}
      </h3>

      {token.nftMedia && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            src={token.nftMedia}
            alt={translate('transactions.detail.nftMediaAlt', 'NFT media')}
            style={{
              width: NFT_PREVIEW_SIZE,
              height: NFT_PREVIEW_SIZE,
              borderRadius: borderRadius.r3,
              backgroundColor: t.surface.raised,
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {token.nftCollection && (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <KeyValueRow
            label={translate('transactions.detail.collection', 'Collection')}
            value={token.nftCollection}
            labelWeight={600}
            style={{ flex: 1 }}
          />
          {token.nftCollectionVerified && (
            <CheckCircleIcon size={iconSize.sm} color={t.status.success} />
          )}
        </div>
      )}

      {token.nftAttributes && token.nftAttributes.length > 0 && (
        <>
          <SectionLabel variant="caps">
            {translate('transactions.detail.attributes', 'Attributes')}
          </SectionLabel>
          {token.nftAttributes.map((attribute, index) => (
            <NftAttributeRow key={`${attribute.trait_type}-${index}`} attribute={attribute} />
          ))}
        </>
      )}
    </Card>
  );
}

export interface TransactionDetailTransferProps {
  transaction: Transaction;
}

export function TransactionDetailTransfer({ transaction }: TransactionDetailTransferProps) {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  const { inputs, outputs } = transaction;
  const nftTokens = [...inputs, ...outputs].filter((token) => token.isNft);

  return (
    <>
      {(outputs.length > 0 || inputs.length > 0) && (
        <Card padding="lg" gap={spacing.md} testID="tx-detail-tokens">
          {outputs.length > 0 && (
            <>
              <h3 style={cardTitleStyle(t)}>
                {translate('transactions.detail.sentLabel', 'Sent')}
              </h3>
              {outputs.map((token, index) => (
                <TokenAmountRow key={`out-${index}`} token={token} sign="-" />
              ))}
            </>
          )}
          {outputs.length > 0 && inputs.length > 0 && <div style={dividerStyle(t)} />}
          {inputs.length > 0 && (
            <>
              <h3 style={cardTitleStyle(t)}>
                {translate('transactions.detail.receivedLabel', 'Received')}
              </h3>
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
}
