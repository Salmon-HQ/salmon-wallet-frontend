/**
 * WalletHeader - Account info and navigation header
 *
 * Web version using MUI and @emotion/styled for browser extension
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keyframes } from '@emotion/react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import MuiAvatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { CheckIcon, iconSize } from '../../icons';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  getAvatarColor,
  getShortAddress,
  getInitials,
  opacity,
  componentSizes,
  durationMs,
  semantic,
} from '@salmon/shared';
import { CopyIcon, RefreshIcon, SettingsIcon } from '../Icon';
import type { WalletHeaderProps } from './types';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.md}px ${spacing.xl}px`,
  backgroundColor: colors.background.primary,
  borderBottomLeftRadius: borderRadius['2xl'],
  borderBottomRightRadius: borderRadius['2xl'],
});

const AccountInfo = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  marginRight: spacing.lg,
  cursor: 'pointer',
  '&:hover': {
    opacity: opacity.medium,
  },
});

const AccountTextContainer = styled(Box)({
  flex: 1,
});

const AccountName = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.xxs,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const AddressContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
});

const Address = styled(Typography)({
  fontSize: fontSize.sm,
  fontFamily: fontFamily.mono,
  color: colors.text.muted,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/**
 * The copy affordance, not the address. Salmon ink at 6.07:1 on the header
 * ground marks the one thing in this block you can act on; the address itself
 * stays neutral mono because it is data to read, not a control.
 */
const spinKeyframes = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/** The refresh glyph turns only while a refresh is in flight. */
const RefreshIconStyled = styled(RefreshIcon)<{ $spinning?: boolean }>(({ $spinning }) => ({
  animation: $spinning ? `${spinKeyframes} ${durationMs.spin}ms linear infinite` : undefined,
}));

const CopyIconStyled = styled(CopyIcon)({
  marginLeft: spacing.sm,
  width: iconSize.sm,
  height: iconSize.sm,
  color: semantic.text.accent,
});

const ActionButtons = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
});

const HeaderButton = styled(IconButton)({
  width: componentSizes.headerButtonSize,
  height: componentSizes.headerButtonSize,
  borderRadius: borderRadius.tokenIcon,
  backgroundColor: colors.card.border,
  '&:hover': {
    backgroundColor: colors.interactive.hoverMedium,
  },
});

/**
 * WalletHeader component for displaying account info and navigation
 *
 * Displays:
 * - Account name + truncated address
 * - Copy button to copy full address
 * - Settings icon for navigation
 *
 * If onWalletPress is provided, clicking the account name area opens the wallet switcher.
 * If only onCopyAddress is provided, clicking the account name area copies the address.
 *
 * @example
 * ```tsx
 * <WalletHeader
 *   accountName="Account 1"
 *   address="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
 *   onCopyAddress={() => navigator.clipboard.writeText(address)}
 *   onSettingsPress={() => navigate('/settings')}
 *   onWalletPress={() => setWalletSwitcherVisible(true)}
 * />
 * ```
 */
export function WalletHeader({
  accountName,
  address,
  onCopyAddress,
  onSettingsPress,
  onRefreshPress,
  refreshing,
  onWalletPress,
  avatarUrl,
  accountId,
  style,
  className,
}: WalletHeaderProps) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPress = useCallback(() => {
    onCopyAddress?.();
    setCopied(true);
    setTimeout(() => setCopied(false), durationMs.feedbackShort);
  }, [onCopyAddress]);

  const handleSettingsPress = useCallback(() => {
    onSettingsPress?.();
  }, [onSettingsPress]);

  const handleWalletPress = useCallback(() => {
    onWalletPress?.();
  }, [onWalletPress]);

  const truncatedAddress = getShortAddress(address, 6);

  const { t } = useTranslation();

  const avatarColor = useMemo(
    () => (accountId ? getAvatarColor(accountId) : colors.text.muted),
    [accountId]
  );
  const initials = useMemo(() => getInitials(accountName), [accountName]);

  return (
    <Container style={style} className={className}>
      {/* Left side - Account info (click copies address) */}
      <AccountInfo
        onClick={handleCopyPress}
        role="button"
        aria-label={
          copied
            ? t('actions.copied')
            : t('accessibility.copy_address', { address: truncatedAddress })
        }
        data-testid="wallet-header-copy-address"
      >
        {/* Avatar */}
        {avatarUrl && !imgError ? (
          <MuiAvatar
            src={avatarUrl}
            data-testid="wallet-header-account-switcher"
            role="button"
            aria-label={t('accessibility.switch_wallet')}
            sx={{
              width: componentSizes.iconSizeLarge,
              height: componentSizes.iconSizeLarge,
              marginRight: `${spacing.md}px`,
              cursor: 'pointer',
            }}
            imgProps={{ alt: '', onError: () => setImgError(true) }}
            onClick={(e) => {
              e.stopPropagation();
              handleWalletPress();
            }}
          />
        ) : accountId ? (
          <MuiAvatar
            data-testid="wallet-header-account-switcher"
            role="button"
            aria-label={t('accessibility.switch_wallet')}
            sx={{
              width: componentSizes.iconSizeLarge,
              height: componentSizes.iconSizeLarge,
              marginRight: `${spacing.md}px`,
              backgroundColor: avatarColor,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.bold,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleWalletPress();
            }}
          >
            {initials}
          </MuiAvatar>
        ) : null}
        <AccountTextContainer>
          <AccountName>{accountName}</AccountName>
          <AddressContainer>
            <Address>{truncatedAddress}</Address>
            {copied ? (
              <CheckIcon
                size={iconSize.sm}
                color={colors.status.success}
                style={{ marginLeft: `${spacing.sm}px` }}
              />
            ) : (
              <CopyIconStyled />
            )}
          </AddressContainer>
        </AccountTextContainer>
      </AccountInfo>

      {/* Right side - Refresh + Settings buttons */}
      <ActionButtons>
        {onRefreshPress && (
          <HeaderButton
            onClick={onRefreshPress}
            aria-label={t('accessibility.refresh_balance', 'Refresh balance')}
            data-testid="wallet-header-refresh-button"
          >
            <RefreshIconStyled
              $spinning={refreshing}
              size={iconSize.lg}
              color={colors.text.primary}
            />
          </HeaderButton>
        )}
        <HeaderButton
          onClick={handleSettingsPress}
          aria-label={t('accessibility.open_settings')}
          data-testid="wallet-header-settings-button"
        >
          <SettingsIcon color={colors.text.primary} size={iconSize.lg} />
        </HeaderButton>
      </ActionButtons>
    </Container>
  );
}
