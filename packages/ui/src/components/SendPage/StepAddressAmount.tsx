/**
 * StepAddressAmount - Address and amount entry step for the SendSheet (web/extension version)
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 * Features:
 * - Selected token display card (clickable to go back)
 * - Recipient address input
 * - Amount input with quick-fill percentage buttons (25%, 50%, MAX)
 * - USD conversion display
 * - Cancel and Review & Send action buttons
 */

import React, { useCallback, useMemo, useState } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  componentSizes,
  gradients,
  semantic,
  fontFamily,
  fontWeight,
  useAddressValidation,
  useCurrencyContext,
  useSendContacts,
  getShortAddress,
  borderRadius,
  borderWidth,
  fontSize,
  shadowsCSS,
  lineHeight,
  opacity,
  duration,
  durationMs,
  easing,
  sanitizeDecimalInput,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { StepAddressAmountProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const QUICK_FILL_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: 'MAX', value: 1 },
] as const;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
});

const ScrollContent = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  paddingTop: spacing.xl,
  paddingLeft: spacing.xl,
  paddingRight: spacing.xl,
  paddingBottom: spacing.lg,
  // Scrollbar styling
  '&::-webkit-scrollbar': {
    width: componentSizes.scrollbarWidthSm,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: colors.interactive.hoverMedium,
    borderRadius: borderRadius.scrollbar,
  },
});

// Token Card
const TokenCardButton = styled(ButtonBase)({
  width: '100%',
  display: 'block',
  textAlign: 'left',
  borderRadius: borderRadius.button,
  marginBottom: spacing.xl,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const TokenCardContent = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: borderRadius.button,
  padding: `${spacing.lg}px ${spacing.lg}px`,
});

const TokenCardLeft = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
});

const TokenCardLogo = styled('img')({
  width: componentSizes.iconSizeXL,
  height: componentSizes.iconSizeXL,
  borderRadius: borderRadius.iconContainer,
  objectFit: 'cover',
  marginRight: spacing.md,
  flexShrink: 0,
});

const TokenCardLogoFallback = styled(Box)({
  width: componentSizes.iconSizeXL,
  height: componentSizes.iconSizeXL,
  borderRadius: borderRadius.iconContainer,
  backgroundColor: colors.background.card,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.md,
  flexShrink: 0,
});

const TokenCardLogoFallbackText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

const TokenCardName = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const TokenCardBalance = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  flexShrink: 0,
  marginLeft: spacing.sm,
});

// Fields
const FieldGroup = styled(Box)({
  marginBottom: spacing.lg,
});

const FieldLabel = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.sm,
});

const StyledInput = styled(InputBase)({
  width: '100%',
  color: colors.text.primary,
  fontSize: fontSize.md,
  fontFamily: fontFamily.sans,
  '& .MuiInputBase-input': {
    padding: `${spacing.md}px 0`,
    '&::placeholder': {
      color: colors.text.secondary,
      opacity: opacity.full,
    },
  },
});

const AddressInputRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: borderRadius.lg,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const ValidationIndicatorBox = styled(Box)({
  marginLeft: spacing.sm,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const ValidationMessage = styled(Typography)<{
  $messageType?: 'error' | 'warning' | null;
}>(({ $messageType }) => ({
  fontSize: fontSize.sm,
  lineHeight: `${fontSize.sm * lineHeight.condensed}px`,
  fontFamily: fontFamily.sans,
  marginTop: spacing.xs,
  color:
    $messageType === 'error'
      ? colors.status.error
      : $messageType === 'warning'
        ? colors.status.warning
        : colors.text.secondary,
}));

const AmountInputRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: borderRadius.lg,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
});

const QuickFillButtons = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.xs,
});

const QuickFillButton = styled(ButtonBase)({
  backgroundColor: colors.button.secondaryBackground,
  borderRadius: borderRadius.sm,
  padding: `${spacing.xs}px ${spacing.md}px`,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.medium,
  },
});

const QuickFillText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textTransform: 'uppercase',
});

// USD Conversion
const UsdConversion = styled(Typography)({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  marginTop: spacing.xs,
});

// Bottom Buttons
const BottomButtons = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  paddingLeft: spacing.xl,
  paddingRight: spacing.xl,
  paddingBottom: spacing.xl,
  paddingTop: spacing.md,
  gap: spacing.md,
});

const CancelButton = styled(ButtonBase)({
  flex: 1,
  height: componentSizes.buttonHeightMedium,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${semantic.border.raised}`,
  backgroundColor: colors.button.cancelBackground,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: shadowsCSS.button,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

const CancelButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

const ReviewButton = styled(ButtonBase)<{ disabled?: boolean }>(({ disabled }) => ({
  flex: 1,
  height: componentSizes.buttonHeightMedium,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  border: disabled
    ? `${borderWidth.thin}px solid ${colors.border.default}`
    : `${borderWidth.thin}px solid ${colors.accent.border}`,
  opacity: disabled ? 0.5 : 1,
  boxShadow: shadowsCSS.button,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  cursor: disabled ? 'not-allowed' : 'pointer',
  '&:hover': {
    opacity: disabled ? 0.5 : 0.85,
  },
}));

const ReviewButtonGradient = styled(Box)<{ $isDisabled?: boolean }>(({ $isDisabled }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  background: $isDisabled ? gradients.disabledCSS : gradients.primaryCSS,
}));

const ReviewButtonText = styled(Typography)<{ $isDisabled?: boolean }>(({ $isDisabled }) => ({
  fontSize: fontSize.md,
  fontWeight: fontWeight.extraBold,
  fontFamily: fontFamily.sans,
  // Salmon fill takes `neutral-1000` ink at 6.50:1 and nothing else; the
  // disabled fill is `surface.crest`, which takes the disabled ink instead.
  color: $isDisabled ? semantic.text.disabled : colors.button.primaryText,
}));

// Contact / Wallet sections
const ContactSection = styled(Box)({
  marginBottom: spacing.lg,
});

const ContactSectionHeader = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginBottom: spacing.sm,
});

const ContactRow = styled(ButtonBase)({
  width: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: colors.background.card,
  borderRadius: borderRadius.md,
  padding: `${spacing.md}px ${spacing.lg}px`,
  marginBottom: spacing.xs,
  transition: `opacity ${duration.fast} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.medium,
  },
});

const ContactInfo = styled(Box)({
  flex: 1,
  minWidth: 0,
  marginRight: spacing.sm,
  textAlign: 'left',
});

const ContactName = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
});

const ContactAddress = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'left',
});

const BlockchainBadge = styled(Box)({
  backgroundColor: colors.background.tertiary,
  borderRadius: borderRadius.sm,
  padding: `${spacing.xs}px ${spacing.sm}px`,
  flexShrink: 0,
});

const BlockchainBadgeText = styled(Typography)({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
});

// ============================================================================
// Component
// ============================================================================

export function StepAddressAmount({
  token,
  liveBalance,
  blockchain,
  account,
  onBack,
  onReview,
  onCancel,
}: StepAddressAmountProps) {
  const { t } = useTranslation();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  // Address book contacts and own wallets
  const senderAddress = account.getReceiveAddress();
  const { contacts, ownWallets } = useSendContacts(senderAddress);

  // Address validation — account owns its own connection/provider
  const {
    validationState,
    isValidating,
    isValid: isAddressValid,
    resolvedAddress,
    message: addressMessage,
    messageType: addressMessageType,
  } = useAddressValidation(address, account, {
    debounceMs: durationMs.debounce,
  });

  // Parse balance — prefer the live value passed by the parent (re-read from
  // the reactive tokens list each render) over the prop snapshot taken when
  // the step opened. Falls back to token.uiAmount only when no live entry is
  // available (e.g. the token is not in the latest list yet).
  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) {
      return liveBalance;
    }
    return typeof token.uiAmount === 'string' ? parseFloat(token.uiAmount) : token.uiAmount;
  }, [liveBalance, token.uiAmount]);

  // Fiat conversion
  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    if (!token.price || numAmount === 0) return `${formatPrecise(0)} ${currency.toUpperCase()}`;
    return `${formatPrecise(numAmount * token.price)} ${currency.toUpperCase()}`;
  }, [amount, token.price, formatPrecise, currency]);

  // Balance display
  const balanceDisplay = useMemo(() => {
    if (tokenBalance === 0) return `0 ${token.symbol}`;
    return `${Number(tokenBalance.toFixed(4))} ${token.symbol}`;
  }, [tokenBalance, token.symbol]);

  // Validate form (address must be validated AND amount must be valid)
  const isValid = useMemo(() => {
    const numAmount = parseFloat(amount);
    const amountValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= tokenBalance;
    return isAddressValid && !isValidating && amountValid;
  }, [isAddressValid, isValidating, amount, tokenBalance]);

  // Handle quick fill
  const handleQuickFill = useCallback(
    (percentage: number) => {
      const fillAmount = tokenBalance * percentage;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      setAmount(truncated > 0 ? truncated.toString() : '0');
    },
    [tokenBalance, token.decimals]
  );

  // Handle review press
  const handleReview = useCallback(() => {
    if (isValid) {
      onReview(address.trim(), amount, resolvedAddress || undefined);
    }
  }, [isValid, address, amount, onReview, resolvedAddress]);

  // Handle input changes
  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(sanitizeDecimalInput(e.target.value));
  }, []);

  // Placeholder text based on blockchain
  const addressPlaceholder = useMemo(() => {
    switch (blockchain) {
      case 'solana':
        return t('token.send.blockchainAddress', { blockchain: 'Solana' });
      case 'ethereum':
        return t('token.send.blockchainAddress', { blockchain: 'Ethereum' });
      case 'bitcoin':
        return t('token.send.blockchainAddress', { blockchain: 'Bitcoin' });
      default:
        return t('bridge.recipient.title');
    }
  }, [blockchain, t]);

  return (
    <Container>
      <ScrollContent>
        {/* Selected Token Card */}
        <TokenCardButton
          onClick={onBack}
          aria-label={t('accessibility.selected_token', { name: token.name })}
          data-testid="send-selected-token"
        >
          <BlurContainer style={{ borderRadius: borderRadius.button }}>
            <TokenCardContent>
              <TokenCardLeft>
                {token.logo ? (
                  <TokenCardLogo
                    src={token.logo}
                    alt={token.symbol}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <TokenCardLogoFallback>
                    <TokenCardLogoFallbackText>
                      {token.symbol?.slice(0, 2).toUpperCase() || '?'}
                    </TokenCardLogoFallbackText>
                  </TokenCardLogoFallback>
                )}
                <TokenCardName>{token.symbol}</TokenCardName>
              </TokenCardLeft>
              <TokenCardBalance>{balanceDisplay}</TokenCardBalance>
            </TokenCardContent>
          </BlurContainer>
        </TokenCardButton>

        {/* Recipient */}
        <FieldGroup>
          <FieldLabel>{t('token.send.recipient')}</FieldLabel>
          <BlurContainer
            style={{
              borderRadius: borderRadius.lg,
              border:
                validationState === 'invalid'
                  ? `${borderWidth.thin}px solid ${colors.status.error}`
                  : validationState === 'warning'
                    ? `${borderWidth.thin}px solid ${colors.status.warning}`
                    : validationState === 'valid'
                      ? `${borderWidth.thin}px solid ${colors.status.success}`
                      : undefined,
            }}
          >
            <AddressInputRow>
              <StyledInput
                placeholder={addressPlaceholder}
                value={address}
                onChange={handleAddressChange}
                autoComplete="off"
                inputProps={{
                  autoCapitalize: 'none',
                  autoCorrect: 'off',
                  spellCheck: false,
                  'data-testid': 'send-recipient-input',
                }}
                sx={{ flex: 1 }}
              />
              {/* Validation indicator */}
              {address.length > 0 && isValidating && (
                <ValidationIndicatorBox>
                  <CircularProgress size={16} sx={{ color: colors.text.secondary }} />
                </ValidationIndicatorBox>
              )}
              {address.length > 0 && !isValidating && validationState === 'valid' && (
                <ValidationIndicatorBox>
                  <span style={{ color: colors.status.success, fontSize: fontSize.md }}>
                    {'\u2713'}
                  </span>
                </ValidationIndicatorBox>
              )}
              {address.length > 0 && !isValidating && validationState === 'invalid' && (
                <ValidationIndicatorBox>
                  <span style={{ color: colors.status.error, fontSize: fontSize.md }}>
                    {'\u2715'}
                  </span>
                </ValidationIndicatorBox>
              )}
              {address.length > 0 && !isValidating && validationState === 'warning' && (
                <ValidationIndicatorBox>
                  <span style={{ color: colors.status.warning, fontSize: fontSize.md }}>
                    {'\u26A0'}
                  </span>
                </ValidationIndicatorBox>
              )}
            </AddressInputRow>
          </BlurContainer>
          {/* Validation message */}
          {addressMessage && (
            <ValidationMessage $messageType={addressMessageType}>
              {t(addressMessage)}
            </ValidationMessage>
          )}
        </FieldGroup>

        {/* My Wallets */}
        {address.length === 0 && ownWallets.length > 0 && (
          <ContactSection>
            <ContactSectionHeader>{t('token.send.myWallets')}</ContactSectionHeader>
            {ownWallets.map((wallet) => (
              <ContactRow
                key={wallet.address}
                onClick={() => setAddress(wallet.address)}
                data-testid={`send-own-wallet-${wallet.address}`}
              >
                <ContactName>{wallet.accountName}</ContactName>
                <ContactAddress>{getShortAddress(wallet.address)}</ContactAddress>
              </ContactRow>
            ))}
          </ContactSection>
        )}

        {/* Address Book */}
        {address.length === 0 && contacts.length > 0 && (
          <ContactSection>
            <ContactSectionHeader>{t('token.send.addressBook')}</ContactSectionHeader>
            {contacts.map((contact) => (
              <ContactRow
                key={contact.address}
                onClick={() => setAddress(contact.address)}
                data-testid={`send-contact-${contact.address}`}
              >
                <ContactInfo>
                  <ContactName>{contact.name}</ContactName>
                  <ContactAddress>{getShortAddress(contact.address)}</ContactAddress>
                </ContactInfo>
                <BlockchainBadge>
                  <BlockchainBadgeText>
                    {contact.blockchain.charAt(0).toUpperCase() + contact.blockchain.slice(1)}
                  </BlockchainBadgeText>
                </BlockchainBadge>
              </ContactRow>
            ))}
          </ContactSection>
        )}

        {/* Amount */}
        <FieldGroup>
          <FieldLabel>{t('token.send.amountLabel')}</FieldLabel>
          <BlurContainer style={{ borderRadius: borderRadius.lg }}>
            <AmountInputRow>
              <StyledInput
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                autoComplete="off"
                inputProps={{
                  inputMode: 'decimal',
                  autoCorrect: 'off',
                  'data-testid': 'send-amount-input',
                }}
                sx={{ flex: 1 }}
              />
              <QuickFillButtons>
                {QUICK_FILL_OPTIONS.map((option) => (
                  <QuickFillButton
                    key={option.label}
                    onClick={() => handleQuickFill(option.value)}
                    data-testid={`send-quickfill-${option.label.replace('%', '')}`}
                  >
                    <QuickFillText>
                      {option.value === 1 ? t('general.max') : option.label}
                    </QuickFillText>
                  </QuickFillButton>
                ))}
              </QuickFillButtons>
            </AmountInputRow>
          </BlurContainer>
        </FieldGroup>

        {/* USD Conversion */}
        <UsdConversion>{fiatDisplay}</UsdConversion>
      </ScrollContent>

      {/* Bottom Buttons */}
      <BottomButtons>
        <CancelButton onClick={onCancel} data-testid="send-cancel-button">
          <CancelButtonText>{t('actions.cancel')}</CancelButtonText>
        </CancelButton>

        <ReviewButton onClick={handleReview} disabled={!isValid} data-testid="send-review-button">
          <ReviewButtonGradient $isDisabled={!isValid}>
            <ReviewButtonText $isDisabled={!isValid}>{t('token.send.reviewAndSend')}</ReviewButtonText>
          </ReviewButtonGradient>
        </ReviewButton>
      </BottomButtons>
    </Container>
  );
}
