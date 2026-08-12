/**
 * NftDetailPage - Full-page NFT detail view
 *
 * Replaces the former NftDetailSheet dialog.
 * Renders as a full page with back navigation, matching the
 * page-navigation pattern used by TokenDetailPage.
 *
 * Content: NFT image, blockchain badge, description, attributes,
 * blockchain-specific details, and Send/Burn action buttons.
 */

import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CallMadeIcon from '@mui/icons-material/CallMade';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

import {
  colors,
  spacing,
  gradients,
  fontFamily,
  fontWeight,
  borderRadius,
  fontSize,
  isSolanaNft,
  isBitcoinNft,
  getSatRarityColor,
  shadowsCSS,
  formatRawAmount,
  letterSpacing,
  lineHeight,
  opacity,
  componentSizes,
  duration,
  easing,
  blur,
  borderWidth,
  trackEvent,
} from '@salmon/shared';

import { BlurContainer } from '../BlurContainer';
import { PageShell } from '../PageShell';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { NftDetailPageProps, NftAttribute } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.lg,
  paddingLeft: spacing.headerPadding,
  paddingRight: spacing.headerPadding,
  paddingTop: spacing.lg,
  paddingBottom: spacing['4xl'],
});

const ImageContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.sm,
});

const NftImage = styled('img')({
  width: '100%',
  maxWidth: componentSizes.nftImageMaxWidth,
  aspectRatio: '1 / 1',
  borderRadius: borderRadius.iconContainer,
  objectFit: 'cover',
  boxShadow: shadowsCSS.header,
});

const SectionContent = styled(Box)({
  padding: spacing.sm,
  position: 'relative',
  zIndex: 1,
});

const SectionTitle = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  color: colors.text.primary,
  marginBottom: spacing.sm,
});

const DescriptionText = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.regular,
  color: colors.text.secondary,
  lineHeight: lineHeight.normal,
});

const AttributesGrid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  marginLeft: -spacing.sm,
  marginRight: -spacing.sm,
});

const AttributeItem = styled(Box)({
  width: '50%',
  paddingLeft: spacing.sm,
  paddingRight: spacing.sm,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  boxSizing: 'border-box',
});

const AttributeName = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.black,
  color: colors.text.primary,
  marginBottom: spacing.xs,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
});

const AttributeValue = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.regular,
  color: colors.text.secondary,
});

const DetailRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  borderBottom: `${borderWidth.actionButton}px solid ${colors.border.default}`,
  '&:last-child': {
    borderBottom: 'none',
  },
});

const DetailLabel = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const DetailValue = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
});

const RarityBadge = styled(Box)({
  paddingLeft: spacing.sm,
  paddingRight: spacing.sm,
  paddingTop: spacing.xs,
  paddingBottom: spacing.xs,
  borderRadius: borderRadius.sm,
});

const RarityText = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.bold,
  color: colors.text.primary,
  textTransform: 'capitalize',
});

const ActionButtonsContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  gap: spacing.lg,
  marginTop: spacing.lg,
});

const PrimaryButtonBase = styled(ButtonBase)({
  flex: 1,
  maxWidth: componentSizes.buttonMinWidthLg,
  borderRadius: borderRadius.button,
  overflow: 'hidden',
  background: gradients.primaryButtonCSS,
  border: `${borderWidth.actionButton}px solid ${colors.accent.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: componentSizes.iconSize4XL,
  gap: spacing.base,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': { opacity: opacity.high },
  '&:active': { opacity: opacity.medium },
});

const SecondaryButtonInner = styled(ButtonBase)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: componentSizes.iconSize4XL,
  gap: spacing.base,
  position: 'relative',
  zIndex: 1,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': { opacity: opacity.high },
  '&:active': { opacity: opacity.medium },
});

const ButtonText = styled(Typography)({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  color: colors.text.balance,
  lineHeight: lineHeight.normal,
});

// ============================================================================
// NftDetailPage Component
// ============================================================================

export function NftDetailPage({
  nft,
  onBack,
  onSendPress,
  onBurnPress,
  burnStep = 'idle',
  burnSettling = false,
  burnPreview,
  burnPreparing = false,
  burnError,
  onBurnBack,
  onBurnConfirm,
  burnSuccessExplorerUrl,
  onBurnSuccessContinue,
  style,
  className,
}: NftDetailPageProps): React.ReactElement {
  const { t } = useTranslation();

  // Anonymous funnel event: an NFT detail view was opened. Only the coarse
  // chain family — never the mint, name or media. No-op without consent.
  useEffect(() => {
    trackEvent('nft_viewed', { chain: nft.blockchain });
  }, [nft.blockchain]);

  const handleSendPress = useCallback(() => {
    onSendPress?.();
  }, [onSendPress]);

  const handleBurnPress = useCallback(() => {
    onBurnPress?.();
  }, [onBurnPress]);

  const handleBurnBack = useCallback(() => {
    onBurnBack?.();
  }, [onBurnBack]);

  const handleBurnConfirm = useCallback(() => {
    onBurnConfirm?.();
  }, [onBurnConfirm]);

  const handleBurnSuccessContinue = useCallback(() => {
    onBurnSuccessContinue?.();
  }, [onBurnSuccessContinue]);

  const lutInfo = burnPreview?.lookupTable;
  const isBurnReviewStep = burnStep === 'review';
  const isBurnSuccessStep = burnStep === 'success';
  const burnBusyLabel = burnPreview
    ? t('nft.burn.submitting', 'Burning NFT...')
    : t('nft.burn.preparing', 'Preparing burn...');

  const renderBlockchainDetails = useCallback(() => {
    if (isSolanaNft(nft)) {
      return (
        <>
          {nft.tokenStandard && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.tokenStandard', 'Token Standard')}</DetailLabel>
              <DetailValue>{nft.tokenStandard}</DetailValue>
            </DetailRow>
          )}
          {nft.compressed !== undefined && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.compressed', 'Compressed')}</DetailLabel>
              <DetailValue>
                {nft.compressed ? t('general.yes', 'Yes') : t('general.no', 'No')}
              </DetailValue>
            </DetailRow>
          )}
          {nft.collectionVerified !== undefined && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.collectionVerified', 'Collection Verified')}</DetailLabel>
              <DetailValue>{nft.collectionVerified ? '\u2713' : '\u2717'}</DetailValue>
            </DetailRow>
          )}
          {nft.royaltyBps !== undefined && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.royalties', 'Royalties')}</DetailLabel>
              <DetailValue>{(nft.royaltyBps / 100).toFixed(2)}%</DetailValue>
            </DetailRow>
          )}
        </>
      );
    }

    if (isBitcoinNft(nft)) {
      return (
        <>
          <DetailRow>
            <DetailLabel>{t('nft.detail.inscriptionNumber', 'Inscription #')}</DetailLabel>
            <DetailValue>{nft.inscriptionNumber}</DetailValue>
          </DetailRow>
          {nft.satRarity && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.rarity', 'Rarity')}</DetailLabel>
              <RarityBadge sx={{ backgroundColor: getSatRarityColor(nft.satRarity) }}>
                <RarityText>{nft.satRarity}</RarityText>
              </RarityBadge>
            </DetailRow>
          )}
          <DetailRow>
            <DetailLabel>{t('nft.detail.contentType', 'Content Type')}</DetailLabel>
            <DetailValue>{nft.contentType}</DetailValue>
          </DetailRow>
          {nft.genesisHeight && (
            <DetailRow>
              <DetailLabel>{t('nft.detail.genesisBlock', 'Genesis Block')}</DetailLabel>
              <DetailValue>{nft.genesisHeight}</DetailValue>
            </DetailRow>
          )}
        </>
      );
    }

    return null;
  }, [nft, t]);

  const renderAttribute = useCallback((attribute: NftAttribute, index: number) => {
    return (
      <AttributeItem key={`${attribute.trait_type}-${index}`}>
        <AttributeName>{attribute.trait_type}</AttributeName>
        <AttributeValue>{attribute.value}</AttributeValue>
      </AttributeItem>
    );
  }, []);

  const blurStyle = {
    borderRadius: borderRadius.md,
    overflow: 'hidden' as const,
  };

  return (
    <PageShell
      title={
        isBurnReviewStep
          ? t('nft.burn.reviewTitle', 'Burn NFT')
          : isBurnSuccessStep
            ? t('nft.burn.successTitle', 'NFT burned')
            : nft.name
      }
      onBack={
        isBurnReviewStep ? handleBurnBack : isBurnSuccessStep ? handleBurnSuccessContinue : onBack
      }
      showScalesBackground
      style={style}
      className={className}
    >
      <ContentContainer>
        {isBurnSuccessStep ? (
          <TransactionSuccessScreen
            title={t('nft.burn.successTitle', 'NFT burned')}
            pendingTitle={t('nft.burn.submitting', 'Burning NFT...')}
            summary={t('nft.burn.successSummary', {
              name: nft.name,
              defaultValue: `"${nft.name}" has been burned.`,
            })}
            explorerUrl={burnSuccessExplorerUrl ?? null}
            onContinue={handleBurnSuccessContinue}
            settling={burnSettling}
          />
        ) : (
          <>
            {nft.image && (
              <ImageContainer>
                <NftImage
                  src={nft.image}
                  alt={t('nft.detail.imageAlt', 'NFT image for {{name}}', { name: nft.name })}
                />
              </ImageContainer>
            )}

            {nft.description && (
              <BlurContainer
                blurIntensity={blur.md}
                blurTint="dark"
                backgroundColor={colors.background.tokenItem}
                borderColor={colors.border.default}
                borderWidth={borderWidth.thin}
                style={blurStyle}
              >
                <SectionContent>
                  <SectionTitle>{t('nft.detail.description', 'Description')}</SectionTitle>
                  <DescriptionText>{nft.description}</DescriptionText>
                </SectionContent>
              </BlurContainer>
            )}

            {nft.attributes && nft.attributes.length > 0 && (
              <BlurContainer
                blurIntensity={blur.md}
                blurTint="dark"
                backgroundColor={colors.background.tokenItem}
                borderColor={colors.border.default}
                borderWidth={borderWidth.thin}
                style={blurStyle}
              >
                <SectionContent>
                  <SectionTitle>{t('nft.detail.attributes', 'Attributes')}</SectionTitle>
                  <AttributesGrid>{nft.attributes.map(renderAttribute)}</AttributesGrid>
                </SectionContent>
              </BlurContainer>
            )}

            {renderBlockchainDetails() && (
              <BlurContainer
                blurIntensity={blur.md}
                blurTint="dark"
                backgroundColor={colors.background.tokenItem}
                borderColor={colors.border.default}
                borderWidth={borderWidth.thin}
                style={blurStyle}
              >
                <SectionContent>
                  <SectionTitle>{t('nft.detail.details', 'Details')}</SectionTitle>
                  {renderBlockchainDetails()}
                </SectionContent>
              </BlurContainer>
            )}

            {isBurnReviewStep ? (
              <>
                <BlurContainer
                  blurIntensity={blur.md}
                  blurTint="dark"
                  backgroundColor={colors.background.tokenItem}
                  borderColor={colors.border.default}
                  borderWidth={borderWidth.thin}
                  style={blurStyle}
                >
                  <SectionContent>
                    <SectionTitle>{t('nft.burn.reviewTitle', 'Burn NFT')}</SectionTitle>
                    <DescriptionText>
                      {t(
                        'nft.burn.reviewBody',
                        'This action is irreversible. Confirm only if you want to permanently burn this NFT.'
                      )}
                    </DescriptionText>
                  </SectionContent>
                </BlurContainer>

                {lutInfo && (
                  <BlurContainer
                    blurIntensity={blur.md}
                    blurTint="dark"
                    backgroundColor={colors.background.tokenItem}
                    borderColor={colors.border.default}
                    borderWidth={borderWidth.thin}
                    style={blurStyle}
                  >
                    <SectionContent>
                      <SectionTitle>
                        {t('nft.burn.lutTitle', 'Temporary lookup table required')}
                      </SectionTitle>
                      <DescriptionText>
                        {t(
                          'nft.burn.lutBody',
                          'To fit this burn on Solana, Salmon needs to create a temporary address lookup table before submitting the burn transaction.'
                        )}
                      </DescriptionText>
                      <DetailRow>
                        <DetailLabel>{t('nft.burn.lutRent', 'Approximate rent lock')}</DetailLabel>
                        <DetailValue>
                          {formatRawAmount(lutInfo.estimatedRentLamports, 9)} SOL
                        </DetailValue>
                      </DetailRow>
                      <DetailRow>
                        <DetailLabel>
                          {t('nft.burn.lutAddressCount', 'Addresses stored')}
                        </DetailLabel>
                        <DetailValue>{lutInfo.addressCount}</DetailValue>
                      </DetailRow>
                      <DetailRow>
                        <DetailLabel>
                          {t('nft.burn.lutSteps', 'Additional setup transactions')}
                        </DetailLabel>
                        <DetailValue>{lutInfo.extendTransactionCount + 1}</DetailValue>
                      </DetailRow>
                      <DescriptionText sx={{ marginTop: spacing.md }}>
                        {t(
                          'nft.burn.lutFootnote',
                          'The rent stays locked in the lookup table account until it is later deactivated and closed.'
                        )}
                      </DescriptionText>
                    </SectionContent>
                  </BlurContainer>
                )}

                {burnPreparing && <DescriptionText>{burnBusyLabel}</DescriptionText>}

                {burnError && (
                  <DescriptionText sx={{ color: colors.status.error }}>
                    {t(burnError)}
                  </DescriptionText>
                )}

                <ActionButtonsContainer>
                  <BlurContainer
                    blurIntensity={blur.xs}
                    backgroundColor={colors.interactive.surface}
                    borderColor={colors.accent.border}
                    borderWidth={borderWidth.actionButton}
                    style={{
                      borderRadius: borderRadius.button,
                      overflow: 'hidden',
                      flex: 1,
                      maxWidth: componentSizes.buttonMinWidthLg,
                    }}
                  >
                    <SecondaryButtonInner
                      onClick={handleBurnBack}
                      aria-label={t('nft.detail.backToDetails', 'Back to NFT details')}
                      data-testid="nft-burn-back-button"
                    >
                      <ButtonText>{t('actions.back', 'Back')}</ButtonText>
                    </SecondaryButtonInner>
                  </BlurContainer>

                  <PrimaryButtonBase
                    onClick={handleBurnConfirm}
                    aria-label={t('nft.burn.confirm', 'Confirm burn')}
                    data-testid="nft-burn-confirm-button"
                    disabled={burnPreparing || !burnPreview || !!burnError}
                    sx={{
                      opacity: burnPreparing || !burnPreview || !!burnError ? opacity.medium : 1,
                    }}
                  >
                    <LocalFireDepartmentIcon
                      sx={{ fontSize: fontSize.md, color: colors.text.balance }}
                    />
                    <ButtonText>{t('nft.burn_nft', 'Burn')}</ButtonText>
                  </PrimaryButtonBase>
                </ActionButtonsContainer>
              </>
            ) : (
              <ActionButtonsContainer>
                <PrimaryButtonBase
                  onClick={handleSendPress}
                  aria-label={t('nft.send.title', 'Send NFT')}
                  data-testid="nft-detail-send-button"
                >
                  <CallMadeIcon sx={{ fontSize: fontSize.md, color: colors.text.balance }} />
                  <ButtonText>{t('actions.send', 'Send')}</ButtonText>
                </PrimaryButtonBase>

                <BlurContainer
                  blurIntensity={blur.xs}
                  backgroundColor={colors.interactive.surface}
                  borderColor={colors.accent.border}
                  borderWidth={borderWidth.actionButton}
                  style={{
                    borderRadius: borderRadius.button,
                    overflow: 'hidden',
                    flex: 1,
                    maxWidth: componentSizes.buttonMinWidthLg,
                  }}
                >
                  <SecondaryButtonInner
                    onClick={handleBurnPress}
                    aria-label={t('nft.burn.reviewTitle', 'Burn NFT')}
                    data-testid="nft-detail-burn-button"
                  >
                    <LocalFireDepartmentIcon
                      sx={{ fontSize: fontSize.md, color: colors.text.balance }}
                    />
                    <ButtonText>{t('nft.burn_nft', 'Burn')}</ButtonText>
                  </SecondaryButtonInner>
                </BlurContainer>
              </ActionButtonsContainer>
            )}
          </>
        )}
      </ContentContainer>
    </PageShell>
  );
}
