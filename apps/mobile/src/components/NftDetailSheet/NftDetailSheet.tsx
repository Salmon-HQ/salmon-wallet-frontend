import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Dimensions,
} from 'react-native';
import { FireIcon } from '../../icons';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';
import {
  colors,
  motionMs,
  resolveMotionMs,
  fontSize,
  borderRadius,
  fontFamilyNative,
  gradients,
  shadows,
  componentSizes,
  ms,
  vs,
  s,
  isSolanaNft,
  isBitcoinNft,
  getSatRarityColor,
  getShortAddress,
  borderWidth,
  letterSpacing,
  lineHeight,
  spacing,
  fontWeight,
  formatRawAmount,
  trackEvent,
  useNftTransfer,
  getTransactionUrl,
  getDefaultExplorer,
  classifyTransactionError,
  type Blockchain,
  type NetworkEnvironment,
  type ValidationCallbackResult,
  semantic,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { ArrowUpRightIcon } from '../../icons';
import { BlurContainer } from '../BlurContainer';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { FleshBackground } from '../FleshBackground';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { InputAddress } from '../InputAddress';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { NftDetailSheetProps, NftAttribute } from './types';

type NftDetailStep = 'detail' | 'send' | 'review' | 'burn' | 'success';
type SuccessKind = 'send' | 'burn' | null;

const FALLBACK_GRADIENT = {
  colors: [...gradients.primaryButton.colors],
  start: { x: 0.12, y: 0.5 },
  end: { x: 0.83, y: 0.5 },
} as const;

export const NftDetailSheet: React.FC<NftDetailSheetProps> = ({
  visible,
  onClose,
  nft,
  account,
  onSendSuccess,
  burnPreview,
  burnPreparing = false,
  burnSettling = false,
  burnSuccessTxId,
  burnError,
  onBurnPress,
  onBurnConfirm,
  onBurnSuccess,
  onBurnReset,
  style,
}) => {
  const { t } = useTranslation();
  const { bottomInset, spaciousContentBottomPadding } = useBottomSheetChrome();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [prevMint, setPrevMint] = useState<string | undefined>(undefined);
  const [step, setStep] = useState<NftDetailStep>('detail');
  const [transitionFromStep, setTransitionFromStep] = useState<NftDetailStep | null>(null);
  const [transitionToStep, setTransitionToStep] = useState<NftDetailStep | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [address, setAddress] = useState('');
  const [addressValid, setAddressValid] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<SuccessKind>(null);

  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);
  const stepTransitionProgress = useMemo(() => new Animated.Value(1), []);
  const { sendNft, reset: resetTransfer, settling: nftSettling } = useNftTransfer({ account });
  const sheetSlideDistance = useMemo(() => Dimensions.get('window').width, []);

  if (nft?.mint !== prevMint) {
    setPrevMint(nft?.mint);
    setImageLoading(true);
    setImageError(false);
  }

  // Anonymous funnel event: an NFT detail view was opened. Only the coarse
  // chain family — never the mint, name or media. No-op without consent.
  useEffect(() => {
    if (visible && nft) {
      trackEvent('nft_viewed', { chain: nft.blockchain });
    }
  }, [visible, nft]);

  const resetFlowState = useCallback(() => {
    setStep('detail');
    setTransitionFromStep(null);
    setTransitionToStep(null);
    setTransitionDirection(1);
    stepTransitionProgress.setValue(1);
    setAddress('');
    setAddressValid(false);
    setSending(false);
    setSendError(null);
    setSuccessTxId(null);
    setSuccessKind(null);
    resetTransfer();
    onBurnReset?.();
  }, [onBurnReset, resetTransfer, stepTransitionProgress]);

  useEffect(() => {
    if (!visible) {
      resetFlowState();
    }
  }, [visible, resetFlowState]);

  useEffect(() => {
    resetFlowState();
  }, [nft?.mint, resetFlowState]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const opacity = Math.min(offsetY / componentSizes.sheetFadeGradientHeight, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  const handleClose = useCallback(() => {
    resetFlowState();
    onClose();
  }, [onClose, resetFlowState]);

  const handleSuccessContinue = useCallback(() => {
    const txId = successTxId;
    const completedFlow = successKind;
    handleClose();
    if (txId) {
      if (completedFlow === 'burn') {
        onBurnSuccess?.(txId);
      } else {
        onSendSuccess?.(txId);
      }
    }
  }, [handleClose, onBurnSuccess, onSendSuccess, successKind, successTxId]);

  const isReduceMotionEnabled = useReducedMotion();

  const startStepTransition = useCallback(
    (nextStep: 'detail' | 'send' | 'review' | 'burn', direction: 1 | -1) => {
      if (step === nextStep) return;

      setTransitionFromStep(step);
      setTransitionToStep(nextStep);
      setTransitionDirection(direction);
      stepTransitionProgress.setValue(0);

      Animated.timing(stepTransitionProgress, {
        toValue: 1,
        // A step change inside a sheet is an in-place layout change: `drift`.
        duration: resolveMotionMs(motionMs.drift, isReduceMotionEnabled),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setStep(nextStep);
        setTransitionFromStep(null);
        setTransitionToStep(null);
        setTransitionDirection(1);
        stepTransitionProgress.setValue(1);
      });
    },
    [step, stepTransitionProgress, isReduceMotionEnabled]
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return undefined;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'success') {
        handleSuccessContinue();
      } else if (step === 'review') {
        startStepTransition('send', -1);
      } else if (step === 'send' || step === 'burn') {
        startStepTransition('detail', -1);
        onBurnReset?.();
      } else {
        handleClose();
      }
      return true;
    });

    return () => backHandler.remove();
  }, [visible, step, handleClose, handleSuccessContinue, onBurnReset, startStepTransition]);

  useEffect(() => {
    if (!visible || !burnSuccessTxId || step !== 'burn') return;
    setSuccessTxId(burnSuccessTxId);
    setSuccessKind('burn');
    setStep('success');
  }, [burnSuccessTxId, step, visible]);

  const handleValidation = useCallback((result: ValidationCallbackResult) => {
    setAddressValid(result.isValid);
  }, []);

  const handleOpenSendStep = useCallback(() => {
    setSendError(null);
    startStepTransition('send', 1);
  }, [startStepTransition]);

  const handleBackToDetail = useCallback(() => {
    setSending(false);
    setSendError(null);
    startStepTransition('detail', -1);
  }, [startStepTransition]);

  const handleOpenReviewStep = useCallback(() => {
    setSendError(null);
    startStepTransition('review', 1);
  }, [startStepTransition]);

  const handleBackToSend = useCallback(() => {
    setSendError(null);
    startStepTransition('send', -1);
  }, [startStepTransition]);

  const handleOpenBurnStep = useCallback(() => {
    if (nft?.blockchain !== 'solana') {
      onBurnPress?.();
      return;
    }
    startStepTransition('burn', 1);
    onBurnPress?.();
  }, [nft?.blockchain, onBurnPress, startStepTransition]);

  const handleBackFromBurn = useCallback(() => {
    onBurnReset?.();
    startStepTransition('detail', -1);
  }, [onBurnReset, startStepTransition]);

  const handleConfirmBurn = useCallback(() => {
    onBurnConfirm?.();
  }, [onBurnConfirm]);

  const handleConfirmSend = useCallback(async () => {
    if (!nft || !addressValid || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const result = await sendNft(nft, address);
      setSuccessKind('send');
      setSuccessTxId(result.txId);
      setStep('success');
    } catch (err) {
      setSendError(classifyTransactionError(err));
    } finally {
      setSending(false);
    }
  }, [address, addressValid, nft, sendNft, sending]);

  const renderAttribute = useCallback((attribute: NftAttribute, index: number) => {
    return (
      <View key={`${attribute.trait_type}-${index}`} style={styles.attributeItem}>
        <Text style={styles.attributeName}>{attribute.trait_type}</Text>
        <Text style={styles.attributeValue}>{attribute.value}</Text>
      </View>
    );
  }, []);

  const renderBlockchainDetails = useCallback(() => {
    if (!nft) return null;

    if (isSolanaNft(nft)) {
      return (
        <>
          {nft.tokenStandard && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('nft.detail.tokenStandard', 'Token Standard')}
              </Text>
              <Text style={styles.detailValue}>{nft.tokenStandard}</Text>
            </View>
          )}
          {nft.compressed !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('nft.detail.compressed', 'Compressed')}</Text>
              <Text style={styles.detailValue}>
                {nft.compressed ? t('general.yes', 'Yes') : t('general.no', 'No')}
              </Text>
            </View>
          )}
          {nft.collectionVerified !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('nft.detail.collectionVerified', 'Collection Verified')}
              </Text>
              <Text style={styles.detailValue}>{nft.collectionVerified ? '✓' : '✗'}</Text>
            </View>
          )}
          {nft.royaltyBps !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('nft.detail.royalties', 'Royalties')}</Text>
              <Text style={styles.detailValue}>{(nft.royaltyBps / 100).toFixed(2)}%</Text>
            </View>
          )}
        </>
      );
    }

    if (isBitcoinNft(nft)) {
      return (
        <>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t('nft.detail.inscriptionNumber', 'Inscription #')}
            </Text>
            <Text style={styles.detailValue}>{nft.inscriptionNumber}</Text>
          </View>
          {nft.satRarity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('nft.detail.rarity', 'Rarity')}</Text>
              <View
                style={[styles.rarityBadge, { backgroundColor: getSatRarityColor(nft.satRarity) }]}
              >
                <Text style={styles.rarityText}>{nft.satRarity}</Text>
              </View>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('nft.detail.contentType', 'Content Type')}</Text>
            <Text style={styles.detailValue}>{nft.contentType}</Text>
          </View>
          {nft.genesisHeight && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t('nft.detail.genesisBlock', 'Genesis Block')}
              </Text>
              <Text style={styles.detailValue}>{nft.genesisHeight}</Text>
            </View>
          )}
        </>
      );
    }

    return null;
  }, [nft, t]);

  const renderNftImage = useCallback(() => {
    if (!nft) return null;

    return (
      <View style={styles.imageContainer}>
        {!nft.image || imageError ? (
          <LinearGradient
            colors={[...FALLBACK_GRADIENT.colors]}
            start={FALLBACK_GRADIENT.start}
            end={FALLBACK_GRADIENT.end}
            style={styles.nftImage}
          />
        ) : (
          <>
            <Image
              source={nft.image}
              style={styles.nftImage}
              contentFit="cover"
              autoplay={true}
              recyclingKey={nft.mint}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {imageLoading && (
              <View style={[styles.nftImage, styles.imageLoadingOverlay]}>
                <LinearGradient
                  colors={[...FALLBACK_GRADIENT.colors]}
                  start={FALLBACK_GRADIENT.start}
                  end={FALLBACK_GRADIENT.end}
                  style={StyleSheet.absoluteFill}
                />
                <ActivityIndicator size="small" color={colors.text.primary} />
              </View>
            )}
          </>
        )}
      </View>
    );
  }, [imageError, imageLoading, nft]);

  const detailHeaderContent = nft ? (
    <>
      <Text style={styles.nftName} numberOfLines={2}>
        {nft.name}
      </Text>
    </>
  ) : null;

  const sendHeaderContent = nft ? (
    <BottomSheetTitleHeader
      title={t('nft.send.title', 'Send NFT')}
      onBack={handleBackToDetail}
      backAccessibilityLabel={t('general.back', 'Back')}
    />
  ) : null;

  const reviewHeaderContent = nft ? (
    <BottomSheetTitleHeader
      title={t('nft.send.reviewTitle', 'Review Send')}
      onBack={handleBackToSend}
      backAccessibilityLabel={t('general.back', 'Back')}
    />
  ) : null;

  const burnHeaderContent = nft ? (
    <BottomSheetTitleHeader
      title={t('nft.burn.reviewTitle', 'Burn NFT')}
      onBack={handleBackFromBurn}
      backAccessibilityLabel={t('general.back', 'Back')}
    />
  ) : null;

  const headerContent =
    step === 'send'
      ? sendHeaderContent
      : step === 'review'
        ? reviewHeaderContent
        : step === 'burn'
          ? burnHeaderContent
          : step === 'detail'
            ? detailHeaderContent
            : undefined;
  const canConfirmSend = addressValid && !sending && nft?.blockchain !== 'bitcoin';
  const canConfirmBurn = !burnPreparing && !burnError && !!burnPreview;
  const lutInfo = burnPreview?.lookupTable;
  const burnBusyLabel = burnPreview
    ? t('nft.burn.submitting', 'Burning NFT...')
    : t('nft.burn.preparing', 'Preparing burn...');

  const explorerUrl = useMemo(() => {
    if (!successTxId || !nft || !account) return undefined;

    const networkId = account.getNetworkId();
    if (!networkId) return undefined;

    const blockchain = nft.blockchain.toUpperCase() as Blockchain;
    return getTransactionUrl(
      blockchain,
      networkId as NetworkEnvironment,
      getDefaultExplorer(blockchain),
      successTxId
    );
  }, [account, nft, successTxId]);

  if (!visible || !nft) {
    return null;
  }

  const renderDetailStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        { paddingBottom: spaciousContentBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {renderNftImage()}

      {nft.description && (
        <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>{t('nft.detail.description', 'Description')}</Text>
            <Text style={styles.descriptionText}>{nft.description}</Text>
          </View>
        </BlurContainer>
      )}

      {nft.attributes && nft.attributes.length > 0 && (
        <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>{t('nft.detail.attributes', 'Attributes')}</Text>
            <View style={styles.attributesGrid}>{nft.attributes.map(renderAttribute)}</View>
          </View>
        </BlurContainer>
      )}

      <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle}>{t('nft.detail.details', 'Details')}</Text>
          {renderBlockchainDetails()}
        </View>
      </BlurContainer>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          testID="nft-detail-send-button"
          style={styles.buttonWrapper}
          onPress={handleOpenSendStep}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('nft.send.title', 'Send NFT')}
        >
          <LinearGradient
            colors={[...gradients.primaryButton.colors]}
            start={gradients.primaryButton.start}
            end={gradients.primaryButton.end}
            style={styles.primaryButton}
          >
            {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
                fill. Every band is paler than the fill, so it can only raise
                the luminance under the label. */}
            <FleshBackground />
            <ArrowUpRightIcon weight="bold" size={ms(15)} color={semantic.accent.onFill} />
            <Text style={styles.primaryButtonText}>{t('actions.send', 'Send')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Burn destroys the thing on screen and nothing brings it back, so
            the trigger says so before the confirm step does — the same danger
            vocabulary the review's `isDanger` speaks, on three channels: the
            danger tint and its edge, the flame glyph, and the announced
            irreversibility. Send stays the peer it is; this is not one. */}
        <BlurContainer
          style={styles.secondaryButtonWrapper}
          blurIntensity={2.5}
          backgroundColor={semantic.status.dangerTint}
          borderColor={semantic.status.danger}
          borderWidth={borderWidth.actionButton}
        >
          <TouchableOpacity
            testID="nft-detail-burn-button"
            style={styles.secondaryButtonContent}
            onPress={handleOpenBurnStep}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('nft.burn.reviewTitle', 'Burn NFT')}
            accessibilityHint={t(
              'nft.burn.reviewBody',
              'This action is irreversible. Confirm only if you want to permanently burn this NFT.'
            )}
          >
            <FireIcon weight="fill" size={ms(18)} color={semantic.status.danger} />
            <Text style={[styles.buttonText, styles.burnButtonText]}>
              {t('nft.burn_nft', 'Burn')}
            </Text>
          </TouchableOpacity>
        </BlurContainer>
      </View>
    </ScrollView>
  );

  const renderSendStep = () => (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: spaciousContentBottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: bottomInset }}
      >
        {renderNftImage()}

        <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
          <View style={styles.sectionContent}>
            {nft.collectionName && (
              <Text style={styles.collectionName} numberOfLines={1}>
                {nft.collectionName}
              </Text>
            )}

            {nft.blockchain === 'bitcoin' ? (
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
              </>
            )}
          </View>
        </BlurContainer>

        <View style={styles.actionButtonsContainer}>
          <BlurContainer
            style={styles.secondaryButtonWrapper}
            blurIntensity={2.5}
            backgroundColor={colors.interactive.surface}
            borderColor={semantic.border.raised}
            borderWidth={borderWidth.actionButton}
          >
            <TouchableOpacity
              style={styles.secondaryButtonContent}
              onPress={handleBackToDetail}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('nft.detail.backToDetails', 'Back to NFT details')}
            >
              <Text style={styles.buttonText}>{t('actions.back', 'Back')}</Text>
            </TouchableOpacity>
          </BlurContainer>

          {nft.blockchain !== 'bitcoin' && (
            <TouchableOpacity
              testID="nft-send-continue-button"
              style={styles.buttonWrapper}
              onPress={handleOpenReviewStep}
              disabled={!canConfirmSend}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('nft.send.reviewTitle', 'Review Send')}
            >
              <LinearGradient
                colors={[...gradients.primaryButton.colors]}
                start={gradients.primaryButton.start}
                end={gradients.primaryButton.end}
                style={[styles.primaryButton, !canConfirmSend && styles.primaryButtonDisabled]}
              >
                {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
                fill. Every band is paler than the fill, so it can only raise
                the luminance under the label. */}
                {canConfirmSend && <FleshBackground />}
                <Text style={styles.primaryButtonText}>{t('actions.continue', 'Continue')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // The review step: everything the signature will move, on one card, before
  // anything is signed — the NFT, its collection, and where it is going.
  const renderReviewStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        { paddingBottom: spaciousContentBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: bottomInset }}
    >
      {renderNftImage()}

      <BlurContainer blurIntensity={10} blurTint="dark" style={styles.sectionContainer}>
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle} numberOfLines={2}>
            {nft.name}
          </Text>
          {nft.collectionName && (
            <Text style={styles.collectionName} numberOfLines={1}>
              {nft.collectionName}
            </Text>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('token.send.recipient', 'Recipient')}</Text>
            <Text style={styles.detailValue} testID="nft-send-review-recipient">
              {getShortAddress(address) ?? address}
            </Text>
          </View>
        </View>
      </BlurContainer>

      {sending && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>{t('nft.send.sending', 'Sending NFT...')}</Text>
        </View>
      )}

      {sendError && <Text style={styles.errorText}>{t(sendError)}</Text>}

      <View style={styles.actionButtonsContainer}>
        <BlurContainer
          style={styles.secondaryButtonWrapper}
          blurIntensity={2.5}
          backgroundColor={colors.interactive.surface}
          borderColor={semantic.border.raised}
          borderWidth={borderWidth.actionButton}
        >
          <TouchableOpacity
            style={styles.secondaryButtonContent}
            onPress={handleBackToSend}
            disabled={sending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('actions.back', 'Back')}
          >
            <Text style={styles.buttonText}>{t('actions.back', 'Back')}</Text>
          </TouchableOpacity>
        </BlurContainer>

        <TouchableOpacity
          testID="nft-send-confirm-button"
          style={styles.buttonWrapper}
          onPress={handleConfirmSend}
          disabled={!canConfirmSend}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('nft.send.title', 'Send NFT')}
        >
          <LinearGradient
            colors={[...gradients.primaryButton.colors]}
            start={gradients.primaryButton.start}
            end={gradients.primaryButton.end}
            style={[styles.primaryButton, !canConfirmSend && styles.primaryButtonDisabled]}
          >
            {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
                fill. Every band is paler than the fill, so it can only raise
                the luminance under the label. */}
            {canConfirmSend && <FleshBackground />}
            <ArrowUpRightIcon weight="bold" size={ms(15)} color={semantic.accent.onFill} />
            <Text style={styles.primaryButtonText}>{t('actions.send', 'Send')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBurnStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollViewContent,
        { paddingBottom: spaciousContentBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: bottomInset }}
    >
      {renderNftImage()}

      <BlurContainer blurIntensity={32} blurTint="dark" style={styles.sectionContainer}>
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle}>{t('nft.burn.reviewTitle', 'Burn NFT')}</Text>
          <Text style={styles.descriptionText}>
            {t(
              'nft.burn.reviewBody',
              'This action is irreversible. Confirm only if you want to permanently burn this NFT.'
            )}
          </Text>
        </View>
      </BlurContainer>

      {lutInfo && (
        <BlurContainer blurIntensity={32} blurTint="dark" style={styles.sectionContainer}>
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>
              {t('nft.burn.lutTitle', 'Temporary lookup table required')}
            </Text>
            <Text style={styles.descriptionText}>
              {t(
                'nft.burn.lutBody',
                'To fit this burn on Solana, Salmon needs to create a temporary address lookup table before submitting the burn transaction.'
              )}
            </Text>

            <View style={styles.warningDetailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t('nft.burn.lutRent', 'Approximate rent lock')}
                </Text>
                <Text style={styles.detailValue}>
                  {formatRawAmount(lutInfo.estimatedRentLamports, 9)} SOL
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t('nft.burn.lutAddressCount', 'Addresses stored')}
                </Text>
                <Text style={styles.detailValue}>{lutInfo.addressCount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t('nft.burn.lutSteps', 'Additional setup transactions')}
                </Text>
                <Text style={styles.detailValue}>{lutInfo.extendTransactionCount + 1}</Text>
              </View>
            </View>

            <Text style={styles.warningFootnote}>
              {t(
                'nft.burn.lutFootnote',
                'The rent stays locked in the lookup table account until it is later deactivated and closed.'
              )}
            </Text>
          </View>
        </BlurContainer>
      )}

      {burnPreparing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>{burnBusyLabel}</Text>
        </View>
      )}

      {burnError && <Text style={styles.errorText}>{t(burnError)}</Text>}

      <View style={styles.actionButtonsContainer}>
        <BlurContainer
          style={styles.secondaryButtonWrapper}
          blurIntensity={2.5}
          backgroundColor={colors.interactive.surface}
          borderColor={semantic.border.raised}
          borderWidth={borderWidth.actionButton}
        >
          <TouchableOpacity
            style={styles.secondaryButtonContent}
            onPress={handleBackFromBurn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('nft.detail.backToDetails', 'Back to NFT details')}
          >
            <Text style={styles.buttonText}>{t('actions.back', 'Back')}</Text>
          </TouchableOpacity>
        </BlurContainer>

        <TouchableOpacity
          testID="nft-burn-confirm-button"
          style={styles.buttonWrapper}
          onPress={handleConfirmBurn}
          disabled={!canConfirmBurn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('nft.burn.confirm', 'Confirm burn')}
        >
          <LinearGradient
            colors={[...gradients.primaryButton.colors]}
            start={gradients.primaryButton.start}
            end={gradients.primaryButton.end}
            style={[styles.primaryButton, !canConfirmBurn && styles.primaryButtonDisabled]}
          >
            {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
                fill. Every band is paler than the fill, so it can only raise
                the luminance under the label. */}
            {canConfirmBurn && <FleshBackground />}
            <FireIcon size={ms(18)} color={semantic.accent.onFill} />
            <Text style={styles.primaryButtonText}>{t('nft.burn_nft', 'Burn')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSlidingSteps = () => {
    if (!transitionFromStep || !transitionToStep) {
      if (step === 'detail') return renderDetailStep();
      if (step === 'send') return renderSendStep();
      if (step === 'review') return renderReviewStep();
      return renderBurnStep();
    }

    const outgoingStyle = {
      transform: [
        {
          translateX: stepTransitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, transitionDirection === 1 ? -sheetSlideDistance : sheetSlideDistance],
          }),
        },
      ],
    };

    const incomingStyle = {
      transform: [
        {
          translateX: stepTransitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [transitionDirection === 1 ? sheetSlideDistance : -sheetSlideDistance, 0],
          }),
        },
      ],
    };

    return (
      <View style={styles.stepTransitionContainer}>
        <Animated.View style={[styles.stepTransitionPane, outgoingStyle]}>
          {transitionFromStep === 'detail'
            ? renderDetailStep()
            : transitionFromStep === 'send'
              ? renderSendStep()
              : transitionFromStep === 'review'
                ? renderReviewStep()
                : renderBurnStep()}
        </Animated.View>
        <Animated.View style={[styles.stepTransitionPane, incomingStyle]}>
          {transitionToStep === 'detail'
            ? renderDetailStep()
            : transitionToStep === 'send'
              ? renderSendStep()
              : transitionToStep === 'review'
                ? renderReviewStep()
                : renderBurnStep()}
        </Animated.View>
      </View>
    );
  };

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={handleClose}
      headerContent={headerContent}
      showFadeGradient={step === 'detail'}
      fadeGradientTop={vs(12) + vs(8) + ms(24) + vs(16)}
      scrollOffsetValue={topFadeOpacity}
      style={[styles.sheetContainer, style]}
    >
      {/* Steps inside a sheet do not speak the sink and the float: the sheet
          itself is the thing that rises and ebbs, and a step sinking inside it
          is the verb said twice. The flow keeps its own sliding-step
          mechanism; the success screen arrives whole, with no entrance. */}
      {(step === 'detail' ||
        step === 'send' ||
        step === 'review' ||
        step === 'burn' ||
        transitionFromStep ||
        transitionToStep) &&
        renderSlidingSteps()}

      {step === 'success' && (
        <TransactionSuccessScreen
          title={
            successKind === 'burn'
              ? t('nft.burn.successTitle', 'NFT burned')
              : t('nft.send.successTitle', 'NFT sent')
          }
          pendingTitle={
            successKind === 'burn'
              ? t('nft.burn.submitting', 'Burning NFT...')
              : t('nft.send.sending', 'Sending NFT...')
          }
          summary={
            successKind === 'burn'
              ? t('nft.burn.successSummary', {
                  name: nft.name,
                  defaultValue: `"${nft.name}" has been burned.`,
                })
              : t('nft.send.successSummary', {
                  name: nft.name,
                  address: getShortAddress(address) ?? address,
                  defaultValue: '{{name}} sent to {{address}}',
                })
          }
          explorerUrl={explorerUrl ?? null}
          onContinue={handleSuccessContinue}
          settling={
            successKind === 'send' ? nftSettling : successKind === 'burn' ? burnSettling : false
          }
        />
      )}
    </BottomSheetContainer>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    minHeight: '85%',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  nftName: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.sm),
    paddingHorizontal: s(spacing.headerPadding),
    letterSpacing: ms(-0.32, 0.3),
  },
  keyboardView: {
    flex: 1,
  },
  stepTransitionContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  stepTransitionPane: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: s(spacing.headerPadding),
    gap: vs(spacing.lg),
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing.sm),
  },
  nftImage: {
    width: s(componentSizes.nftImageMaxWidth),
    height: s(componentSizes.nftImageMaxWidth),
    borderRadius: ms(borderRadius.iconContainer),
    ...shadows.imageHero,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  },
  sectionTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    marginBottom: vs(spacing.sm),
  },
  collectionName: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    marginBottom: vs(spacing.sm),
  },
  descriptionText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -s(spacing.xs),
  },
  attributeItem: {
    width: '50%',
    paddingHorizontal: s(spacing.xs),
    paddingVertical: vs(spacing.sm),
  },
  // The trait name is the label and the trait is the information, so the
  // emphasis runs the same way it does on a receipt row: quiet label, loud
  // value.
  attributeName: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    marginBottom: vs(spacing.xs),
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  attributeValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(spacing.sm),
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.default,
  },
  detailLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  detailValueWithCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  warningDetailList: {
    marginTop: vs(spacing.md),
  },
  warningFootnote: {
    marginTop: vs(spacing.md),
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    lineHeight: ms(fontSize.xs * lineHeight.normal),
  },
  rarityBadge: {
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xs),
    borderRadius: ms(borderRadius.badge),
  },
  rarityText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.balance,
    textTransform: 'uppercase',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: s(spacing.sm),
    marginTop: 'auto',
    paddingTop: vs(spacing.sm),
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: ms(borderRadius.button),
    overflow: 'hidden',
    ...shadows.button,
  },
  primaryButton: {
    minHeight: vs(componentSizes.buttonHeight),
    // The flesh is drawn at absolute-fill; clip it to the button's own radius.
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
    paddingHorizontal: s(spacing.lg),
    borderRadius: ms(borderRadius.button),
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonWrapper: {
    flex: 1,
    borderRadius: ms(borderRadius.button),
    overflow: 'hidden',
  },
  secondaryButtonContent: {
    minHeight: vs(componentSizes.buttonHeight),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
    paddingHorizontal: s(spacing.lg),
    borderRadius: ms(borderRadius.button),
  },
  buttonText: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.text.balance,
  },
  // The destructive trigger's label: danger ink, not the neutral balance ink
  // every other secondary button wears.
  burnButtonText: {
    color: semantic.status.danger,
  },
  // Same type as `buttonText`, but for the labels that sit on the salmon fill:
  // only `accent.onFill` clears AA there.
  primaryButtonText: {
    fontSize: ms(fontSize.base),
    // Everything on a flesh fill is bold — label and glyph alike.
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
    color: semantic.accent.onFill,
  },
  messageText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    lineHeight: ms(fontSize.sm * lineHeight.normal),
  },
  errorText: {
    marginTop: vs(spacing.sm),
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.danger,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing.xl),
  },
  loadingText: {
    marginTop: vs(spacing.sm),
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
  },
});

export default NftDetailSheet;
