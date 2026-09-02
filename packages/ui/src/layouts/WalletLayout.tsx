/**
 * WalletLayout - Centered container for standalone web wallet views.
 *
 * Constrains content to a phone-like column (max-width 375px) on wide screens,
 * while going full-width on mobile.  Intended to wrap the entire route tree
 * around a route tree so every page gets a consistent centred layout.
 */

import React from 'react';
import { styled } from '../utils/styled';
import Box from '@mui/material/Box';
import { colors, componentSizes } from '@salmon/shared';
import type { WalletLayoutProps } from './types';

const Outer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  height: '100vh',
  width: '100%',
  overflow: 'hidden',
  backgroundColor: colors.background.primary,
});

const DESKTOP_BREAKPOINT = componentSizes.breakpointDesktop;

const Inner = styled(Box)<{ $maxWidth: number }>(({ $maxWidth }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  [`@media (min-width: ${DESKTOP_BREAKPOINT}px)`]: {
    maxWidth: $maxWidth,
  },
}));

export function WalletLayout({
  children,
  maxWidth = componentSizes.webContainerMaxWidth,
}: WalletLayoutProps): React.ReactElement {
  return (
    <Outer>
      <Inner $maxWidth={maxWidth}>{children}</Inner>
    </Outer>
  );
}
