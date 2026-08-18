/**
 * HeaderContent — Content rendered inside GateContainer when collapsed
 *
 * Displays the wallet header bar: avatar, account name, address, copy, settings.
 * No positioning or animation — GateContainer handles that.
 */

import {
  colors,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  fontWeight,
  letterSpacing,
  componentSizes,
  ms,
  s,
  spacing,
  vs,
  getShortAddress,
  getAvatarColor,
  getInitials,
  semantic,
} from '@salmon/shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { ContentCopySvgIcon, SettingsSvgIcon, WalletSvgIcon } from '../Icon';

// ============================================================================
// Props
// ============================================================================

export interface HeaderContentProps {
  accountName: string;
  address: string;
  onCopyAddress?: () => void;
  onSettingsPress?: () => void;
  onWalletPress?: () => void;
  developerMode?: boolean;
  avatarUrl?: string;
  accountId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderContent({
  accountName,
  address,
  onCopyAddress,
  onSettingsPress,
  onWalletPress,
  developerMode = false,
  avatarUrl,
  accountId,
}: HeaderContentProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();

  const handleCopyPress = useCallback(() => {
    onCopyAddress?.();
    showCopied();
  }, [onCopyAddress, showCopied]);

  const handleSettingsPress = useCallback(() => {
    onSettingsPress?.();
  }, [onSettingsPress]);

  const handleWalletPress = useCallback(() => {
    onWalletPress?.();
  }, [onWalletPress]);

  const truncatedAddress = getShortAddress(address, developerMode ? 8 : 4) ?? address;
  const displayText = `${accountName} (${truncatedAddress})`;

  const avatarColor = useMemo(
    () => (accountId ? getAvatarColor(accountId) : semantic.text.secondary),
    [accountId]
  );
  const initials = useMemo(() => getInitials(accountName), [accountName]);

  return (
    <View style={styles.container}>
      {/* Left side - Avatar/Wallet icon + Account info */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          testID="wallet-header-account-switcher"
          style={styles.walletIconContainer}
          onPress={handleWalletPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.switch_wallet')}
          hitSlop={{ top: 2, bottom: 2, left: 8, right: 8 }}
        >
          {avatarUrl && !imgError ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.headerAvatar}
              contentFit="cover"
              onError={() => setImgError(true)}
            />
          ) : accountId ? (
            <View style={[styles.headerAvatarFallback, { backgroundColor: avatarColor }]}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          ) : (
            <WalletSvgIcon size={s(28)} color={semantic.text.secondary} />
          )}
        </TouchableOpacity>

        <View style={styles.accountInfo}>
          <Text
            style={styles.accountText}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={fontScaleCap.chrome}
          >
            {displayText}
          </Text>
          <TouchableOpacity
            testID="wallet-header-copy-address"
            onPress={handleCopyPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? t('actions.copied')
                : t('accessibility.copy_address', { address: truncatedAddress })
            }
            style={styles.copyButton}
            hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
          >
            {/* 23 not 30: the copy glyph fills ~77% of its 24px viewBox vs the
                settings glyph's ~60%, so it renders larger at the same size. */}
            {/* UNRESOLVED: this swap does not paint on device.
                Instrumented on the real mount path: the handler fires,
                `copied` flips true and reverts 1519ms later, matching
                `motionMs.feedbackHold` almost exactly — so the state and the
                timing are correct and React commits the change. The glyph on
                screen never changes for the whole hold. Ruled out: the spring
                and the Animated.View (stripped entirely, still no paint), and
                the header coming from the navigator's `screenOptions`
                (`headerShown` is false; this is a plain `headerContent` prop
                inside GateContainer). Adding a `key` per branch was tried and
                removed — the two branches are different component types, so
                React already unmounts and remounts across them and a key
                changes nothing.
                What has NOT been ruled out is a native-side cause, which is
                where the next attempt should start. `ReceiveSheet` and
                `TransactionDetailModal` drive the same hook correctly, so the
                difference is this mount site, not the hook.
                `.maestro/flows/smoke/home/copy-address-checkmark.yaml` asserts
                the real behaviour on a device; Jest cannot, because its
                renderer does not reproduce native paint. */}
            {copied ? (
              <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                <Ionicons name="checkmark" size={s(23)} color={semantic.status.success} />
              </Animated.View>
            ) : (
              <ContentCopySvgIcon size={s(23)} color={semantic.text.accent} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Right side - Settings button */}
      <TouchableOpacity
        testID="wallet-header-settings-button"
        style={styles.settingsButton}
        onPress={handleSettingsPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.open_settings')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <SettingsSvgIcon size={s(30)} color={semantic.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.headerPadding),
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.base),
  },
  walletIconContainer: {
    width: s(componentSizes.iconSizeLarge),
    height: vs(componentSizes.buttonHeightSmall),
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  accountText: {
    flex: 1,
    minWidth: 0,
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.header,
    lineHeight: vs(22),
  },
  copyButton: {
    flexShrink: 0,
    padding: s(spacing.xs),
  },
  settingsButton: {
    width: s(componentSizes.iconSizeLarge),
    height: vs(componentSizes.iconSizeLarge),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: s(componentSizes.iconSizeMButton),
    height: s(componentSizes.iconSizeMButton),
    borderRadius: s(14),
  },
  headerAvatarFallback: {
    width: s(componentSizes.iconSizeMButton),
    height: s(componentSizes.iconSizeMButton),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: colors.text.primary,
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
  },
});
