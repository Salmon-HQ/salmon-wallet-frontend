/**
 * ExplorerLinkButton - Button to view transactions on blockchain explorers
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 * Uses window.open instead of Linking.openURL.
 *
 * Features:
 * - Single button mode opens the default explorer
 * - Menu mode with multiple explorer options via MUI Menu
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { PaperProps } from '@mui/material/Paper';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { ArrowSquareOutIcon, CaretDownIcon, GlobeIcon, iconSize } from '../../icons';
import {
  colors,
  borderRadius,
  borderWidth,
  getTransactionUrl,
  getAvailableExplorers,
  getDefaultExplorer,
  fontSize,
  fontWeight,
  opacity,
  spacing,
  duration,
  easing,
  semantic,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { ExplorerLinkButtonProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledButton = styled(ButtonBase)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing.md}px ${spacing.lg}px`,
  width: '100%',
  gap: spacing.sm,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    opacity: opacity.high,
  },
});

/**
 * A link off to an explorer. It was reading `palette.amber` — a decorative
 * badge hue with no semantic meaning, close enough to salmon to be mistaken
 * for it and not close enough to be it. Links are the textbook case for
 * accent ink: `text.accent`, 6.07:1.
 */
const ButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: semantic.text.accent,
});

const StyledMenu = styled(Menu)({
  '& .MuiPaper-root': {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
});

const StyledMenuItem = styled(MenuItem)({
  padding: `${spacing.md}px ${spacing.lg}px`,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

const BlurMenuPaper = React.forwardRef<HTMLDivElement, PaperProps>(function BlurMenuPaper(
  { children, className, style, ...props },
  ref
) {
  return (
    <div ref={ref} className={className} {...props}>
      <BlurContainer
        style={{
          ...(style as React.CSSProperties | undefined),
          borderRadius: borderRadius.lg,
        }}
        backgroundColor="rgba(56, 63, 82, 0.20)"
        borderColor={colors.border.default}
        borderWidth={borderWidth.thin}
      >
        {children}
      </BlurContainer>
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export function ExplorerLinkButton({
  txHash,
  blockchain = 'SOLANA',
  environment = 'solana-mainnet',
  explorerKey,
  showMenu = false,
  onPress,
  className,
}: ExplorerLinkButtonProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const availableExplorers = useMemo(
    () => getAvailableExplorers(blockchain, environment),
    [blockchain, environment]
  );

  const selectedExplorerKey = explorerKey || getDefaultExplorer(blockchain);

  const selectedExplorer = useMemo(
    () => availableExplorers.find((e) => e.key === selectedExplorerKey),
    [availableExplorers, selectedExplorerKey]
  );

  const openExplorer = useCallback(
    (explorer: { key: string; name: string }) => {
      const url = getTransactionUrl(blockchain, environment, explorer.key, txHash);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        onPress?.(url, explorer.name);
      }
      setAnchorEl(null);
    },
    [blockchain, environment, txHash, onPress]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (showMenu && availableExplorers.length > 1) {
        setAnchorEl(event.currentTarget);
      } else if (selectedExplorer) {
        openExplorer(selectedExplorer);
      }
    },
    [showMenu, availableExplorers, selectedExplorer, openExplorer]
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  if (availableExplorers.length === 0 || !selectedExplorer) {
    return null;
  }

  const buttonText =
    showMenu && availableExplorers.length > 1
      ? t('transactions.detail.viewOnExplorer')
      : t('transactions.detail.viewOn', { name: selectedExplorer.name });

  return (
    <>
      <BlurContainer
        borderColor={colors.palette.amber}
        style={{ borderRadius: borderRadius.md }}
        className={className}
      >
        <StyledButton
          onClick={handleClick}
          aria-label={buttonText}
          data-testid="tx-detail-explorer-link"
        >
          <ArrowSquareOutIcon size={iconSize.sm} color={colors.palette.amber} />
          <ButtonText>{buttonText}</ButtonText>
          {showMenu && availableExplorers.length > 1 && (
            <CaretDownIcon size={iconSize.sm} color={colors.palette.amber} />
          )}
        </StyledButton>
      </BlurContainer>

      {showMenu && availableExplorers.length > 1 && (
        <StyledMenu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              component: BlurMenuPaper,
              sx: { width: anchorEl?.offsetWidth },
            },
          }}
        >
          {availableExplorers.map((explorer) => (
            <StyledMenuItem key={explorer.key} onClick={() => openExplorer(explorer)}>
              <ListItemIcon>
                <GlobeIcon size={iconSize.md} color={colors.text.primary} />
              </ListItemIcon>
              <ListItemText
                primary={explorer.name}
                primaryTypographyProps={{
                  sx: {
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    color: colors.text.primary,
                  },
                }}
              />
              <ArrowSquareOutIcon size={iconSize.sm} color={colors.text.tertiary} />
            </StyledMenuItem>
          ))}
        </StyledMenu>
      )}
    </>
  );
}
