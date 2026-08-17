/**
 * HandleHeader - Drag handle with title and optional back button
 *
 * Used by: SendSheet, NftDetailSheet
 *
 * @example
 * ```tsx
 * <BaseSheetDialog.HandleHeader
 *   title="Send"
 *   showBackButton={currentStep > 0}
 *   onBack={handleBack}
 * />
 * ```
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { ArrowLeftIcon } from '../../icons';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  opacity,
  componentSizes,
} from '@salmon/shared';
import type { HandleHeaderProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const HeaderArea = styled(Box)({
  position: 'relative',
  zIndex: 1,
});

const HandleContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
});

const Handle = styled(Box)({
  width: componentSizes.iconSizeXL,
  height: spacing.xs,
  borderRadius: borderRadius.full,
  backgroundColor: colors.sheet.handle,
  opacity: opacity.low,
});

const TitleRow = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: spacing.xl,
  paddingRight: spacing.xl,
  marginBottom: spacing.lg,
  position: 'relative',
  minHeight: componentSizes.iconSizeLarge,
});

const BackButton = styled(IconButton)({
  position: 'absolute',
  left: spacing.xl,
  zIndex: 1,
  color: colors.text.primary,
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const TitleText = styled(Typography)({
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.extraBold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  textAlign: 'center',
  flex: 1,
  letterSpacing: letterSpacing.snug,
});

// ============================================================================
// Component
// ============================================================================

/**
 * HandleHeader - Drag handle with title and optional back button
 */
export function HandleHeader({
  title,
  showBackButton = false,
  onBack,
}: HandleHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <HeaderArea>
      {/* Drag handle */}
      <HandleContainer>
        <Handle />
      </HandleContainer>

      {/* Title row with optional back button */}
      <TitleRow>
        {showBackButton && onBack && (
          <BackButton onClick={onBack} aria-label={t('general.back', 'Back')}>
            <ArrowLeftIcon />
          </BackButton>
        )}
        <TitleText>{title}</TitleText>
      </TitleRow>
    </HeaderArea>
  );
}
