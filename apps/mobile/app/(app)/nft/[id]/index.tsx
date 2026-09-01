/**
 * NFT · detail — CORE 02's skeleton, applied to a collectible.
 *
 * There is no NFT frame in `product.pen`, so this screen is built on the Asset
 * detail's anatomy — header, hero block, a stack of cards 20 apart, the
 * actions on the bottom band — carrying everything the old `NftDetailSheet`
 * detail step showed: the media, the description, the traits, and the
 * chain-specific facts.
 *
 * The two actions keep the sheet's rules exactly. A watch-only wallet can
 * never sign, so both are **gone, not greyed** — a disabled control would be a
 * promise the wallet cannot keep. An account that is still resolving keeps
 * them, disabled, because it may yet be able to sign.
 */
import React, { useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  getSatRarityColor,
  getShortAddress,
  gradients,
  isBitcoinNft,
  isSignableAccount,
  isSolanaNft,
  lineHeight,
  s,
  spacing,
  trackEvent,
  vs,
  type NftAttribute,
  type Semantic,
} from '@salmon/shared';

import {
  Card,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
  SecondaryButton,
  WarningNotice,
} from '../../../../src/components';
import { CheckIcon, CopyIcon, FireIcon, iconSize } from '../../../../src/icons';
import { useNftFlow } from '../../../../src/contexts/NftFlowContext';
import { useTabChrome } from '../../../../hooks/useTabChrome';
import { useCopyFeedback } from '../../../../hooks/useCopyFeedback';
import { useSemantic, useThemedStyles } from '../../../../src/theme/useThemedStyles';

/** The fallback the media falls back to — the primary fill, drawn flat. */
const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

export default function NftDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; section?: string; sub?: string }>();
  const { floatingBottomOffset } = useTabChrome();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { nft, nftLoading, account, prepareBurn, resetBurn } = useNftFlow();

  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();

  // Anonymous funnel event: an NFT detail view was opened. Only the coarse
  // chain family — never the mint, name or media. No-op without consent.
  const chain = nft?.blockchain;
  React.useEffect(() => {
    if (chain) trackEvent('nft_viewed', { chain });
  }, [chain]);

  // The route carries the section and sub-account the NFT was opened from, and
  // every step of the flow has to stay on that same pair.
  const stepQuery = `?section=${params.section ?? 'solana'}&sub=${params.sub ?? '0'}`;
  const idSegment = encodeURIComponent(params.id);

  // A watch-only account reads like any other but cannot sign — see
  // `isSignableAccount`. Every send/burn trigger must refuse for it.
  const canSignAccount = !!account && isSignableAccount(account);
  // Two states that must not be conflated: an account still resolving (keep
  // the controls, disabled) versus one known to hold no key (drop them).
  const accountCannotEverSign = !!account && !isSignableAccount(account);

  const mint = nft?.mint;
  const handleCopyMint = useCallback(async () => {
    if (!mint) return;
    try {
      await Clipboard.setStringAsync(mint);
      showCopied();
    } catch (error) {
      console.warn('[NftDetail] Failed to copy mint address:', error);
    }
  }, [mint, showCopied]);

  const handleSendPress = useCallback(() => {
    router.push(`/nft/${idSegment}/send${stepQuery}`);
  }, [idSegment, router, stepQuery]);

  // Burning a non-Solana NFT never opens a review: `prepareBurn` says so and
  // stops, exactly as the sheet's burn trigger did.
  const handleBurnPress = useCallback(() => {
    resetBurn();
    if (nft?.blockchain !== 'solana') {
      void prepareBurn();
      return;
    }
    router.push(`/nft/${idSegment}/burn${stepQuery}`);
    void prepareBurn();
  }, [nft?.blockchain, idSegment, prepareBurn, resetBurn, router, stepQuery]);

  const renderAttribute = (attribute: NftAttribute, index: number) => (
    <KeyValueRow
      key={`${attribute.trait_type}-${index}`}
      label={attribute.trait_type}
      value={String(attribute.value)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Pushed over the tab shell, so it mounts its own water. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        title={nft?.name ?? t('nft.detail.title')}
        subtitle={nft?.collectionName}
      />

      <ScrollView
        testID="nft-detail-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!nft && !nftLoading && (
          <WarningNotice tone="warning" title={t('nft.notFound')} style={styles.notice} />
        )}

        {nft && (
          <>
            <View style={styles.hero}>
              {!nft.image || imageError ? (
                <LinearGradient
                  colors={[...FALLBACK_GRADIENT.colors]}
                  start={FALLBACK_GRADIENT.start}
                  end={FALLBACK_GRADIENT.end}
                  style={styles.heroImage}
                />
              ) : (
                <>
                  <Image
                    testID="nft-detail-image"
                    source={nft.image}
                    style={styles.heroImage}
                    contentFit="cover"
                    autoplay
                    recyclingKey={nft.mint}
                    accessibilityLabel={t('nft.detail.imageAlt', { name: nft.name })}
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                  {imageLoading && (
                    <View style={[styles.heroImage, styles.heroLoading]}>
                      <LinearGradient
                        colors={[...FALLBACK_GRADIENT.colors]}
                        start={FALLBACK_GRADIENT.start}
                        end={FALLBACK_GRADIENT.end}
                        style={StyleSheet.absoluteFill}
                      />
                      <ActivityIndicator size="small" color={semantic.text.primary} />
                    </View>
                  )}
                </>
              )}
            </View>

            {!!nft.description && (
              <View style={styles.group}>
                <SectionLabel variant="title">{t('nft.detail.description')}</SectionLabel>
                <Card padding="lg" testID="nft-detail-description">
                  <Text style={styles.description}>{nft.description}</Text>
                </Card>
              </View>
            )}

            {!!nft.attributes && nft.attributes.length > 0 && (
              <View style={styles.group}>
                <SectionLabel variant="title">{t('nft.detail.attributes')}</SectionLabel>
                <Card padding="lg" gap={spacing.md} testID="nft-detail-attributes">
                  {nft.attributes.map(renderAttribute)}
                </Card>
              </View>
            )}

            <View style={styles.group}>
              <SectionLabel variant="title">{t('nft.detail.details')}</SectionLabel>
              <Card padding="lg" gap={spacing.md} testID="nft-detail-blockchain">
                {isSolanaNft(nft) && (
                  <>
                    {!!nft.tokenStandard && (
                      <KeyValueRow
                        label={t('nft.detail.tokenStandard')}
                        value={nft.tokenStandard}
                      />
                    )}
                    {nft.compressed !== undefined && (
                      <KeyValueRow
                        label={t('nft.detail.compressed')}
                        value={nft.compressed ? t('general.yes') : t('general.no')}
                      />
                    )}
                    {nft.collectionVerified !== undefined && (
                      <KeyValueRow
                        label={t('nft.detail.collectionVerified')}
                        value={nft.collectionVerified ? t('general.yes') : t('general.no')}
                        valueTone={nft.collectionVerified ? 'success' : 'secondary'}
                      />
                    )}
                    {nft.royaltyBps !== undefined && (
                      <KeyValueRow
                        label={t('nft.detail.royalties')}
                        value={`${(nft.royaltyBps / 100).toFixed(2)}%`}
                      />
                    )}
                    {/* The mint is the only thing on this card a user copies,
                        so the whole row is the affordance and the tick reports
                        back in the value's own slot. */}
                    <TouchableOpacity
                      testID="nft-detail-copy-mint"
                      onPress={handleCopyMint}
                      accessibilityRole="button"
                      accessibilityLabel={t('accessibility.copy_contract_address')}
                    >
                      <View style={styles.copyRow}>
                        <KeyValueRow
                          style={styles.copyRowValue}
                          label={t('nft.detail.mintAddress')}
                          value={getShortAddress(nft.mint) ?? nft.mint}
                        />
                        {copied ? (
                          <CheckIcon size={iconSize.sm} color={semantic.status.success} />
                        ) : (
                          <CopyIcon size={iconSize.sm} color={semantic.text.accent} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {isBitcoinNft(nft) && (
                  <>
                    <KeyValueRow
                      label={t('nft.detail.inscriptionNumber')}
                      value={String(nft.inscriptionNumber)}
                    />
                    {!!nft.satRarity && (
                      <View style={styles.rarityRow}>
                        <Text style={styles.rarityLabel}>{t('nft.detail.rarity')}</Text>
                        <View
                          style={[
                            styles.rarityBadge,
                            { backgroundColor: getSatRarityColor(nft.satRarity) },
                          ]}
                        >
                          <Text style={styles.rarityText}>{nft.satRarity}</Text>
                        </View>
                      </View>
                    )}
                    <KeyValueRow label={t('nft.detail.contentType')} value={nft.contentType} />
                    {!!nft.genesisHeight && (
                      <KeyValueRow
                        label={t('nft.detail.genesisBlock')}
                        value={String(nft.genesisHeight)}
                      />
                    )}
                  </>
                )}
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      {/* Gone, not greyed: see the module comment. */}
      {nft && !accountCannotEverSign && (
        <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
          <PrimaryButton
            testID="nft-detail-send-button"
            onPress={handleSendPress}
            disabled={!canSignAccount}
          >
            {t('nft.send.title')}
          </PrimaryButton>
          {/* Burn destroys the thing on screen and nothing brings it back, so
              the trigger says so before the confirm step does — on three
              channels: the danger edge and ink, the flame glyph, and the
              announced irreversibility. Send stays the peer it is; this is
              not one. */}
          <SecondaryButton
            testID="nft-detail-burn-button"
            tone="danger"
            icon={<FireIcon weight="fill" size={iconSize.md} color={semantic.status.danger} />}
            onPress={handleBurnPress}
            disabled={!canSignAccount}
            accessibilityHint={t('nft.burn.reviewBody')}
          >
            {t('nft.burn_nft')}
          </SecondaryButton>
        </View>
      )}
    </SafeAreaView>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    body: {
      flex: 1,
    },
    // The component gap: every top-level child of a screen is 20 from the next
    // (DESIGN.md §Layout — "The component gap").
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingBottom: vs(spacing.screenGutter),
      gap: vs(spacing.screenGutter),
    },
    // A heading and the card it introduces are one composed block, so they sit
    // at the tighter in-component step and the 20 belongs to the seam above.
    group: {
      gap: vs(spacing.sm),
    },
    hero: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: borderRadius.r4,
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      borderRadius: borderRadius.r4,
    },
    heroLoading: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    description: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.normal,
      color: t.text.secondary,
    },
    copyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    copyRowValue: {
      flex: 1,
    },
    rarityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    rarityLabel: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.caption),
      color: t.text.secondary,
    },
    rarityBadge: {
      paddingHorizontal: s(spacing.sm),
      paddingVertical: vs(spacing.xs),
      borderRadius: borderRadius.r1,
    },
    rarityText: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.label),
      color: t.accent.onFill,
      textTransform: 'uppercase',
    },
    notice: {
      marginTop: 0,
    },
    action: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.md),
    },
  });
