/**
 * AddressCopyRow - Displays an address with a copy button
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 * Uses navigator.clipboard API instead of expo-clipboard.
 *
 * Features:
 * - Label on the left
 * - Truncated address display
 * - Copy button on the right
 * - Visual feedback (checkmark) after copying
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { colors, borderRadius, componentSizes, fontFamily, getShortAddress, copyToClipboard, spacing, fontSize, fontWeight, durationMs } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { AddressCopyRowProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const TRUNCATE_CHARS: Record<'short' | 'medium' | 'long', number> = {
  short: 4,
  medium: 6,
  long: 8,
};

const COPIED_FEEDBACK_DURATION = durationMs.feedbackShort;

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const Label = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text.secondary,
  flexShrink: 0,
});

const RightSection = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  justifyContent: 'flex-end',
  marginLeft: spacing.md,
  minWidth: 0,
});

const AddressText = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.primary,
  marginRight: spacing.sm,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: fontFamily.mono,
});

const CopyButton = styled(IconButton)({
  width: componentSizes.iconSizeMButton,
  height: componentSizes.iconSizeMButton,
  padding: spacing.xs,
  backgroundColor: `${colors.background.card}80`,
  '&:hover': {
    backgroundColor: `${colors.background.card}`,
  },
});

// ============================================================================
// Component
// ============================================================================

export function AddressCopyRow({
  label,
  address,
  truncate = 'medium',
  className,
}: AddressCopyRowProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const displayAddress =
    truncate === false
      ? address
      : getShortAddress(address, TRUNCATE_CHARS[truncate]) ?? address;

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(address);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION);
    } catch (error) {
      console.warn('Failed to copy address:', error);
    }
  }, [address]);

  return (
    <BlurContainer style={{ borderRadius: borderRadius.md, padding: `${spacing.sm}px ${spacing.md}px` }}>
      <Container className={className}>
        <Label>{label}</Label>
        <RightSection>
          <AddressText>{displayAddress}</AddressText>
          <CopyButton
            onClick={handleCopy}
            size="small"
            aria-label={t('transactions.detail.copyAddressLabel', 'Copy {{label}} address', { label })}
            data-testid={`tx-detail-copy-address-${label}`}
            sx={copied ? { backgroundColor: `${colors.status.success}20` } : undefined}
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: fontSize.base, color: colors.status.success }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: fontSize.base, color: colors.text.secondary }} />
            )}
          </CopyButton>
        </RightSection>
      </Container>
    </BlurContainer>
  );
}

