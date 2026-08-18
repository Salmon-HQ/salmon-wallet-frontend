/**
 * NftSendDialog - Dialog for sending an NFT to another address
 *
 * Simple MUI Dialog with:
 * - NFT preview (image + name)
 * - Address input with per-chain validation
 * - Confirm/Cancel buttons
 * - Loading/success/error states
 *
 * Supports Solana (SPL), Ethereum (ERC721/ERC1155).
 * Bitcoin ordinals show "not supported" message.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  type BlockchainType,
  fontSize,
  componentSizes,
} from '@salmon/shared';
import { BaseDialog, MessageText } from '../BaseDialog';
import { InputAddress } from '../InputAddress';
import type { ValidationCallbackResult } from '../InputAddress';
import type { NftSendDialogProps } from './types';

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
  fontSize: fontSize.md,
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
  const [address, setAddress] = useState('');
  const [addressValid, setAddressValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendNft, reset: resetTransfer } = useNftTransfer({ account });

  const blockchain: BlockchainType = nft?.blockchain ?? 'solana';
  const isBitcoin = blockchain === 'bitcoin';

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setAddress('');
      setAddressValid(false);
      setLoading(false);
      setError(null);
      resetTransfer();
    }
  }, [visible, resetTransfer]);

  const handleValidation = useCallback((result: ValidationCallbackResult) => {
    setAddressValid(result.isValid);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!nft || !addressValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sendNft(nft, address);
      onSuccess?.(result.txId);
      onClose();
    } catch (err) {
      setError(t(classifyTransactionError(err)));
      setLoading(false);
    }
  }, [nft, address, addressValid, loading, sendNft, onSuccess, onClose, t]);

  const canConfirm = addressValid && !loading && !isBitcoin;

  return (
    <BaseDialog visible={visible} onClose={onClose} dismissible={!loading}>
      <BaseDialog.Header title={t('nft.send_nft', 'Send NFT')} />

      <BaseDialog.Content>
        {/* NFT Preview */}
        {nft && (
          <NftPreview>
            {nft.image && <NftImage src={nft.image} alt={nft.name} />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <NftName>{nft.name}</NftName>
              {nft.collectionName && <NftCollection>{nft.collectionName}</NftCollection>}
            </Box>
          </NftPreview>
        )}

        {isBitcoin ? (
          <MessageText>
            {t('nft.ordinal_send_unsupported', 'Ordinal transfers are not yet supported.')}
          </MessageText>
        ) : loading ? (
          <StatusContainer>
            <CircularProgress
              size={componentSizes.iconSizeLarge}
              sx={{ color: colors.accent.primary }}
            />
            <MessageText>{t('nft.sending', 'Sending NFT...')}</MessageText>
          </StatusContainer>
        ) : (
          <>
            <InputAddress
              address={address}
              onChange={setAddress}
              onValidation={handleValidation}
              placeholder={t('send.enter_address', 'Enter recipient address')}
              label={t('send.recipient', 'Recipient')}
            />

            {error && (
              <MessageText sx={{ color: semantic.status.danger, mt: `${spacing.sm}px` }}>
                {error}
              </MessageText>
            )}
          </>
        )}
      </BaseDialog.Content>

      <BaseDialog.Actions>
        <BaseDialog.CancelButton
          onClick={onClose}
          disabled={loading}
          testID="nft-send-cancel-button"
        >
          {t('actions.cancel', 'Cancel')}
        </BaseDialog.CancelButton>
        {!isBitcoin && (
          <BaseDialog.ActionButton
            onClick={handleConfirm}
            disabled={!canConfirm}
            testID="nft-send-confirm-button"
          >
            {loading ? t('actions.sending', 'Sending...') : t('actions.send', 'Send')}
          </BaseDialog.ActionButton>
        )}
      </BaseDialog.Actions>
    </BaseDialog>
  );
}
