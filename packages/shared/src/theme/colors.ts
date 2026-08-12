/**
 * Color tokens for Salmon Wallet
 * Works for both React Native (Expo) and Web (WXT+Vite extension)
 */

import type { BlockchainId } from '../types/ui/balance-card';

export const colors = {
  background: {
    primary: '#10131c',
    secondary: '#161c2d',
    tertiary: 'rgba(255, 255, 255, 0.08)', // elevated surfaces
    card: 'rgba(255, 255, 255, 0.05)',
    glass: 'rgba(0, 0, 0, 0.4)',
    tokenItem: 'rgba(56, 63, 82, 0.1)', // blur-backed list items
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#8A8D98',
    tertiary: '#6B6E7B', // also used as placeholder color
    muted: 'rgba(255, 255, 255, 0.7)',
    balance: '#e0e0e0', // subdued white for amounts and token names
    disabled: 'rgba(255, 255, 255, 0.4)',
  },
  border: {
    default: '#404962',
    light: 'rgba(255, 255, 255, 0.8)',
    subtle: 'rgba(255, 255, 255, 0.15)',
  },
  accent: {
    primary: '#FF5C45',
    border: 'rgba(255, 92, 69, 0.8)',
    tint: 'rgba(255, 92, 69, 0.1)',
    tintHover: 'rgba(255, 92, 69, 0.15)',
  },
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    successBackground: 'rgba(76, 175, 80, 0.1)',
    errorBackground: 'rgba(239, 68, 68, 0.1)',
    warningBackground: 'rgba(255, 171, 0, 0.1)',
    warningBorder: 'rgba(255, 171, 0, 0.3)',
  },
  /** Price change indicators (keyed by LabelType) */
  change: {
    positive: '#80ff54',
    negative: '#FF5252',
    neutral: '#9E9E9E',
  },
  input: {
    background: 'rgba(64, 73, 98, 0.2)',
    border: '#404962',
  },
  button: {
    primaryBackground: '#FFFFFF',
    primaryText: '#000000',
    secondaryBackground: '#2a3441',
    secondaryText: '#FFFFFF',
    cancelBackground: '#1f232f',
    dangerHover: '#FF7A64',
    destructiveHover: '#DC2626',
    disabledText: '#666666',
    disabledOpacity: 0.5,
    inactiveBackground: '#444444',
  },
  step: {
    active: '#FF5C45',
    inactive: 'rgba(255, 255, 255, 0.3)',
  },
  /** TabBar navigation */
  tabBar: {
    active: '#FF5C45',
    inactive: 'rgba(255, 255, 255, 0.6)',
  },
  interactive: {
    surface: 'rgba(255, 255, 255, 0.04)',
    hoverSubtle: 'rgba(255, 255, 255, 0.06)',
    hoverStrong: 'rgba(255, 255, 255, 0.12)',
    hoverMedium: 'rgba(255, 255, 255, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.2)',
  },
  overlay: {
    dark: 'rgba(15, 15, 15, 0.95)',
    darkHover: 'rgba(15, 15, 15, 0.9)',
  },
  skeleton: {
    base: 'rgba(64, 73, 98, 0.3)',
    highlight: 'rgba(64, 73, 98, 0.5)',
  },
  dialog: {
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    background: 'rgba(64, 73, 98, 0.3)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderActive: '#FF5C45',
  },
  sheet: {
    backdrop: '#000000',
    handle: '#b9b9b9',
  },
  /** QR Scanner — isolated color sub-system */
  scanner: {
    background: '#1a1a2e',
    surface: '#2a2a4e',
    text: '#ffffff',
    textSecondary: '#8b8b9e',
    textTertiary: '#6b6b7e',
    button: '#4a4a6e',
  },
  /** Decorative palette for badges, avatars, tags */
  palette: {
    orange: '#FF5C45',
    green: '#10B981',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    blue: '#3B82F6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    indigo: '#6366F1',
  },
} as const;

/**
 * Gradient definitions
 * - `colors` + `start`/`end` → React Native LinearGradient
 * - CSS strings → web linear-gradient()
 */
export const gradients = {
  primary: {
    colors: ['#FF5C45', 'rgba(161, 42, 42, 0.9)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  /** Primary action button (slight downward angle ~93.8deg) */
  primaryButton: {
    colors: ['#FF5C45', 'rgba(161, 42, 42, 0.9)'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0.04 },
  },
  /** Balance card default (diagonal, cosmic purple) */
  balanceCard: {
    colors: ['#4A1A8C', '#2D1052', '#1A0A33'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Balance card Solana (vertical) */
  balanceCardSolana: {
    colors: ['#4A1A8C', '#2D1052', '#1A0A33'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  balanceCardSolanaDevnet: {
    colors: ['#00FFA3', '#00B377', '#00664D'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  balanceCardBitcoin: {
    colors: ['#F7931A', '#8B5A00', '#3D2800'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  balanceCardBitcoinTestnet: {
    colors: ['#FF9500', '#B36D00', '#663D00'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  balanceCardEthereum: {
    colors: ['#627EEA', '#3A4A8C', '#1A1F33'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  balanceCardEthereumSepolia: {
    colors: ['#4CAF50', '#2E7D32', '#1B5E20'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Disabled state gradient */
  disabled: {
    colors: ['#666666', '#444444'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  /** Onboarding/Auth screens (primary → secondary vertical) */
  onboarding: {
    colors: ['#10131c', '#161c2d'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** TabBar bottom fade (black → transparent, bottom to top) */
  tabBarFade: {
    colors: ['#000000', 'rgba(0, 0, 0, 0)'] as const,
    start: { x: 0.5, y: 1 },
    end: { x: 0.5, y: 0 },
  },
  // CSS versions for web
  primaryCSS: 'linear-gradient(101deg, rgb(255, 92, 69) 12%, rgba(161, 42, 42, 0.9) 83%)',
  primaryButtonCSS: 'linear-gradient(90deg, #ff5c45 0%, #ff3d2e 100%)',
  disabledCSS: 'linear-gradient(90deg, #666666 0%, #444444 100%)',
  balanceCardSolanaCSS: 'linear-gradient(180deg, #4A1A8C 0%, #2D1052 50%, #1A0A33 100%)',
  balanceCardSolanaDevnetCSS: 'linear-gradient(180deg, #00FFA3 0%, #00B377 50%, #00664D 100%)',
  balanceCardBitcoinCSS: 'linear-gradient(180deg, #F7931A 0%, #8B5A00 50%, #3D2800 100%)',
  balanceCardBitcoinTestnetCSS: 'linear-gradient(180deg, #FF9500 0%, #B36D00 50%, #663D00 100%)',
  balanceCardEthereumCSS: 'linear-gradient(180deg, #627EEA 0%, #3A4A8C 50%, #1A1F33 100%)',
  balanceCardEthereumSepoliaCSS: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 50%, #1B5E20 100%)',
} as const;

export type Colors = typeof colors;
export type Gradients = typeof gradients;

/**
 * Returns an rgba overlay color (15% opacity) for a blockchain.
 * Used for balance card scale/shimmer effects.
 */
export const getScalesColorForBlockchain = (blockchain: BlockchainId): string => {
  switch (blockchain) {
    case 'solana':
      return 'rgba(153, 69, 255, 0.15)';
    case 'solana-devnet':
      return 'rgba(0, 255, 163, 0.15)';
    case 'bitcoin':
      return 'rgba(247, 147, 26, 0.15)';
    case 'bitcoin-testnet':
      return 'rgba(255, 149, 0, 0.15)';
    case 'ethereum':
      return 'rgba(98, 126, 234, 0.15)';
    case 'ethereum-sepolia':
      return 'rgba(76, 175, 80, 0.15)';
    default:
      return 'rgba(153, 69, 255, 0.15)';
  }
};
