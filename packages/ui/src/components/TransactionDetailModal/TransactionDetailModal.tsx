/**
 * TransactionDetailModal - Dialog for transaction details (web/extension version)
 *
 * Migrated from packages/ui (React Native) to MUI Dialog.
 *
 * Features:
 * - MUI Dialog container (replacing RN Modal + Reanimated)
 * - Scrollable content with DialogContent (replacing RN ScrollView)
 * - Transaction type header with icon and status badge
 * - Protocol/source badge
 * - Token inputs/outputs visualization
 * - Swap conversion display with price impact
 * - NFT metadata with attributes grid
 * - Network fee
 * - Action buttons (View on Explorer, Copy Hash, Share)
 * - Reuses sub-components from TransactionHistorySheet
 *
 * @example
 * ```tsx
 * <TransactionDetailModal
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   transaction={selectedTransaction}
 *   onViewExplorer={(tx) => openExplorer(tx.id)}
 *   onCopyHash={(hash) => copyToClipboard(hash)}
 *   onShare={(tx) => shareTransaction(tx)}
 * />
 * ```
 */

import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CodeIcon,
  CopyIcon,
  CubeIcon,
  FireIcon,
  LockIcon,
  PlusCircleIcon,
  QuestionIcon,
  SealCheckIcon,
  ShareNetworkIcon,
  WalletIcon,
  XCircleIcon,
  XIcon,
  iconSize,
} from '../../icons';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  copyToClipboard,
  fontFamily,
  fontSize,
  fontWeight,
  formatBlockNumber,
  formatDateTime,
  formatRawAmount,
  getShortAddress,
  letterSpacing,
  semantic,
  spacing,
  truncateHash,
  duration,
  durationMs,
  easing,
  tabularNums,
} from '@salmon/shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';

import { BlurContainer } from '../BlurContainer';
import { AddressCopyRow } from '../TransactionHistoryPage/AddressCopyRow';
import { ConversionRateDisplay } from '../TransactionHistoryPage/ConversionRateDisplay';
import { ExplorerLinkButton } from '../TransactionHistoryPage/ExplorerLinkButton';
import { PriceImpactBadge } from '../TransactionHistoryPage/PriceImpactBadge';
import type {
  NftAttribute,
  TransactionTokenAmount,
  TransactionType,
} from '../TransactionHistoryPage/types';
import type { TransactionDetailModalProps } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Transaction type display configuration (MUI icon equivalents)
 */
const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
  }
> = {
  send: {
    label: 'Sent',
    icon: <ArrowUpIcon />,
    color: colors.change.negative,
  },
  receive: {
    label: 'Received',
    icon: <ArrowDownIcon />,
    color: colors.change.positive,
  },
  swap: {
    label: 'Swapped',
    icon: <ArrowsLeftRightIcon />,
    color: colors.palette.purple,
  },
  mint: {
    label: 'Minted',
    icon: <PlusCircleIcon />,
    color: colors.palette.cyan,
  },
  burn: {
    label: 'Burned',
    icon: <FireIcon />,
    color: colors.palette.orange,
  },
  stake: {
    label: 'Staked',
    icon: <LockIcon />,
    color: colors.palette.green,
  },
  loan: {
    label: 'Loan',
    icon: <WalletIcon />,
    color: colors.palette.amber,
  },
  interaction: {
    label: 'Interaction',
    icon: <CubeIcon />,
    color: colors.palette.blue,
  },
  unknown: {
    label: 'Unknown',
    icon: <QuestionIcon />,
    color: colors.text.secondary,
  },
};

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  completed: {
    label: 'Completed',
    color: semantic.status.success,
    icon: <CheckCircleIcon size={iconSize.sm} />,
  },
  failed: {
    label: 'Failed',
    color: semantic.status.danger,
    icon: <XCircleIcon size={iconSize.sm} />,
  },
  pending: {
    label: 'Pending',
    color: semantic.status.warning,
    icon: <ClockIcon size={iconSize.sm} />,
  },
};

/**
 * Confirmation status display configuration
 */
const CONFIRMATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  processed: { label: 'Processed', color: semantic.status.warning },
  confirmed: { label: 'Confirmed', color: colors.palette.blue },
  finalized: { label: 'Finalized', color: semantic.status.success },
};

const TYPE_LABEL_KEYS: Record<TransactionType, string> = {
  send: 'transactions.detail.sent',
  receive: 'transactions.detail.received',
  swap: 'transactions.detail.swapped',
  mint: 'transactions.detail.minted',
  burn: 'transactions.detail.burned',
  stake: 'transactions.detail.staked',
  loan: 'transactions.detail.loan',
  interaction: 'transactions.detail.interaction',
  unknown: 'transactions.detail.unknown',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  completed: 'transactions.detail.completed',
  failed: 'transactions.detail.failed',
  pending: 'transactions.detail.pending',
};

const CONFIRMATION_LABEL_KEYS: Record<string, string> = {
  processed: 'transactions.detail.processed',
  confirmed: 'transactions.detail.confirmed',
  finalized: 'transactions.detail.finalized',
};

// ============================================================================
// Styled Components
// ============================================================================

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    border: `${borderWidth.thin}px solid ${colors.border.default}`,
    minWidth: `min(${componentSizes.sheetWidthMd}px, 95vw)`,
    maxWidth: `min(${componentSizes.sheetWidthXl}px, 95vw)`,
    maxHeight: '85vh',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
});

const HeaderContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderBottom: `${borderWidth.thin}px solid ${colors.border.default}`,
  position: 'relative',
  zIndex: 1,
});

const HeaderRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
});

const TypeIconContainer = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.md,
  flexShrink: 0,
});

const HeaderInfoBox = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.xs,
});

const TitleText = styled(Typography)({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.extraBold,
  color: colors.text.primary,
  letterSpacing: letterSpacing.snug,
});

const SourceBadge = styled(Box)({
  padding: `${spacing.xs}px ${spacing.sm}px`,
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.sm,
});

const SourceText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.semiWide,
});

const StatusRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
});

const CloseButton = styled(IconButton)({
  color: colors.text.secondary,
  padding: spacing.xs,
  marginLeft: 'auto',
  flexShrink: 0,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const StyledDialogContent = styled(DialogContent)({
  padding: `${spacing.md}px ${spacing.lg}px ${spacing.md}px`,
  overflowY: 'auto',
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  '&::-webkit-scrollbar': {
    width: componentSizes.scrollbarWidth,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.card.border,
    borderRadius: borderRadius.scrollbar,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: colors.interactive.highlight,
  },
});

const Section = styled(Box)({
  padding: `0 ${spacing.xs}px`,
});

const SectionRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const SectionTitle = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.secondary,
  marginBottom: spacing.md,
});

const SectionLabel = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const SectionValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

const HashValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
});

const CopyIconButton = styled(IconButton)({
  width: componentSizes.iconSizeMButton,
  height: componentSizes.iconSizeMButton,
  padding: spacing.xs,
  backgroundColor: `${colors.background.card}80`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const InternalDivider = styled(Box)({
  height: componentSizes.dividerHeight,
  backgroundColor: colors.border.subtle,
  marginTop: spacing.sm,
  marginBottom: spacing.sm,
});

const TokenLogoImg = styled('img')({
  width: componentSizes.iconSizeLarge,
  height: componentSizes.iconSizeLarge,
  borderRadius: borderRadius.xl,
  objectFit: 'cover',
  backgroundColor: colors.background.card,
});

const TokenLogoPlaceholder = styled(Box)({
  width: componentSizes.iconSizeLarge,
  height: componentSizes.iconSizeLarge,
  borderRadius: borderRadius.xl,
  backgroundColor: colors.background.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const TokenInfoBox = styled(Box)({
  flex: 1,
  marginLeft: spacing.md,
  minWidth: 0,
});

const TokenSymbol = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

const TokenName = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.regular,
  color: colors.text.secondary,
  marginTop: spacing.xxs,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const TokenAmount = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.bold,
  flexShrink: 0,
});

// Swap visualization styles
const SwapContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: `${spacing.sm}px 0`,
});

const SwapTokenSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flex: 1,
});

const SwapLogoImg = styled('img')({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  objectFit: 'cover',
  backgroundColor: colors.background.card,
});

const SwapLogoPlaceholder = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  backgroundColor: colors.background.card,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const SwapAmount = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.bold,
  color: colors.text.primary,
  marginTop: spacing.sm,
});

const SwapSymbol = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  marginTop: spacing.xxs,
});

const SwapHeaderRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.md,
});

const ConversionRateContainer = styled(Box)({
  marginTop: spacing.md,
  paddingTop: spacing.md,
  borderTop: `${borderWidth.thin}px solid ${colors.border.default}`,
  display: 'flex',
  justifyContent: 'center',
});

// Address section styles
const AddressesContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

// NFT styles
const NftMediaContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.lg,
});

const NftMediaPreview = styled('img')({
  width: componentSizes.logoSizeMedium,
  height: componentSizes.logoSizeMedium,
  borderRadius: borderRadius.md,
  objectFit: 'cover',
  backgroundColor: colors.background.card,
});

const NftCollectionRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.md,
});

const NftCollectionInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

const NftAttributesGrid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing.sm,
});

const NftAttributeChip = styled(Box)({
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.sm,
  padding: `${spacing.sm}px ${spacing.base}px`,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  minWidth: '45%',
  flex: '0 0 auto',
  boxSizing: 'border-box',
});

const NftAttributeType = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.semiWide,
  marginBottom: spacing.xxs,
});

const NftAttributeValue = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

// Fixed bottom bar
const FixedBottomBar = styled(Box)({
  padding: `${spacing.md}px ${spacing.lg}px ${spacing.lg}px`,
  borderTop: `${borderWidth.thin}px solid ${colors.border.subtle}`,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
  position: 'relative',
  zIndex: 1,
});

// Action buttons
const ActionsContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'space-around',
  gap: spacing.sm,
});

const ActionButton = styled(ButtonBase)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.md,
  padding: `${spacing.md}px`,
  gap: spacing.xs,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  transition: `background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor: `${colors.background.card}cc`,
  },
});

const ActionButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

// Confirmation badge
const ConfirmationBadge = styled(Box)({
  padding: `${spacing.xxs}px ${spacing.sm}px`,
  borderRadius: borderRadius.sm,
  display: 'inline-flex',
});

const ConfirmationText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wide,
});

// Swap route hop styles
const HopRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: `${spacing.xs}px 0`,
  gap: spacing.sm,
});

const HopBadge = styled(Box)({
  padding: `${spacing.xxs}px ${spacing.sm}px`,
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.sm,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const HopBadgeText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

const HopTokens = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
});

const HopTokenText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
});

const HopPercent = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.tertiary,
  flexShrink: 0,
});

// Developer info section styles
const DevSectionHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
  marginBottom: spacing.md,
});

const DevBadge = styled(Box)({
  padding: `${spacing.xxs}px ${spacing.sm}px`,
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.sm,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  display: 'inline-flex',
});

const DevBadgeText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wide,
});

const DevSubSection = styled(Box)({
  marginTop: spacing.md,
  paddingTop: spacing.sm,
  borderTop: `${borderWidth.thin}px solid ${colors.border.default}`,
});

const DevSubTitle = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: colors.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wide,
  marginBottom: spacing.xs,
});

const DevRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${spacing.xs}px 0`,
});

const DevMonoText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
});

const DevSecondaryText = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.regular,
  color: colors.text.tertiary,
});

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Token logo component with fallback
 */
const TokenLogo: React.FC<{ uri?: string | null; size?: number }> = ({
  uri,
  size = componentSizes.iconSizeLarge,
}) => {
  if (uri) {
    return (
      <TokenLogoImg
        src={uri}
        alt=""
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <TokenLogoPlaceholder sx={{ width: size, height: size, borderRadius: `${size / 2}px` }}>
      <QuestionIcon size={size * 0.6} color={colors.text.secondary} />
    </TokenLogoPlaceholder>
  );
};

/**
 * Token amount row component
 */
const TokenAmountRow: React.FC<{
  token: TransactionTokenAmount;
  sign: '+' | '-';
}> = ({ token, sign }) => {
  const color = sign === '+' ? colors.change.positive : colors.change.negative;
  const formattedAmount = formatRawAmount(token.amount, token.decimals);

  return (
    <BlurContainer
      style={{
        borderRadius: borderRadius.md,
        padding: spacing.md,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <TokenLogo uri={token.logo} size={32} />
      <TokenInfoBox>
        <TokenSymbol>{token.symbol}</TokenSymbol>
        {token.name && <TokenName>{token.name}</TokenName>}
      </TokenInfoBox>
      <TokenAmount sx={{ color }}>
        {sign} {formattedAmount}
      </TokenAmount>
    </BlurContainer>
  );
};

/**
 * Swap visualization component
 */
const SwapVisualization: React.FC<{
  outputs: TransactionTokenAmount[];
  inputs: TransactionTokenAmount[];
}> = ({ outputs, inputs }) => {
  const fromToken = outputs[0];
  const toToken = inputs[0];

  if (!fromToken || !toToken) return null;

  return (
    <SwapContainer>
      <SwapTokenSection>
        {fromToken.logo ? (
          <SwapLogoImg src={fromToken.logo} alt={fromToken.symbol} />
        ) : (
          <SwapLogoPlaceholder>
            <QuestionIcon size={iconSize.lg} color={colors.text.secondary} />
          </SwapLogoPlaceholder>
        )}
        <SwapAmount>{formatRawAmount(fromToken.amount, fromToken.decimals)}</SwapAmount>
        <SwapSymbol>{fromToken.symbol}</SwapSymbol>
      </SwapTokenSection>
      <Box sx={{ px: `${spacing.md}px` }}>
        <ArrowRightIcon size={iconSize.lg} color={colors.text.secondary} />
      </Box>
      <SwapTokenSection>
        {toToken.logo ? (
          <SwapLogoImg src={toToken.logo} alt={toToken.symbol} />
        ) : (
          <SwapLogoPlaceholder>
            <QuestionIcon size={iconSize.lg} color={colors.text.secondary} />
          </SwapLogoPlaceholder>
        )}
        <SwapAmount>{formatRawAmount(toToken.amount, toToken.decimals)}</SwapAmount>
        <SwapSymbol>{toToken.symbol}</SwapSymbol>
      </SwapTokenSection>
    </SwapContainer>
  );
};

/**
 * NFT Attribute chip component
 */
const NftAttributeChipComponent: React.FC<{ attribute: NftAttribute }> = ({ attribute }) => {
  return (
    <NftAttributeChip>
      <NftAttributeType>{attribute.trait_type}</NftAttributeType>
      <NftAttributeValue>{String(attribute.value)}</NftAttributeValue>
    </NftAttributeChip>
  );
};

/**
 * NFT Metadata section component
 */
const NftMetadataSection: React.FC<{
  token: TransactionTokenAmount;
}> = ({ token }) => {
  const { t } = useTranslation();
  if (!token.isNft) return null;

  return (
    <Section>
      <SectionTitle>{t('transactions.detail.nftDetails', 'NFT Details')}</SectionTitle>

      {/* NFT Media Preview */}
      {token.nftMedia && (
        <NftMediaContainer>
          <NftMediaPreview
            src={token.nftMedia}
            alt={t('transactions.detail.nftMediaAlt', 'NFT media')}
          />
        </NftMediaContainer>
      )}

      {/* Collection Info */}
      {token.nftCollection && (
        <NftCollectionRow>
          <SectionLabel>{t('transactions.detail.collection', 'Collection')}</SectionLabel>
          <NftCollectionInfo>
            <SectionValue>{token.nftCollection}</SectionValue>
            {token.nftCollectionVerified && (
              <SealCheckIcon
                size={iconSize.sm}
                color={semantic.status.success}
                style={{ marginLeft: spacing.xs }}
              />
            )}
          </NftCollectionInfo>
        </NftCollectionRow>
      )}

      {/* NFT Attributes Grid */}
      {token.nftAttributes && token.nftAttributes.length > 0 && (
        <Box sx={{ mt: `${spacing.sm}px` }}>
          <Typography
            sx={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: colors.text.secondary,
              mb: `${spacing.sm}px`,
            }}
          >
            {t('transactions.detail.attributes', 'Attributes')}
          </Typography>
          <NftAttributesGrid>
            {token.nftAttributes.map((attr, index) => (
              <NftAttributeChipComponent key={`${attr.trait_type}-${index}`} attribute={attr} />
            ))}
          </NftAttributesGrid>
        </Box>
      )}
    </Section>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function TransactionDetailModal({
  visible,
  onClose,
  transaction,
  onViewExplorer,
  onCopyHash,
  onShare,
  developerMode,
  className,
  style,
}: TransactionDetailModalProps) {
  const { t } = useTranslation();
  // Inline hash copy state
  const [hashCopied, setHashCopied] = useState(false);

  const handleCopyInlineHash = useCallback(async () => {
    if (!transaction) return;
    try {
      await copyToClipboard(transaction.id);
      if (onCopyHash) onCopyHash(transaction.id);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), durationMs.feedbackShort);
    } catch (error) {
      console.warn('Failed to copy hash:', error);
    }
  }, [transaction, onCopyHash]);

  const handleShare = useCallback(() => {
    if (transaction && onShare) {
      onShare(transaction);
    }
  }, [transaction, onShare]);

  // Get transaction config
  const typeConfig = useMemo(() => {
    if (!transaction) return TRANSACTION_TYPE_CONFIG.unknown;
    return TRANSACTION_TYPE_CONFIG[transaction.type] || TRANSACTION_TYPE_CONFIG.unknown;
  }, [transaction]);

  const statusConfig = useMemo(() => {
    if (!transaction) return STATUS_CONFIG.completed;
    return STATUS_CONFIG[transaction.status] || STATUS_CONFIG.completed;
  }, [transaction]);

  if (!transaction) {
    return null;
  }

  return (
    <StyledDialog
      open={visible}
      onClose={onClose}
      data-testid="tx-detail-modal"
      aria-labelledby="transaction-detail-title"
      className={className}
      PaperProps={{ style }}
      disableEnforceFocus
    >
      {/* Header */}
      <HeaderContainer>
        <HeaderRow>
          {/* Type icon */}
          <TypeIconContainer sx={{ backgroundColor: `${typeConfig.color}20` }}>
            <Box
              sx={{
                display: 'flex',
                color: typeConfig.color,
                '& > svg': { fontSize: fontSize.xl },
              }}
            >
              {typeConfig.icon}
            </Box>
          </TypeIconContainer>

          {/* Title and source */}
          <HeaderInfoBox>
            <TitleRow>
              <TitleText id="transaction-detail-title">
                {t(TYPE_LABEL_KEYS[transaction.type] ?? TYPE_LABEL_KEYS.unknown, typeConfig.label)}
              </TitleText>
              {transaction.source && (
                <SourceBadge>
                  <SourceText>{transaction.source}</SourceText>
                </SourceBadge>
              )}
            </TitleRow>

            {/* Status */}
            <StatusRow sx={{ color: statusConfig.color }}>
              {statusConfig.icon}
              <Typography
                sx={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium,
                  color: statusConfig.color,
                }}
              >
                {t(STATUS_LABEL_KEYS[transaction.status] ?? '', statusConfig.label)}
              </Typography>
            </StatusRow>
          </HeaderInfoBox>

          {/* Close button */}
          <CloseButton
            onClick={onClose}
            aria-label={t('general.close')}
            data-testid="tx-detail-close-button"
          >
            <XIcon />
          </CloseButton>
        </HeaderRow>
      </HeaderContainer>

      {/* Content */}
      <StyledDialogContent>
        {/* Card 1 — Details: Date/Time + Confirmation + Block */}
        <Section>
          <BlurContainer style={{ borderRadius: borderRadius.md, padding: spacing.md }}>
            <SectionRow>
              <SectionLabel>{t('transactions.detail.dateTime', 'Date & Time')}</SectionLabel>
              <SectionValue>{formatDateTime(transaction.timestamp)}</SectionValue>
            </SectionRow>

            {transaction.confirmationStatus && (
              <>
                <InternalDivider />
                <SectionRow>
                  <SectionLabel>
                    {t('transactions.detail.confirmation', 'Confirmation')}
                  </SectionLabel>
                  <ConfirmationBadge
                    sx={{
                      backgroundColor: `${CONFIRMATION_STATUS_CONFIG[transaction.confirmationStatus]?.color ?? colors.text.secondary}20`,
                    }}
                  >
                    <ConfirmationText
                      sx={{
                        color:
                          CONFIRMATION_STATUS_CONFIG[transaction.confirmationStatus]?.color ??
                          colors.text.secondary,
                      }}
                    >
                      {t(
                        CONFIRMATION_LABEL_KEYS[transaction.confirmationStatus] ?? '',
                        CONFIRMATION_STATUS_CONFIG[transaction.confirmationStatus]?.label ??
                          transaction.confirmationStatus
                      )}
                    </ConfirmationText>
                  </ConfirmationBadge>
                </SectionRow>
              </>
            )}

            {transaction.slot && (
              <>
                <InternalDivider />
                <SectionRow>
                  <SectionLabel>{t('transactions.detail.block', 'Block')}</SectionLabel>
                  <SectionValue>#{formatBlockNumber(transaction.slot)}</SectionValue>
                </SectionRow>
              </>
            )}
          </BlurContainer>
        </Section>

        {/* Swap Visualization (for swaps) */}
        {transaction.type === 'swap' && (
          <Section>
            <SwapHeaderRow>
              <SectionTitle sx={{ mb: 0 }}>
                {t('transactions.detail.conversion', 'Conversion')}
              </SectionTitle>
              {transaction.swapRoute?.priceImpact && (
                <PriceImpactBadge
                  value={transaction.swapRoute.priceImpact}
                  size="medium"
                  showIcon
                />
              )}
            </SwapHeaderRow>
            <SwapVisualization outputs={transaction.outputs} inputs={transaction.inputs} />
            {transaction.swapRoute?.conversionRate && (
              <ConversionRateContainer>
                <ConversionRateDisplay
                  fromSymbol={transaction.swapRoute.conversionRate.fromSymbol}
                  toSymbol={transaction.swapRoute.conversionRate.toSymbol}
                  rate={transaction.swapRoute.conversionRate.rate}
                  size="medium"
                />
              </ConversionRateContainer>
            )}
          </Section>
        )}

        {/* Swap Route Hops (for multi-hop swaps) */}
        {transaction.type === 'swap' &&
          transaction.swapRoute?.hops &&
          transaction.swapRoute.hops.length > 0 && (
            <Section>
              <SectionTitle>{t('transactions.detail.swapRoute', 'Swap Route')}</SectionTitle>
              {transaction.swapRoute.hops.map((hop, index) => (
                <HopRow key={`hop-${index}`}>
                  <HopBadge>
                    <HopBadgeText>{hop.dex}</HopBadgeText>
                  </HopBadge>
                  <HopTokens>
                    <HopTokenText>{hop.inputToken.symbol}</HopTokenText>
                    <ArrowRightIcon size={iconSize.sm} color={colors.text.tertiary} />
                    <HopTokenText>{hop.outputToken.symbol}</HopTokenText>
                  </HopTokens>
                  {hop.percent < 100 && <HopPercent>{hop.percent}%</HopPercent>}
                </HopRow>
              ))}
            </Section>
          )}

        {/* Card 2 — Tokens (non-swap): Sent + Received merged */}
        {transaction.type !== 'swap' &&
          (transaction.outputs.length > 0 || transaction.inputs.length > 0) && (
            <Section>
              {transaction.outputs.length > 0 && (
                <>
                  <SectionTitle>{t('transactions.detail.sentLabel', 'Sent')}</SectionTitle>
                  {transaction.outputs.map((token, index) => (
                    <TokenAmountRow key={`out-${index}`} token={token} sign="-" />
                  ))}
                </>
              )}
              {transaction.outputs.length > 0 && transaction.inputs.length > 0 && (
                <InternalDivider />
              )}
              {transaction.inputs.length > 0 && (
                <>
                  <SectionTitle>{t('transactions.detail.receivedLabel', 'Received')}</SectionTitle>
                  {transaction.inputs.map((token, index) => (
                    <TokenAmountRow key={`in-${index}`} token={token} sign="+" />
                  ))}
                </>
              )}
            </Section>
          )}

        {/* Address Section */}
        {(transaction.outputs.some((t) => t.destination) ||
          transaction.inputs.some((t) => t.source) ||
          transaction.feePayer) && (
          <Section>
            <SectionTitle>{t('transactions.detail.addresses', 'Addresses')}</SectionTitle>
            <AddressesContainer>
              {transaction.outputs.map((token, index) =>
                token.destination ? (
                  <AddressCopyRow
                    key={`to-${index}`}
                    label={t('transactions.to', 'To')}
                    address={token.destination}
                    truncate="medium"
                  />
                ) : null
              )}
              {transaction.inputs.map((token, index) =>
                token.source ? (
                  <AddressCopyRow
                    key={`from-${index}`}
                    label={t('transactions.from', 'From')}
                    address={token.source}
                    truncate="medium"
                  />
                ) : null
              )}
              {transaction.feePayer && (
                <AddressCopyRow
                  label={t('transactions.detail.feePayer', 'Fee Payer')}
                  address={transaction.feePayer}
                  truncate="medium"
                />
              )}
            </AddressesContainer>
          </Section>
        )}

        {/* NFT Metadata Sections */}
        {transaction.inputs
          .filter((token) => token.isNft)
          .map((token, index) => (
            <NftMetadataSection key={`nft-in-${index}`} token={token} />
          ))}
        {transaction.outputs
          .filter((token) => token.isNft)
          .map((token, index) => (
            <NftMetadataSection key={`nft-out-${index}`} token={token} />
          ))}

        {/* Card 3 — Transaction Info: Fee + Swap Fee + Hash merged */}
        <Section>
          <BlurContainer style={{ borderRadius: borderRadius.md, padding: spacing.md }}>
            {transaction.fee && (
              <SectionRow>
                <SectionLabel>{t('transactions.detail.networkFee', 'Network Fee')}</SectionLabel>
                <SectionValue>
                  {formatRawAmount(transaction.fee.amount, transaction.fee.decimals)}{' '}
                  {transaction.fee.symbol}
                </SectionValue>
              </SectionRow>
            )}

            {transaction.swapRoute?.totalFee && (
              <>
                {transaction.fee && <InternalDivider />}
                <SectionRow>
                  <SectionLabel>{t('transactions.detail.swapFee', 'Swap Fee')}</SectionLabel>
                  <SectionValue>
                    {transaction.swapRoute.totalFee.amount} {transaction.swapRoute.totalFee.symbol}
                  </SectionValue>
                </SectionRow>
              </>
            )}

            {(transaction.fee || transaction.swapRoute?.totalFee) && <InternalDivider />}

            <SectionRow>
              <SectionLabel>
                {t('transactions.detail.transactionHash', 'Transaction Hash')}
              </SectionLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: `${spacing.xs}px` }}>
                <HashValue>{truncateHash(transaction.id, 8)}</HashValue>
                <CopyIconButton
                  onClick={handleCopyInlineHash}
                  size="small"
                  aria-label={t('transactions.detail.copyTransactionHash')}
                  data-testid="tx-detail-copy-hash"
                  sx={hashCopied ? { backgroundColor: `${semantic.status.success}20` } : undefined}
                >
                  {hashCopied ? (
                    <CheckIcon size={iconSize.sm} color={semantic.status.success} />
                  ) : (
                    <CopyIcon size={iconSize.sm} color={colors.text.secondary} />
                  )}
                </CopyIconButton>
              </Box>
            </SectionRow>
          </BlurContainer>
        </Section>

        {/* Developer Info (dev mode only) */}
        {developerMode && (
          <Section>
            <DevSectionHeader>
              <CodeIcon size={iconSize.sm} color={colors.text.secondary} />
              <SectionTitle sx={{ mb: 0 }}>
                {t('transactions.detail.developerInfo', 'Developer Info')}
              </SectionTitle>
            </DevSectionHeader>

            {transaction.heliusType && (
              <SectionRow>
                <SectionLabel>{t('transactions.detail.heliusType', 'Helius Type')}</SectionLabel>
                <DevBadge>
                  <DevBadgeText>{transaction.heliusType}</DevBadgeText>
                </DevBadge>
              </SectionRow>
            )}

            {transaction.accountsInvolved != null && (
              <SectionRow sx={{ mt: `${spacing.sm}px` }}>
                <SectionLabel>
                  {t('transactions.detail.accountsInvolved', 'Accounts Involved')}
                </SectionLabel>
                <SectionValue>{transaction.accountsInvolved}</SectionValue>
              </SectionRow>
            )}

            {transaction.instructions && transaction.instructions.length > 0 && (
              <DevSubSection>
                <DevSubTitle>{t('transactions.detail.programs', 'Programs')}</DevSubTitle>
                {transaction.instructions.map((ix, index) => (
                  <DevRow key={`ix-${index}`}>
                    <DevMonoText>{getShortAddress(ix.programId, 6)}</DevMonoText>
                    {ix.innerInstructionsCount > 0 && (
                      <DevSecondaryText>
                        {t('transactions.detail.innerCount', { count: ix.innerInstructionsCount })}
                      </DevSecondaryText>
                    )}
                  </DevRow>
                ))}
              </DevSubSection>
            )}

            {transaction.innerSwaps && transaction.innerSwaps.length > 0 && (
              <DevSubSection>
                <DevSubTitle>{t('transactions.detail.innerSwaps', 'Inner Swaps')}</DevSubTitle>
                {transaction.innerSwaps.map((swap, index) => (
                  <DevRow key={`inner-${index}`}>
                    <DevMonoText>{swap.programInfo.source}</DevMonoText>
                    <DevSecondaryText>
                      {swap.programInfo.programName} / {swap.programInfo.instructionName}
                    </DevSecondaryText>
                  </DevRow>
                ))}
              </DevSubSection>
            )}

            {transaction.swapFees && (
              <DevSubSection>
                <DevSubTitle>{t('transactions.detail.swapFees', 'Swap Fees')}</DevSubTitle>
                {transaction.swapFees.nativeFees.map((fee, index) => (
                  <DevRow key={`nfee-${index}`}>
                    <DevMonoText>{getShortAddress(fee.account, 6)}</DevMonoText>
                    <DevSecondaryText>{fee.amount} SOL</DevSecondaryText>
                  </DevRow>
                ))}
                {transaction.swapFees.tokenFees.map((fee, index) => (
                  <DevRow key={`tfee-${index}`}>
                    <DevMonoText>{getShortAddress(fee.account, 6)}</DevMonoText>
                    <DevSecondaryText>
                      {fee.amount} ({getShortAddress(fee.mint, 4)})
                    </DevSecondaryText>
                  </DevRow>
                ))}
              </DevSubSection>
            )}
          </Section>
        )}
      </StyledDialogContent>

      {/* Fixed Bottom Action Bar */}
      <FixedBottomBar>
        <ExplorerLinkButton
          txHash={transaction.id}
          blockchain="SOLANA"
          environment="solana-mainnet"
          showMenu
          onPress={(_url, _explorerName) => {
            if (onViewExplorer) {
              onViewExplorer(transaction);
            }
          }}
        />
        {onShare && (
          <ActionsContainer>
            <ActionButton onClick={handleShare} data-testid="tx-detail-share-button">
              <ShareNetworkIcon size={iconSize.md} color={colors.text.primary} />
              <ActionButtonText>{t('transactions.detail.share', 'Share')}</ActionButtonText>
            </ActionButton>
          </ActionsContainer>
        )}
      </FixedBottomBar>
    </StyledDialog>
  );
}
