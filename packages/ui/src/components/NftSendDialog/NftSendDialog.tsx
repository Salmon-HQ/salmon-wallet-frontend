/**
 * NftSendDialog - Dialog for sending an NFT to another address
 *
 * Three-step flow inside a MUI Dialog:
 * - input: NFT preview + address input with per-chain validation
 * - review: everything the signature will move — the NFT, its collection,
 *   and the recipient — shown before anything is signed
 * - success: the shared TransactionSuccessScreen receipt with explorer link
 *
 * Supports Solana (SPL), Ethereum (ERC721/ERC1155).
 * Bitcoin ordinals show "not supported" message.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import {
  colors,
  semantic,
  spacing,
  fontFamily,
  fontWeight,
  borderRadius,
  useNftTransfer,
  classifyTransactionError,
  getShortAddress,
  getTransactionUrl,
  getDefaultExplorer,
  type Blockchain,
  type BlockchainType,
  type NetworkEnvironment,
  fontSize,
  componentSizes,
} from '@salmon/shared';
import { BaseDialog, MessageText } from '../BaseDialog';
import { InputAddress } from '../InputAddress';
import type { ValidationCallbackResult } from '../InputAddress';
import { TransactionSuccessScreen } from '../TransactionSuccessScreen';
import type { NftSendDialogProps } from './types';

type NftSendStep = 'input' | 'review' | 'success';

// ============================================================================
// Styled Components
// ============================================================================

const NftPreview = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  marginBottom: spacing.lg,
});

const NftImage = styled('img')({
  width: componentSizes.buttonHeight,
  height: componentSizes.buttonHeight,
  borderRadius: borderRadius.md,
  objectFit: 'cover',
  backgroundColor: colors.background.card,
});

const NftName = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const NftCollection = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const StatusContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: spacing.md,
  padding: `${spacing.lg}px 0`,
});

const ReviewRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.md,
  padding: `${spacing.sm}px 0`,
});

const ReviewLabel = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

const ReviewValue = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
});

/**
 * The receipt is written for a full page; inside a dialog it needs
 * a stage with real height so the report reads from the top and the actions
 * sit at the bottom edge.
 */
const SuccessStage = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minHeight: componentSizes.dialogStageMinHeight,
});

// ============================================================================
// Component
// ============================================================================

export function NftSendDialog({
  visible,
  onClose,
  nft,
  account,
  onSuccess,
}: NftSendDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [step, setStep] = useState<NftSendStep>('input');
  const [address, setAddress] = useState('');
  const [addressValid, setAddressValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);

  const { sendNft, reset: resetTransfer, settling } = useNftTransfer({ account });

  const blockchain: BlockchainType = nft?.blockchain ?? 'solana';
  const isBitcoin = blockchain === 'bitcoin';

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setStep('input');
      setAddress('');
      setAddressValid(false);
      setLoading(false);
      setError(null);
      setSuccessTxId(null);
      resetTransfer();
    }
  }, [visible, resetTransfer]);

  const handleValidation = useCallback((result: ValidationCallbackResult) => {
    setAddressValid(result.isValid);
  }, []);

  const handleContinueToReview = useCallback(() => {
    if (!addressValid || loading || isBitcoin) return;
    setError(null);
    setStep('review');
  }, [addressValid, loading, isBitcoin]);

  const handleBackToInput = useCallback(() => {
    if (loading) return;
    setError(null);
    setStep('input');
  }, [loading]);

  const handleConfirm = useCallback(async () => {
    if (!nft || !addressValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sendNft(nft, address);
      setSuccessTxId(result.txId);
      setStep('success');
    } catch (err) {
      setError(t(classifyTransactionError(err)));
    } finally {
      setLoading(false);
    }
  }, [nft, address, addressValid, loading, sendNft, t]);

  // The success receipt is the flow's close: leaving it — via Continue or by
  // dismissing the dialog — reports the txId to the host exactly once.
  const handleSuccessContinue = useCallback(() => {
    if (successTxId) {
      onSuccess?.(successTxId);
    }
    onClose();
  }, [successTxId, onSuccess, onClose]);

  const handleDialogClose = useCallback(() => {
    if (step === 'success') {
      handleSuccessContinue();
      return;
    }
    onClose();
  }, [step, handleSuccessContinue, onClose]);

  const explorerUrl = useMemo(() => {
    if (!successTxId || !nft || !account) return null;

    const networkId = account.getNetworkId();
    if (!networkId) return null;

    const chain = nft.blockchain.toUpperCase() as Blockchain;
    return getTransactionUrl(
      chain,
      networkId as NetworkEnvironment,
      getDefaultExplorer(chain),
      successTxId
    );
  }, [account, nft, successTxId]);

  const canConfirm = addressValid && !loading && !isBitcoin;

  const nftPreview = nft && (
    <NftPreview>
      {nft.image && <NftImage src={nft.image} alt={nft.name} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <NftName>{nft.name}</NftName>
        {nft.collectionName && <NftCollection>{nft.collectionName}</NftCollection>}
      </Box>
    </NftPreview>
  );

  if (step === 'success') {
    return (
      <BaseDialog visible={visible} onClose={handleDialogClose} dismissible>
        <BaseDialog.Content>
          <SuccessStage>
            <TransactionSuccessScreen
              title={t('nft.send.successTitle', 'NFT sent')}
              pendingTitle={t('nft.send.sending', 'Sending NFT...')}
              summary={t('nft.send.successSummary', {
                name: nft?.name ?? '',
                address: getShortAddress(address) ?? address,
                defaultValue: '{{name}} sent to {{address}}',
              })}
              explorerUrl={explorerUrl}
              onContinue={handleSuccessContinue}
              settling={settling}
            />
          </SuccessStage>
        </BaseDialog.Content>
      </BaseDialog>
    );
  }

  if (step === 'review') {
    return (
      <BaseDialog visible={visible} onClose={handleDialogClose} dismissible={!loading}>
        <BaseDialog.Header title={t('nft.send.reviewTitle', 'Review Send')} />

        <BaseDialog.Content>
          {nftPreview}

          <ReviewRow>
            <ReviewLabel>{t('send.recipient', 'Recipient')}</ReviewLabel>
            <ReviewValue data-testid="nft-send-review-recipient">
              {getShortAddress(address) ?? address}
            </ReviewValue>
          </ReviewRow>

          {loading && (
            <StatusContainer>
              <CircularProgress
                size={componentSizes.iconSizeLarge}
                sx={{ color: colors.accent.primary }}
              />
              <MessageText>{t('nft.send.sending', 'Sending NFT...')}</MessageText>
            </StatusContainer>
          )}

          {error && (
            <MessageText sx={{ color: semantic.status.danger, mt: `${spacing.sm}px` }}>
              {error}
            </MessageText>
          )}
        </BaseDialog.Content>

        <BaseDialog.Actions>
          <BaseDialog.CancelButton
            onClick={handleBackToInput}
            disabled={loading}
            testID="nft-send-back-button"
          >
            {t('actions.back', 'Back')}
          </BaseDialog.CancelButton>
          <BaseDialog.ActionButton
            onClick={handleConfirm}
            disabled={!canConfirm}
            testID="nft-send-confirm-button"
          >
            {loading ? t('actions.sending', 'Sending...') : t('actions.send', 'Send')}
          </BaseDialog.ActionButton>
        </BaseDialog.Actions>
      </BaseDialog>
    );
  }

  return (
    <BaseDialog visible={visible} onClose={handleDialogClose} dismissible={!loading}>
      <BaseDialog.Header title={t('nft.send_nft', 'Send NFT')} />

      <BaseDialog.Content>
        {nftPreview}

        {isBitcoin ? (
          <MessageText>
            {t('nft.ordinal_send_unsupported', 'Ordinal transfers are not yet supported.')}
          </MessageText>
        ) : (
          <InputAddress
            address={address}
            onChange={setAddress}
            onValidation={handleValidation}
            placeholder={t('send.enter_address', 'Enter recipient address')}
            label={t('send.recipient', 'Recipient')}
          />
        )}
      </BaseDialog.Content>

      <BaseDialog.Actions>
        <BaseDialog.CancelButton onClick={onClose} testID="nft-send-cancel-button">
          {t('actions.cancel', 'Cancel')}
        </BaseDialog.CancelButton>
        {!isBitcoin && (
          <BaseDialog.ActionButton
            onClick={handleContinueToReview}
            disabled={!canConfirm}
            testID="nft-send-continue-button"
          >
            {t('actions.continue', 'Continue')}
          </BaseDialog.ActionButton>
        )}
      </BaseDialog.Actions>
    </BaseDialog>
  );
}
