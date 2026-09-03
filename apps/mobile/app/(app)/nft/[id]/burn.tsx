/**
 * NFT · burn review — the sheet's burn step as a screen.
 *
 * Burning destroys the collectible and nothing brings it back, so this screen
 * says so first and offers the confirm last. The lookup-table block below is
 * not a warning about risk but a disclosure of cost: fitting some burns on
 * Solana needs a temporary address lookup table, whose rent stays locked until
 * that account is deactivated and closed, and the user pays for it before the
 * burn is even submitted.
 *
 * The preview is prepared on the way in (`prepareBurn`, fired by the detail
 * screen's trigger, exactly as the sheet fired it) and the confirm hands that
 * prepared transaction straight to `useNftBurn` — the same call, the same
 * arguments.
 */
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fontFamilyNative,
  fontSize,
  formatRawAmount,
  isSignableAccount,
  lineHeight,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import {
  Card,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
  WarningNotice,
} from '../../../../src/components';
import { useNftFlow } from '../../../../src/contexts/NftFlowContext';
import { useTabChrome } from '../../../../hooks/useTabChrome';
import { useThemedStyles } from '../../../../src/theme/useThemedStyles';

/** SOL's decimals — what the lookup table's rent estimate is denominated in. */
const LAMPORT_DECIMALS = 9;

export default function NftBurnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const { floatingBottomOffset } = useTabChrome();
  const { nft, account, burnPreview, burnPreparing, burnError, confirmBurn, resetBurn } =
    useNftFlow();

  const canSignAccount = !!account && isSignableAccount(account);
  // The sheet's `canConfirmBurn`, unchanged.
  const canConfirm = !burnPreparing && !burnError && !!burnPreview && canSignAccount;
  const busyLabel = burnPreview ? t('nft.burn.submitting') : t('nft.burn.preparing');

  const lutInfo = burnPreview?.lookupTable;

  // The preview is dropped on the way out however the screen is left — the
  // back control, the iOS swipe-back, or the hardware back. Doing it only in
  // the control's handler left a stale preview behind a swipe.
  useEffect(() => () => resetBurn(), [resetBurn]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        backDisabled={burnPreparing}
        title={t('nft.burn.reviewTitle')}
        subtitle={nft?.name}
      />

      <ScrollView
        testID="nft-burn-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View testID="nft-burn-irreversible-notice">
          <WarningNotice tone="error" title={t('nft.burn.reviewBody')} style={styles.notice} />
        </View>

        {lutInfo && (
          <View style={styles.group} testID="nft-burn-lut">
            <SectionLabel variant="title">{t('nft.burn.lutTitle')}</SectionLabel>
            <Card padding="lg" gap={spacing.md}>
              <Text style={styles.bodyText}>{t('nft.burn.lutBody')}</Text>
              <KeyValueRow
                label={t('nft.burn.lutRent')}
                value={`${formatRawAmount(lutInfo.estimatedRentLamports, LAMPORT_DECIMALS)} SOL`}
              />
              <KeyValueRow
                label={t('nft.burn.lutAddressCount')}
                value={String(lutInfo.addressCount)}
              />
              <KeyValueRow
                label={t('nft.burn.lutSteps')}
                value={String(lutInfo.extendTransactionCount + 1)}
              />
              <Text style={styles.footnote}>{t('nft.burn.lutFootnote')}</Text>
            </Card>
          </View>
        )}

        {!!burnError && (
          <View testID="nft-burn-error">
            <WarningNotice tone="error" title={t(burnError)} style={styles.notice} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
        <PrimaryButton
          testID="nft-burn-confirm-button"
          onPress={() => void confirmBurn()}
          disabled={!canConfirm}
          loading={burnPreparing}
        >
          {burnPreparing ? busyLabel : t('nft.burn.confirm')}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    body: {
      flex: 1,
    },
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingBottom: vs(spacing.screenGutter),
      gap: vs(spacing.screenGutter),
    },
    group: {
      gap: vs(spacing.sm),
    },
    bodyText: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.normal,
      color: t.text.secondary,
    },
    footnote: {
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.normal,
      color: t.text.tertiary,
    },
    notice: {
      marginTop: 0,
    },
    action: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
    },
  });
