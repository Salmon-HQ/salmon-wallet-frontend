import { Ionicons } from '@expo/vector-icons';
import {
  borderRadius,
  colors,
  ContentLoader,
  fontFamilyNative,
  fontSize,
  fontWeight,
  Rect,
  spacing,
  formatLargeNumber,
  getShortAddress,
  useCurrencyContext,
  semantic,
} from '@salmon/shared';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { TokenInfoProps } from './types';

/**
 * TokenInfo component for displaying token information
 *
 * Features:
 * - "About" section with description text
 * - Stats grid showing market cap, volume, supply metrics
 * - Contract address with copy button
 * - Website link (opens external browser)
 * - Loading skeleton state
 *
 * @example
 * ```tsx
 * <TokenInfo
 *   description="Solana is a high-performance blockchain..."
 *   marketCap={50000000000}
 *   volume24h={1500000000}
 *   circulatingSupply={400000000}
 *   totalSupply={500000000}
 *   contractAddress="So11111111111111111111111111111111111111112"
 *   website="https://solana.com"
 * />
 * ```
 */
export const TokenInfo: React.FC<TokenInfoProps> = ({
  description,
  marketCap,
  volume24h,
  circulatingSupply,
  totalSupply,
  maxSupply,
  contractAddress,
  website,
  loading = false,
  style,
}) => {
  const { t } = useTranslation();
  const [, { formatLarge }] = useCurrencyContext();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    if (contractAddress) {
      await Clipboard.setStringAsync(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [contractAddress]);

  const handleOpenWebsite = useCallback(async () => {
    if (website) {
      const supported = await Linking.canOpenURL(website);
      if (supported) {
        await Linking.openURL(website);
      }
    }
  }, [website]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        {/* About section skeleton */}
        <View style={styles.section}>
          <ContentLoader
            speed={1.5}
            width="100%"
            height={74}
            backgroundColor={colors.skeleton.base}
            foregroundColor={colors.skeleton.highlight}
          >
            {/* "About" title */}
            <Rect x="0" y="0" rx="4" ry="4" width="80" height={fontSize.md} />
            {/* Description lines */}
            <Rect x="0" y={fontSize.md + spacing.sm} rx="4" ry="4" width="100%" height="14" />
            <Rect x="0" y={fontSize.md + spacing.sm + 18} rx="4" ry="4" width="80%" height="14" />
            <Rect x="0" y={fontSize.md + spacing.sm + 36} rx="4" ry="4" width="60%" height="14" />
          </ContentLoader>
        </View>

        {/* Stats grid skeleton */}
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.statItem}>
              <ContentLoader
                speed={1.5}
                width="100%"
                height={34}
                backgroundColor={colors.skeleton.base}
                foregroundColor={colors.skeleton.highlight}
              >
                <Rect x="0" y="0" rx="4" ry="4" width="60" height="14" />
                <Rect x="0" y={14 + spacing.xxs} rx="4" ry="4" width="80" height="18" />
              </ContentLoader>
            </View>
          ))}
        </View>

        {/* Contract skeleton */}
        <ContentLoader
          speed={1.5}
          width="100%"
          height={52}
          backgroundColor={colors.skeleton.base}
          foregroundColor={colors.skeleton.highlight}
        >
          <Rect x="0" y="0" rx={borderRadius.md} ry={borderRadius.md} width="100%" height="52" />
        </ContentLoader>
      </View>
    );
  }

  const hasStats =
    marketCap !== undefined ||
    volume24h !== undefined ||
    circulatingSupply !== undefined ||
    totalSupply !== undefined ||
    maxSupply !== undefined;

  return (
    <View style={[styles.container, style]}>
      {/* About section */}
      {description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('token.info.about', 'About')}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      )}

      {/* Stats grid */}
      {hasStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('token.info.marketStats', 'Market Stats')}</Text>
          <View style={styles.statsGrid}>
            {marketCap !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('token.info.marketCap', 'Market Cap')}</Text>
                <Text style={styles.statValue}>{formatLarge(marketCap)}</Text>
              </View>
            )}
            {volume24h !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('token.info.volume24h', '24h Volume')}</Text>
                <Text style={styles.statValue}>{formatLarge(volume24h)}</Text>
              </View>
            )}
            {circulatingSupply !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('token.info.circulating', 'Circulating')}</Text>
                <Text style={styles.statValue}>{formatLargeNumber(circulatingSupply)}</Text>
              </View>
            )}
            {totalSupply !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('token.info.totalSupply', 'Total Supply')}</Text>
                <Text style={styles.statValue}>{formatLargeNumber(totalSupply)}</Text>
              </View>
            )}
            {maxSupply !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('token.info.maxSupply', 'Max Supply')}</Text>
                <Text style={styles.statValue}>{formatLargeNumber(maxSupply)}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Contract address */}
      {contractAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('token.info.contractAddress', 'Contract Address')}
          </Text>
          <TouchableOpacity
            style={styles.contractRow}
            onPress={handleCopyAddress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.copy_contract_address', 'Copy contract address')}
          >
            <Text style={styles.contractAddress}>{getShortAddress(contractAddress, 6) ?? ''}</Text>
            <View style={styles.copyButton}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copied ? semantic.status.success : semantic.text.secondary}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Website link */}
      {website && (
        <TouchableOpacity
          style={styles.websiteRow}
          onPress={handleOpenWebsite}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel={t('accessibility.open_website', 'Open website: {{url}}', {
            url: website,
          })}
        >
          <Ionicons name="globe-outline" size={20} color={colors.accent.primary} />
          <Text style={styles.websiteText}>{t('token.info.visitWebsite', 'Visit Website')}</Text>
          <Ionicons
            name="open-outline"
            size={16}
            color={colors.accent.primary}
            style={styles.websiteIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold as '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    fontFamily: fontFamilyNative.regular,
    fontWeight: fontWeight.regular as '400',
    color: semantic.text.secondary,
    lineHeight: fontSize.base * 1.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.regular,
    fontWeight: fontWeight.regular as '400',
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium as '500',
    color: colors.text.primary,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.input.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  contractAddress: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular as '400',
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
  },
  copyButton: {
    padding: spacing.xs,
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  websiteText: {
    fontSize: fontSize.base,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium as '500',
    color: colors.accent.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  websiteIcon: {
    marginLeft: spacing.xs,
  },
});

export default TokenInfo;
