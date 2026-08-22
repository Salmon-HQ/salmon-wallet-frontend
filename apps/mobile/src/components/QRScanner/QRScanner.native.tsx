import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  fontSize,
  fontWeight,
  semantic,
} from '@salmon/shared';
import { classifyScanPayload } from './scan-payload';
import type { QRScannerProps } from './types';

export const QRScanner: React.FC<QRScannerProps> = ({
  visible,
  blockchain,
  onScan,
  onClose,
  title,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [appActive, setAppActive] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
  );
  const [rejection, setRejection] = useState<'notAddress' | 'wrongChain' | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    scannedRef.current = false;
    setRejection(null);
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, [visible]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) {
        return;
      }
      const result = classifyScanPayload(data, blockchain);
      if (result.kind === 'valid') {
        scannedRef.current = true;
        onScan({ data, address: result.address, amount: result.amount });
      } else {
        setRejection(result.kind);
      }
    },
    [blockchain, onScan]
  );

  if (!visible) {
    return null;
  }

  const permissionDenied = permission != null && !permission.granted;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible} transparent={false}>
      <View style={[styles.container, containerStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title ?? t('qrScanner.title', 'Scan QR Code')}</Text>
          <TouchableOpacity
            testID="qr-scanner-close-button"
            accessibilityRole="button"
            accessibilityLabel={t('actions.close', 'Close')}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>{t('actions.close', 'Close')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {permission?.granted && appActive && (
            <CameraView
              testID="qr-scanner-camera"
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}

          {permissionDenied && (
            <View testID="qr-scanner-permission-denied" style={styles.messageContainer}>
              <Text style={styles.messageTitle}>
                {t('qrScanner.permissionTitle', 'Camera access needed')}
              </Text>
              <Text style={styles.messageText}>
                {t(
                  'qrScanner.permissionMessage',
                  'Scanning QR codes requires camera access. You can still type or paste the address manually.'
                )}
              </Text>
              <TouchableOpacity
                testID="qr-scanner-settings-button"
                accessibilityRole="button"
                accessibilityLabel={t('qrScanner.openSettings', 'Open Settings')}
                onPress={() => Linking.openSettings()}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsButtonText}>
                  {t('qrScanner.openSettings', 'Open Settings')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {rejection && (
            <View style={styles.rejectionContainer}>
              <Text testID="qr-scanner-error" style={styles.rejectionText}>
                {rejection === 'wrongChain'
                  ? t('qrScanner.wrongNetwork', 'This address belongs to a different network')
                  : t('qrScanner.notAddress', 'This code is not a valid address')}
              </Text>
            </View>
          )}
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
    paddingTop: spacing['5xl'],
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: semantic.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    color: colors.scanner.textSecondary,
    fontSize: fontSize.bodyLg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  messageContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  messageTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  messageText: {
    fontSize: fontSize.bodyLg,
    color: colors.scanner.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  settingsButton: {
    backgroundColor: colors.scanner.button,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: semantic.text.primary,
    fontSize: fontSize.bodyLg,
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
  },
  rejectionContainer: {
    position: 'absolute',
    bottom: spacing['5xl'],
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.scanner.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  rejectionText: {
    color: semantic.text.primary,
    fontSize: fontSize.bodyLg,
    textAlign: 'center',
  },
});

export default QRScanner;
