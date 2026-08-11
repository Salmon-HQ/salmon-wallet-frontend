/**
 * BridgeRecipientScreen - Second step of bridge flow
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Allows user to enter the recipient address for the destination chain.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  gradients,
  fontFamily,
  fontWeight,
  fontSize,
  shadowsCSS,
  letterSpacing,
  lineHeight,
  componentSizes,
  borderWidth,
  duration,
  easing,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { BridgeRecipientScreenProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  padding: `${spacing['2xl']}px ${spacing.headerPadding}px 0`,
  position: 'relative',
});

const Title = styled(Typography)({
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  letterSpacing: letterSpacing.wide,
  lineHeight: `${fontSize['2xl'] * lineHeight.condensed}px`,
  marginBottom: spacing.md,
});

const Description = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  textAlign: 'center',
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.base * lineHeight.tokenListItem}px`,
  marginBottom: spacing['2xl'],
});

const InputContainer = styled(Box)({
  marginBottom: spacing['2xl'],
});

const AddressInput = styled('input')({
  width: '100%',
  padding: `${spacing.sm}px ${spacing.base}px`,
  minHeight: componentSizes.iconSize3XL,
  backgroundColor: colors.background.tokenItem,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  borderRadius: borderRadius.md,
  color: colors.text.primary,
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  letterSpacing: letterSpacing.normal,
  outline: 'none',
  boxSizing: 'border-box',
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&::placeholder': {
    color: colors.text.tertiary,
  },
  '&:focus': {
    borderColor: 'rgba(255, 92, 69, 0.6)',
  },
});

const ErrorText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.status.error,
  marginTop: spacing.xs,
  letterSpacing: letterSpacing.normal,
});

const InfoBox = styled(Box)({
  backgroundColor: colors.background.tokenItem,
  borderRadius: borderRadius.md,
  border: `${borderWidth.thin}px solid ${colors.border.default}`,
  padding: spacing.base,
  marginBottom: spacing['2xl'],
});

const InfoTitle = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.status.warning,
  marginBottom: spacing.xs,
  letterSpacing: letterSpacing.normal,
});

const InfoText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  letterSpacing: letterSpacing.normal,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
});

const ButtonsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.md,
  marginTop: 'auto',
  paddingBottom: spacing['2xl'],
});

const BackButtonWrapper = styled('div')({
  flex: 1,
});

const ContinueButtonGradient = styled('div')({
  flex: 1,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.accent}px solid ${colors.accent.border}`,
  boxShadow: shadowsCSS.button,
  background: gradients.primaryCSS,
});

// ============================================================================
// BridgeRecipientScreen Component
// ============================================================================

/**
 * BridgeRecipientScreen - Second step of bridge flow
 * Allows user to enter the recipient address for the destination chain
 */
export function BridgeRecipientScreen({
  recipientAddress,
  onAddressChange,
  targetChain,
  onBack,
  onContinue,
  isValidAddress,
  addressError,
  style,
}: BridgeRecipientScreenProps) {
  const { t } = useTranslation();
  const canContinue = isValidAddress && recipientAddress.length > 0;

  return (
    <Container style={style}>
      {/* Title */}
      <Title>{t('bridge.recipient.title')}</Title>

      {/* Description */}
      <Description>
        {targetChain
          ? t('bridge.recipient.descriptionWithChain', { chain: targetChain.name })
          : t('bridge.recipient.description')}
      </Description>

      {/* Address Input */}
      <InputContainer>
        <AddressInput
          value={recipientAddress}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={t('bridge.recipient.enterRecipientAddress')}
        />
        {addressError && <ErrorText>{t(addressError)}</ErrorText>}
      </InputContainer>

      {/* Info Box */}
      <InfoBox>
        <InfoTitle>{t('bridge.recipient.important')}</InfoTitle>
        <InfoText>{t('bridge.recipient.importantText')}</InfoText>
      </InfoBox>

      {/* Buttons */}
      <ButtonsContainer>
        <BackButtonWrapper>
          <SecondaryButton
            onClick={onBack}
            style={{
              height: componentSizes.buttonHeightCompact,
              border: `${borderWidth.accent}px solid ${colors.accent.border}`,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.button.cancelBackground,
            }}
          >
            {t('general.back')}
          </SecondaryButton>
        </BackButtonWrapper>
        <ContinueButtonGradient>
          <PrimaryButton
            onClick={onContinue}
            disabled={!canContinue}
            style={{
              height: componentSizes.buttonHeightCompact,
              background: 'transparent',
            }}
          >
            {t('bridge.recipient.review')}
          </PrimaryButton>
        </ContinueButtonGradient>
      </ButtonsContainer>
    </Container>
  );
}

