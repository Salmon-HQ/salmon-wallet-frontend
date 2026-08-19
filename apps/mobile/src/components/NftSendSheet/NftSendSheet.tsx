/**
 * NftSendSheet - Full-height bottom sheet modal for sending an NFT.
 *
 * Reuses the shared BottomSheetContainer so send keeps the same spatial
 * context as the NFT detail flow instead of collapsing into a short modal.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import {
  colors,
  fontSize,
  borderRadius,
  borderWidth,
  componentSizes,
  ms,
  vs,
  s,
  useNftTransfer,
  classifyTransactionError,
  type NftData,
  type BlockchainAccount,
  fontFamilyNative,
  fontScaleCap,
  type BlockchainType,
  type ValidationCallbackResult,
  spacing,
  fontWeight,
  getNftBlockchainLabel,
  isSolanaNft,
  isBitcoinNft,
  lineHeight,
  gradients,
  shadows,
  semantic,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { InputAddress } from '../InputAddress';
import { BlurContainer } from '../BlurContainer';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { FleshBackground } from '../FleshBackground';
import { BitcoinSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';
import { ArrowUpRightIcon } from '../../icons';

export interface NftSendSheetProps {
  visible: boolean;
  onClose: () => void;
  nft: NftData | null;
  account: BlockchainAccount | undefined;
  onSuccess?: (txId: string) => void;
}

export function NftSendSheet({
  visible,
  onClose,
  nft,
  account,
  onSuccess,
}: NftSendSheetProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { actionRowBottomPadding, compactContentBottomPadding } = useBottomSheetChrome();
  const [address, setAddress] = useState('');
  const [addressValid, setAddressValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendNft, reset: resetTransfer } = useNftTransfer({ account });

  const blockchain: BlockchainType = nft?.blockchain ?? 'solana';
  const isBitcoin = blockchain === 'bitcoin';

  const getBlockchainIcon = useCallback(() => {
    const size = ms(16);
    const color = colors.text.primary;

    if (nft && isSolanaNft(nft)) {
      return <SolanaSvgIcon size={size} color={color} />;
    }
    if (nft && isBitcoinNft(nft)) {
      return <BitcoinSvgIcon size={size} color={color} />;
    }

    return null;
  }, [nft]);

  const handleValidation = useCallback((result: ValidationCallbackResult) => {
    setAddressValid(result.isValid);
  }, []);

  const handleClose = useCallback(() => {
    setAddress('');
    setAddressValid(false);
    setLoading(false);
    setError(null);
    resetTransfer();
    onClose();
  }, [onClose, resetTransfer]);

  const handleConfirm = useCallback(async () => {
    if (!nft || !addressValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sendNft(nft, address);
      onSuccess?.(result.txId);
      handleClose();
    } catch (err) {
      setError(classifyTransactionError(err));
      setLoading(false);
    }
  }, [nft, address, addressValid, loading, sendNft, onSuccess, handleClose]);

  const canConfirm = addressValid && !loading && !isBitcoin;

  if (!visible || !nft) {
    return null;
  }

  const headerContent = (
    <>
      <Text style={styles.nftName} numberOfLines={2}>
        {nft.name}
      </Text>
      <View style={styles.blockchainBadgeContainer}>
        <BlurContainer blurIntensity={10} blurTint="dark" style={styles.blockchainBadge}>
          <View style={styles.blockchainBadgeContent}>
            {getBlockchainIcon()}
            <Text style={styles.blockchainLabel}>{getNftBlockchainLabel(nft)}</Text>
          </View>
        </BlurContainer>
      </View>
    </>
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={handleClose}
      // A one-of-one transfer is in flight; there is nothing to come back to.
      dismissible={!loading}
      headerContent={headerContent}
      showTextureOverlay
      style={styles.sheetContainer}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: compactContentBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={nft.image ?? undefined}
              style={styles.nftImage}
              contentFit="cover"
              autoplay={true}
              recyclingKey={nft.mint}
            />
          </View>

          <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t('nft.send.title', 'Send NFT')}</Text>
              {nft.collectionName && (
                <Text style={styles.collectionName} numberOfLines={1}>
                  {nft.collectionName}
                </Text>
              )}

              {isBitcoin ? (
                <Text style={styles.messageText}>
                  {t('nft.send.ordinalsNotSupported', 'Ordinal transfers are not yet supported.')}
                </Text>
              ) : (
                <>
                  <InputAddress
                    address={address}
                    onChange={setAddress}
                    onValidation={handleValidation}
                    placeholder={t('nft.send.enterRecipientAddress', 'Enter recipient address')}
                    label={t('token.send.recipient', 'Recipient')}
                  />

                  {error && <Text style={styles.errorText}>{t(error)}</Text>}
                </>
              )}
            </View>
          </BlurContainer>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
              <Text style={styles.loadingText}>{t('nft.send.sending', 'Sending NFT...')}</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: actionRowBottomPadding }]}>
          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text
              style={styles.cancelButtonText}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={fontScaleCap.chrome}
            >
              {t('actions.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>

          {!isBitcoin && (
            <TouchableOpacity
              testID="nft-send-confirm-btn"
              style={[styles.primaryButton, !canConfirm && styles.primaryButtonDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              activeOpacity={0.8}
            >
              {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
                fill. Every band is paler than the fill, so it can only raise
                the luminance under the label. */}
              {canConfirm && <FleshBackground />}
              <ArrowUpRightIcon weight="bold" size={ms(15)} color={semantic.accent.onFill} />
              <Text
                style={styles.buttonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                maxFontSizeMultiplier={fontScaleCap.chrome}
              >
                {t('actions.send', 'Send')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    minHeight: '85%',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: s(spacing.headerPadding),
    gap: vs(spacing.lg),
  },
  nftName: {
    fontSize: ms(fontSize['2xl']),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.sm),
    paddingHorizontal: s(spacing.headerPadding),
  },
  blockchainBadgeContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing.lg),
  },
  blockchainBadge: {
    borderRadius: ms(borderRadius.lg),
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    overflow: 'hidden',
    backgroundColor: colors.background.tokenItem,
  },
  blockchainBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.xs),
    gap: s(spacing.xs),
  },
  blockchainLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  imageContainer: {
    alignItems: 'center',
  },
  nftImage: {
    width: s(componentSizes.nftImageMaxWidth),
    height: s(componentSizes.nftImageMaxWidth),
    borderRadius: ms(borderRadius.iconContainer),
    backgroundColor: colors.background.card,
    ...shadows.imageHero,
  },
  sectionContainer: {
    borderRadius: ms(borderRadius.badge),
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    overflow: 'hidden',
    backgroundColor: colors.background.tokenItem,
  },
  sectionContent: {
    padding: s(spacing.sm),
    gap: vs(spacing.md),
  },
  sectionTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
  collectionName: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  messageText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    lineHeight: ms(fontSize.base * lineHeight.normal),
  },
  errorText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: semantic.status.danger,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: vs(spacing.md),
    paddingVertical: vs(spacing['2xl']),
  },
  loadingText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: s(spacing.md),
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing.md),
  },
  cancelButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.button),
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: colors.button.disabledOpacity,
  },
  cancelButtonText: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  primaryButton: {
    flex: 1,
    minHeight: vs(componentSizes.buttonHeightMedium),
    // The flesh is drawn at absolute-fill; clip it to the button's own radius.
    overflow: 'hidden',
    borderRadius: ms(borderRadius.button),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.base),
    backgroundColor: colors.accent.primary,
    borderWidth: borderWidth.actionButton,
    borderColor: semantic.accent.fill,
  },
  primaryButtonDisabled: {
    backgroundColor: gradients.primaryButton.colors[0],
    opacity: 0.5,
  },
  buttonText: {
    fontSize: ms(fontSize.bodyLg),
    // Everything on a flesh fill is bold — label and glyph alike.
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
    color: semantic.accent.onFill,
  },
});

export default NftSendSheet;
