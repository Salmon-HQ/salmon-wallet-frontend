/**
 * Common icons for the extension app
 *
 * SVG icons wrapped as React components using MUI SvgIcon
 * Includes both individual icon components and a unified Icon component
 */
import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { getIconSize, colors } from '@salmon/shared';
import type { IconName } from '@salmon/shared';
import type { UnifiedIconProps } from './types';

/**
 * Lock icon - for security/lock screens
 */
export function LockIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </SvgIcon>
  );
}

/**
 * Eye icon - for showing content
 */
export function EyeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </SvgIcon>
  );
}

/**
 * EyeOff icon - for hiding content
 */
export function EyeOffIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </SvgIcon>
  );
}

/**
 * Refresh icon - for refresh/reload actions
 */
export function RefreshIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </SvgIcon>
  );
}

/**
 * Send icon - for send/transfer actions
 */
export function SendIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
    </SvgIcon>
  );
}

/**
 * Receive icon - for receive/deposit actions
 */
export function ReceiveIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
    </SvgIcon>
  );
}

/**
 * Settings icon - for settings/preferences
 */
export function SettingsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </SvgIcon>
  );
}

/**
 * Copy icon - for copy to clipboard actions
 */
export function CopyIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </SvgIcon>
  );
}

/**
 * ChevronRight icon - for navigation/expansion
 */
export function ChevronRightIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </SvgIcon>
  );
}

/**
 * ChevronDown icon - for dropdowns/expansion
 */
export function ChevronDownIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
    </SvgIcon>
  );
}

/**
 * Activity/History icon - for transaction history
 */
export function ActivityIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </SvgIcon>
  );
}

/**
 * Wallet icon - for wallet-related actions
 */
export function WalletIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </SvgIcon>
  );
}

/**
 * Close icon - for close/dismiss actions
 */
export function CloseIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </SvgIcon>
  );
}

/**
 * Mapping from unified icon names to icon components
 */
const ICON_COMPONENTS: Record<IconName, React.FC<SvgIconProps>> = {
  // Navigation
  'chevron-down': ChevronDownIcon,
  'chevron-up': (props) => (
    <ChevronDownIcon {...props} style={{ ...props.style, transform: 'rotate(180deg)' }} />
  ),
  'chevron-right': ChevronRightIcon,
  'chevron-left': (props) => (
    <ChevronRightIcon {...props} style={{ ...props.style, transform: 'rotate(180deg)' }} />
  ),
  close: CloseIcon,
  back: (props) => (
    <ChevronRightIcon {...props} style={{ ...props.style, transform: 'rotate(180deg)' }} />
  ),
  // Actions
  send: SendIcon,
  receive: ReceiveIcon,
  copy: CopyIcon,
  refresh: RefreshIcon,
  settings: SettingsIcon,
  'qr-code': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm2 0h2v2h-2v-2zm-2 4h2v4h-2v-4zm2 0h2v2h-2v-2zm2 4h-2v2h2v-2z" />
    </SvgIcon>
  ),
  scan: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM19 13h-1.5v-1.5H19V13z" />
    </SvgIcon>
  ),
  // Visibility
  eye: EyeIcon,
  'eye-off': EyeOffIcon,
  // Security
  lock: LockIcon,
  unlock: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
    </SvgIcon>
  ),
  shield: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </SvgIcon>
  ),
  key: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </SvgIcon>
  ),
  fingerprint: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z" />
    </SvgIcon>
  ),
  // Wallet
  wallet: WalletIcon,
  activity: ActivityIcon,
  swap: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
    </SvgIcon>
  ),
  // Status
  checkmark: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </SvgIcon>
  ),
  'checkmark-circle': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </SvgIcon>
  ),
  alert: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </SvgIcon>
  ),
  'alert-circle': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </SvgIcon>
  ),
  info: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </SvgIcon>
  ),
  'info-circle': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </SvgIcon>
  ),
  // Token features
  diamond: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 3H5L2 9l10 12L22 9l-3-6zM9.62 8l1.5-3h1.76l1.5 3H9.62zM11 10v6.68L5.44 10H11zm2 0h5.56L13 16.68V10zm6.26-2h-2.65l-1.5-3h2.65l1.5 3zM6.24 5h2.65l-1.5 3H4.74l1.5-3z" />
    </SvgIcon>
  ),
  people: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </SvgIcon>
  ),
  layers: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
    </SvgIcon>
  ),
  image: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </SvgIcon>
  ),
  'game-controller': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </SvgIcon>
  ),
  analytics: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    </SvgIcon>
  ),
  'trending-up': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
    </SvgIcon>
  ),
  'trending-down': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
    </SvgIcon>
  ),
  cash: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
    </SvgIcon>
  ),
  card: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
    </SvgIcon>
  ),
  cloud: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
    </SvgIcon>
  ),
  star: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </SvgIcon>
  ),
  heart: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </SvgIcon>
  ),
  tag: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
    </SvgIcon>
  ),
  // Misc
  add: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </SvgIcon>
  ),
  remove: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 13H5v-2h14v2z" />
    </SvgIcon>
  ),
  search: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </SvgIcon>
  ),
  menu: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </SvgIcon>
  ),
  more: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </SvgIcon>
  ),
  link: (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </SvgIcon>
  ),
  'external-link': (props) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </SvgIcon>
  ),
};

/**
 * Unified Icon component for React DOM (web extension)
 *
 * Provides a consistent API matching the unified icon system.
 *
 * @example
 * ```tsx
 * <Icon name="send" size="md" color={colors.accent.primary} />
 * <Icon name="settings" size={24} />
 * <Icon name="eye" />
 * ```
 */
export function Icon({
  name,
  size = 'md',
  color = colors.text.primary,
  className,
  style,
}: UnifiedIconProps) {
  const IconComponent = ICON_COMPONENTS[name];
  const numericSize = getIconSize(size);

  return (
    <IconComponent
      className={className}
      style={{
        fontSize: numericSize,
        width: numericSize,
        height: numericSize,
        color,
        ...style,
      }}
    />
  );
}

// ============================================================================
// Blockchain Icons
// ============================================================================

/**
 * Solana blockchain icon
 */
export function SolanaSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="24 15 43 57">
      <path d="M66.7067 54.4609L59.6202 62.1088C59.4661 62.2749 59.2797 62.4074 59.0726 62.4979C58.8655 62.5885 58.642 62.6351 58.4163 62.635H24.8227C24.6624 62.635 24.5056 62.5878 24.3716 62.4994C24.2375 62.411 24.1321 62.285 24.0682 62.1371C24.0043 61.9892 23.9847 61.8257 24.0119 61.6667C24.0391 61.5077 24.1118 61.3602 24.2212 61.2423L31.3131 53.5944C31.4667 53.4287 31.6525 53.2965 31.8589 53.206C32.0654 53.1155 32.2881 53.0686 32.5133 53.0682H66.105C66.2653 53.0682 66.4221 53.1154 66.5563 53.2038C66.6901 53.2923 66.7955 53.4182 66.8597 53.5661C66.9235 53.7141 66.943 53.8775 66.9158 54.0365C66.8886 54.1955 66.816 54.343 66.7067 54.4609ZM59.6202 39.0603C59.4661 38.8941 59.2797 38.7617 59.0726 38.6712C58.8655 38.5807 58.642 38.534 58.4163 38.5341H24.8227C24.6624 38.5341 24.5056 38.5812 24.3716 38.6697C24.2375 38.7582 24.1321 38.8841 24.0682 39.032C24.0043 39.18 23.9847 39.3434 24.0119 39.5024C24.0391 39.6614 24.1118 39.8089 24.2212 39.9268L31.3131 47.5747C31.4667 47.7404 31.6525 47.8726 31.8589 47.9631C32.0654 48.0536 32.2881 48.1005 32.5133 48.1009H66.105C66.2653 48.1009 66.4221 48.0537 66.5563 47.9653C66.6901 47.8768 66.7955 47.7509 66.8597 47.603C66.9235 47.455 66.943 47.2915 66.9158 47.1326C66.8886 46.9736 66.816 46.8261 66.7067 46.7082L59.6202 39.0603ZM24.8227 33.5668H58.4163C58.642 33.5669 58.8655 33.5202 59.0726 33.4297C59.2797 33.3392 59.4661 33.2067 59.6202 33.0406L66.7067 25.3927C66.816 25.2748 66.8886 25.1273 66.9158 24.9683C66.943 24.8093 66.9235 24.6458 66.8597 24.4979C66.7955 24.35 66.6901 24.224 66.5563 24.1356C66.4221 24.0471 66.2653 24 66.105 24H32.5133C32.2881 24.0004 32.0654 24.0473 31.8589 24.1378C31.6525 24.2283 31.4667 24.3605 31.3131 24.5262L24.223 32.1741C24.1138 32.2919 24.0411 32.4392 24.0138 32.598C23.9866 32.7568 24.006 32.9202 24.0696 33.068C24.1333 33.2159 24.2385 33.3418 24.3722 33.4304C24.506 33.519 24.6626 33.5664 24.8227 33.5668Z" />
    </SvgIcon>
  );
}

/**
 * Bitcoin blockchain icon
 */
export function BitcoinSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 43 57">
      <path d="M42.8178 22.8422C43.7111 16.8719 39.1648 13.6624 32.9484 11.5214L34.9649 3.43384L30.0415 2.20697L28.0783 10.0814C26.7839 9.75887 25.4545 9.45463 24.1336 9.15317L26.1108 1.22687L21.1901 0L19.1722 8.08471C18.1009 7.84073 17.0491 7.5996 16.0283 7.34581L16.0339 7.32057L9.24397 5.62536L7.93424 10.8834C7.93424 10.8834 11.5872 11.7205 11.5101 11.7723C13.5042 12.2701 13.8645 13.5895 13.8042 14.6355L11.5073 23.8489C11.6447 23.884 11.8228 23.9345 12.0191 24.013C11.8551 23.9723 11.6798 23.9275 11.4989 23.884L8.27916 36.7907C8.03516 37.3964 7.41678 38.305 6.02289 37.96C6.07197 38.0315 2.44422 37.0669 2.44422 37.0669L0 42.7021L6.40711 44.2991C7.59906 44.5977 8.76716 44.9104 9.91705 45.2049L7.87955 53.3849L12.7974 54.6118L14.8153 46.5187C16.1587 46.8832 17.4628 47.2198 18.7389 47.5367L16.7281 55.5919L21.6515 56.8188L23.689 48.6542C32.0846 50.2428 38.3978 49.602 41.0551 42.0094C43.1964 35.8961 40.9485 32.3697 36.5313 30.0702C39.7482 29.3285 42.1713 27.2127 42.8178 22.8422ZM31.5686 38.6149C30.0471 44.7282 19.7528 41.4233 16.4153 40.5947L19.119 29.7575C22.4564 30.5904 33.1588 32.2393 31.5686 38.6149ZM33.0914 22.7539C31.7032 28.3147 23.1351 25.4894 20.3558 24.7968L22.807 14.9678C25.5864 15.6605 34.5372 16.9532 33.0914 22.7539Z" />
    </SvgIcon>
  );
}

/**
 * Ethereum blockchain icon
 */
export function EthereumSvgIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 34 54">
      <path d="M16.9969 0L16.6255 1.2306V36.9366L16.9969 37.2981L33.9895 27.501L16.9969 0Z" />
      <path d="M16.993 0L0 27.501L16.993 37.2981V19.9674V0Z" opacity={0.6} />
      <path d="M16.9969 40.436L16.7876 40.685V53.404L16.9969 54.0001L33.9999 30.644L16.9969 40.436Z" />
      <path d="M16.993 54.0001V40.436L0 30.644L16.993 54.0001Z" opacity={0.6} />
      <path d="M16.9907 37.2975L33.9833 27.5005L16.9907 19.9668V37.2975Z" opacity={0.2} />
      <path d="M0 27.5005L16.993 37.2975V19.9668L0 27.5005Z" opacity={0.6} />
    </SvgIcon>
  );
}
