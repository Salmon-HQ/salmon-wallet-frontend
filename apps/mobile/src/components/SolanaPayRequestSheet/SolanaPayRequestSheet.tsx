/**
 * SolanaPayRequestSheet — the merchant a Solana Pay transaction request names,
 * while the wallet contacts it and prepares the payment (spec 043). Core's
 * review takes over once the transaction is ready; this sheet only draws what
 * `useSolanaPayTransactionRequest` decided. The DOM twin is
 * `packages/ui/src/components/SolanaPayRequestSheet`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilyNative, fontSize, s, spacing, vs, type Semantic } from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button/PrimaryButton';
import { SecondaryButton } from '../Button/SecondaryButton';
import { Spinner } from '../Spinner';
import { RequesterRow } from '../TransactionConfirmation/RequesterRow';
import { WarningNotice } from '../WarningNotice';
import type { SolanaPayRequestSheetProps } from './types';

export function SolanaPayRequestSheet({
  visible,
  merchant,
  phase,
  error,
  onRetry,
  onClose,
}: SolanaPayRequestSheetProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { compactContentBottomPadding } = useBottomSheetChrome();

  return (
    <BottomSheetContainer visible={visible} onClose={onClose} testID="solana-pay-sheet">
      <View style={[styles.content, { paddingBottom: compactContentBottomPadding }]}>
        <RequesterRow
          name={merchant.label}
          icon={merchant.icon}
          domain={merchant.domain}
          testID="solana-pay-merchant"
        />

        {phase === 'failed' ? (
          <View testID="solana-pay-error">
            <WarningNotice tone="warning" title={t(error?.key ?? 'solanaPay.errors.unreachable')}>
              {error?.merchantMessage
                ? t('solanaPay.merchantMessage', { message: error.merchantMessage })
                : null}
            </WarningNotice>
          </View>
        ) : (
          <View style={styles.status} testID="solana-pay-status" accessibilityRole="progressbar">
            <Spinner color={semantic.text.secondary} />
            <Text style={styles.statusText} testID="solana-pay-status-text">
              {t(phase === 'preparing' ? 'solanaPay.preparing' : 'solanaPay.contacting')}
            </Text>
          </View>
        )}

        {onRetry ? (
          <PrimaryButton testID="solana-pay-retry" onPress={onRetry}>
            {t('solanaPay.retry')}
          </PrimaryButton>
        ) : null}

        <SecondaryButton testID="solana-pay-close" onPress={onClose}>
          {t('actions.close')}
        </SecondaryButton>
      </View>
    </BottomSheetContainer>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.lg),
    },
    status: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
    },
    statusText: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      color: t.text.secondary,
    },
  });
