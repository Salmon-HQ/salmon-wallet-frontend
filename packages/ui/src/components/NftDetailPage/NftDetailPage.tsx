/**
 * NftDetailPage — a collectible's detail, on the DOM.
 *
 * The mobile twin is the route stack `apps/mobile/app/(app)/nft/[id]`:
 * `index.tsx` (the detail), `burn.tsx` (the review) and `success.tsx` (the
 * receipt). The host drives which of the three shows through `burnStep`, and
 * each one keeps its mobile anatomy — CORE 02's skeleton applied to a
 * collectible: the kit header with the description as its subtitle, the hero,
 * a stack of cards 20 apart, the actions on the bottom band.
 *
 * The two actions keep the sheet's rules exactly. A watch-only wallet can
 * never sign, so both are **gone, not greyed** — a disabled control would be a
 * promise the wallet cannot keep.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  formatRawAmount,
  getSatRarityColor,
  getShortAddress,
  isBitcoinNft,
  isSolanaNft,
  lineHeight,
  spacing,
  trackEvent,
  useCopyFeedback,
  type NftAttribute,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, CopyIcon, FireIcon, iconSize } from '../../icons';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { CopyTick } from '../CopyTick';
import { DepthBackground } from '../DepthBackground';
import { KeyValueRow } from '../KeyValueRow';
import { ReceiptScreen } from '../ReceiptScreen';
import { ScalesBackground } from '../ScalesBackground';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { NftDetailPageProps } from './types';

/** SOL's decimals — what the lookup table's rent estimate is denominated in. */
const LAMPORT_DECIMALS = 9;

export function NftDetailPage({
  nft,
  onBack,
  onSendPress,
  onBurnPress,
  actionsUnavailable = false,
  burnStep = 'idle',
  burnPreview,
  burnPreparing = false,
  burnSettling = false,
  burnError,
  onBurnBack,
  onBurnConfirm,
  burnSuccessExplorerUrl,
  onBurnSuccessContinue,
  style,
  className,
}: NftDetailPageProps): React.ReactElement {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [imageError, setImageError] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();

  // Anonymous funnel event: an NFT detail view was opened. Only the coarse
  // chain family — never the mint, name or media. No-op without consent.
  const chain = nft.blockchain;
  useEffect(() => {
    if (chain) trackEvent('nft_viewed', { chain });
  }, [chain]);

  const mint = nft.mint;
  const handleCopyMint = useCallback(async () => {
    if (!mint) return;
    try {
      await navigator.clipboard.writeText(mint);
      showCopied();
    } catch (error) {
      console.warn('[NftDetail] Failed to copy mint address:', error);
    }
  }, [mint, showCopied]);

  // ── The receipt ─────────────────────────────────────────────────────────
  if (burnStep === 'success') {
    return (
      <div style={{ ...screenStyle(semantic), ...style }} className={className}>
        <DepthBackground style={{ zIndex: 0 }} />
        <ScalesBackground variant="deepField" style={{ zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex' }}>
          <ReceiptScreen
            tone="transfer"
            title={t('nft.burn.successTitle', 'NFT burned')}
            body={t('nft.burn.successSummary', '"{{name}}" has been burned.', { name: nft.name })}
            rows={[
              {
                label: t('send.screens.status', 'Status'),
                value: t('transactions.detail.confirmed', 'Confirmed'),
                valueTone: 'success',
              },
            ]}
            explorerUrl={burnSuccessExplorerUrl ?? undefined}
            settling={burnSettling}
            primary={{
              label: t('transaction.continue', 'Back to wallet'),
              onPress: () => onBurnSuccessContinue?.(),
              testID: 'tx-success-continue-button',
            }}
          />
        </div>
      </div>
    );
  }

  // ── The review ──────────────────────────────────────────────────────────
  if (burnStep === 'review') {
    const canConfirm = !burnPreparing && !burnError && !!burnPreview;
    const busyLabel = burnPreview
      ? t('nft.burn.submitting', 'Burning NFT...')
      : t('nft.burn.preparing', 'Preparing burn...');
    const lutInfo = burnPreview?.lookupTable;

    return (
      <SettingsPanelContent
        testID="nft-burn-screen"
        title={t('nft.burn.reviewTitle', 'Burn NFT')}
        subtitle={nft.name}
        onBack={() => onBurnBack?.()}
        style={style}
        className={className}
        footer={
          <PrimaryButton
            testID="nft-burn-confirm-button"
            onPress={() => onBurnConfirm?.()}
            disabled={!canConfirm}
            loading={burnPreparing}
          >
            {burnPreparing ? busyLabel : t('nft.burn.confirm', 'Confirm burn')}
          </PrimaryButton>
        }
      >
        <div data-testid="nft-burn-irreversible-notice">
          <WarningNotice
            tone="error"
            title={t(
              'nft.burn.reviewBody',
              'This action is irreversible. Confirm only if you want to permanently burn this NFT.'
            )}
          />
        </div>

        {lutInfo && (
          <div data-testid="nft-burn-lut" style={groupStyle}>
            <SectionLabel variant="title">
              {t('nft.burn.lutTitle', 'Temporary lookup table required')}
            </SectionLabel>
            <Card padding="lg" gap={spacing.md}>
              <span style={bodyTextStyle(semantic)}>
                {t(
                  'nft.burn.lutBody',
                  'To fit this burn on Solana, Salmon needs to create a temporary address lookup table before submitting the burn transaction.'
                )}
              </span>
              <KeyValueRow
                label={t('nft.burn.lutRent', 'Approximate rent lock')}
                value={`${formatRawAmount(lutInfo.estimatedRentLamports, LAMPORT_DECIMALS)} SOL`}
              />
              <KeyValueRow
                label={t('nft.burn.lutAddressCount', 'Addresses stored')}
                value={String(lutInfo.addressCount)}
              />
              <KeyValueRow
                label={t('nft.burn.lutSteps', 'Additional setup transactions')}
                value={String(lutInfo.extendTransactionCount + 1)}
              />
              <span style={footnoteStyle(semantic)}>
                {t(
                  'nft.burn.lutFootnote',
                  'The rent stays locked in the lookup table account until it is later deactivated and closed.'
                )}
              </span>
            </Card>
          </div>
        )}

        {!!burnError && (
          <div data-testid="nft-burn-error">
            <WarningNotice tone="error" title={t(burnError)} />
          </div>
        )}
      </SettingsPanelContent>
    );
  }

  // ── The detail ──────────────────────────────────────────────────────────
  const showFallback = !nft.image || imageError;
  const renderAttribute = (attribute: NftAttribute, index: number) => (
    <KeyValueRow
      key={`${attribute.trait_type}-${index}`}
      label={attribute.trait_type}
      value={String(attribute.value)}
    />
  );

  return (
    <SettingsPanelContent
      testID="nft-detail-screen"
      title={nft.name || t('nft.detail.title', 'NFT Detail')}
      // The description is the header's subtitle (owner, 2026-09-02): it reads
      // as the caption of the name, not as a section of its own. A piece with
      // no description keeps its collection there.
      subtitle={nft.description || nft.collectionName}
      onBack={onBack}
      style={style}
      className={className}
      footer={
        // Gone, not greyed: see the module comment.
        actionsUnavailable ? undefined : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <PrimaryButton testID="nft-detail-send-button" onPress={() => onSendPress?.()}>
              {t('nft.send.title', 'Send NFT')}
            </PrimaryButton>
            {/* Burn destroys the thing on screen and nothing brings it back,
                so the trigger says so before the confirm step does — on three
                channels: the danger edge and ink, the flame glyph, and the
                announced irreversibility. */}
            <SecondaryButton
              testID="nft-detail-burn-button"
              tone="danger"
              icon={<FireIcon weight="fill" size={iconSize.md} color={semantic.status.danger} />}
              onPress={() => onBurnPress?.()}
              accessibilityHint={t(
                'nft.burn.reviewBody',
                'This action is irreversible. Confirm only if you want to permanently burn this NFT.'
              )}
            >
              {t('nft.burn_nft', 'Burn')}
            </SecondaryButton>
          </div>
        )
      }
    >
      <div style={heroStyle}>
        {showFallback ? (
          <span style={{ ...fillStyle, backgroundColor: semantic.surface.raised }} />
        ) : (
          <img
            data-testid="nft-detail-image"
            src={nft.image}
            alt={t('nft.detail.imageAlt', 'NFT image for {{name}}', { name: nft.name })}
            decoding="async"
            onError={() => setImageError(true)}
            style={fillStyle}
          />
        )}
      </div>

      {!!nft.attributes && nft.attributes.length > 0 && (
        <div style={groupStyle}>
          <SectionLabel variant="title">{t('nft.detail.attributes', 'Attributes')}</SectionLabel>
          <Card padding="lg" gap={spacing.md} testID="nft-detail-attributes">
            {nft.attributes.map(renderAttribute)}
          </Card>
        </div>
      )}

      <div style={groupStyle}>
        <SectionLabel variant="title">{t('nft.detail.details', 'Details')}</SectionLabel>
        <Card padding="lg" gap={spacing.md} testID="nft-detail-blockchain">
          {isSolanaNft(nft) && (
            <>
              {!!nft.tokenStandard && (
                <KeyValueRow
                  label={t('nft.detail.tokenStandard', 'Token Standard')}
                  value={nft.tokenStandard}
                />
              )}
              {nft.compressed !== undefined && (
                <KeyValueRow
                  label={t('nft.detail.compressed', 'Compressed')}
                  value={nft.compressed ? t('general.yes', 'Yes') : t('general.no', 'No')}
                />
              )}
              {nft.collectionVerified !== undefined && (
                <KeyValueRow
                  label={t('nft.detail.collectionVerified', 'Collection Verified')}
                  value={nft.collectionVerified ? t('general.yes', 'Yes') : t('general.no', 'No')}
                  valueTone={nft.collectionVerified ? 'success' : 'secondary'}
                />
              )}
              {nft.royaltyBps !== undefined && (
                <KeyValueRow
                  label={t('nft.detail.royalties', 'Royalties')}
                  value={`${(nft.royaltyBps / 100).toFixed(2)}%`}
                />
              )}
              {/* The mint is the only thing on this card a user copies, so
                  the row carries the affordance and the tick reports back in
                  the same slot. */}
              <KeyValueRow
                label={t('nft.detail.mintAddress', 'Mint address')}
                value={getShortAddress(nft.mint) ?? nft.mint}
                action={
                  <button
                    type="button"
                    data-testid="nft-detail-copy-mint"
                    onClick={handleCopyMint}
                    aria-label={
                      copied
                        ? t('actions.copied')
                        : t('accessibility.copy_contract_address', 'Copy contract address')
                    }
                    style={copyButtonStyle}
                  >
                    <CopyTick
                      copied={copied}
                      copy={<CopyIcon size={iconSize.sm} color={semantic.text.accent} />}
                      tick={<CheckIcon size={iconSize.sm} color={semantic.status.success} />}
                    />
                  </button>
                }
              />
            </>
          )}

          {isBitcoinNft(nft) && (
            <>
              <KeyValueRow
                label={t('nft.detail.inscriptionNumber', 'Inscription #')}
                value={String(nft.inscriptionNumber)}
              />
              {!!nft.satRarity && (
                <div style={rarityRowStyle}>
                  <span style={rarityLabelStyle(semantic)}>{t('nft.detail.rarity', 'Rarity')}</span>
                  <span
                    style={{
                      ...rarityBadgeStyle(semantic),
                      backgroundColor: getSatRarityColor(nft.satRarity),
                    }}
                  >
                    {nft.satRarity}
                  </span>
                </div>
              )}
              <KeyValueRow
                label={t('nft.detail.contentType', 'Content Type')}
                value={nft.contentType}
              />
              {!!nft.genesisHeight && (
                <KeyValueRow
                  label={t('nft.detail.genesisBlock', 'Genesis Block')}
                  value={String(nft.genesisHeight)}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </SettingsPanelContent>
  );
}

const screenStyle = (t: Semantic): React.CSSProperties => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  backgroundColor: t.water.gradient[1],
});

/** A heading and the card it introduces are one composed block (8 apart). */
const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
};

const heroStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: borderRadius.r4,
  overflow: 'hidden',
  flexShrink: 0,
};

const fillStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const copyButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  margin: 0,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  lineHeight: 0,
};

const rarityRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.md,
};

const bodyTextStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.normal}px`,
  color: t.text.secondary,
});

const footnoteStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.caption,
  lineHeight: `${fontSize.caption * lineHeight.normal}px`,
  color: t.text.tertiary,
});

const rarityLabelStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.caption,
  color: t.text.secondary,
});

const rarityBadgeStyle = (t: Semantic): React.CSSProperties => ({
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.label,
  color: t.accent.onFill,
  textTransform: 'uppercase',
  paddingLeft: spacing.sm,
  paddingRight: spacing.sm,
  paddingTop: spacing.xs,
  paddingBottom: spacing.xs,
  borderRadius: borderRadius.r1,
});
