/**
 * QRScanner - Web Version
 *
 * QR code scanning is not available on web platforms.
 * This component displays a message directing users to use the mobile app.
 */

import React from 'react';
import { Modal, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  fontSize,
  fontWeight,
} from '@salmon/shared';
import type { QRScannerProps } from './types';

/**
 * QRScanner component for web platforms.
 * Displays a message indicating that QR scanning is only available on mobile.
 */
export const QRScanner: React.FC<QRScannerProps> = ({
  visible,
  onClose,
  title,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('qrScanner.title', 'Scan QR Code');

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible} transparent={false}>
      <View style={[styles.container, containerStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('general.close', 'Close')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{'📱'}</Text>
          </View>
          <Text style={styles.messageTitle}>
            {t('qrScanner.unavailableTitle', 'QR Scanner Unavailable')}
          </Text>
          <Text style={styles.messageText}>
            {t(
              'qrScanner.unavailableMessage',
              'QR code scanning is only available on the mobile app.'
            )}
          </Text>
          <Text style={styles.messageSubtext}>
            {t(
              'qrScanner.mobileAppOnly',
              'Please use the Salmon Wallet mobile app to scan QR codes.'
            )}
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>{t('general.close', 'Close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.scanner.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.scanner.surface,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.scanner.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    color: colors.scanner.textSecondary,
    fontSize: fontSize.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.scanner.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  icon: {
    fontSize: fontSize['4xl'],
  },
  messageTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.scanner.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.scanner.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  messageSubtext: {
    fontSize: fontSize.base,
    color: colors.scanner.textTertiary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  button: {
    backgroundColor: colors.scanner.button,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.scanner.text,
    fontSize: fontSize.md,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
  },
});

export default QRScanner;
