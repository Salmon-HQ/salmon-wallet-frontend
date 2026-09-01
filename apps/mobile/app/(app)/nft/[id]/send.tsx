/**
 * NFT · send, who — the sheet's send step as a screen.
 *
 * One question only: who receives this collectible. The field and its verdict
 * are the send flow's own (`RecipientInput` over `useAddressValidation`), so
 * an NFT recipient is judged by exactly the machinery a token recipient is —
 * the sheet reached the same hook through `InputAddress`, which read the
 * globally active account rather than the one that owns the NFT. This screen
 * validates against the owning sub-account, which is the account that will
 * sign.
 *
 * Ordinals have no transfer path yet (`useNftTransfer` refuses them), so a
 * Bitcoin NFT gets the notice and no way forward.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSignableAccount, s, spacing, useAddressValidation, vs } from '@salmon/shared';

import {
  DepthBackground,
  PrimaryButton,
  QRScanner,
  RecipientInput,
  ScalesBackground,
  ScreenHeader,
  WarningNotice,
} from '../../../../src/components';
import type { QRScanResult } from '../../../../src/components';
import { useNftFlow } from '../../../../src/contexts/NftFlowContext';
import { useTabChrome } from '../../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../../hooks/useKeyboardHeight';

export default function NftSendScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; section?: string; sub?: string }>();
  const { floatingBottomOffset } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();
  const { nft, account, recipient, setRecipient, setValidatedRecipient } = useNftFlow();

  const [showScanner, setShowScanner] = useState(false);

  const {
    validationState,
    isValidating,
    isValid: isAddressValid,
    resolvedAddress,
  } = useAddressValidation(recipient, account, { debounceMs: 500 });

  // The hook holds its verdict across an edit: for the 500ms the debounce is
  // pending it still reports the PREVIOUS string's `isValid` with
  // `isValidating` false, so a freshly typed address reads as approved. This
  // flag is the missing "judged for the current text" bit — set on every
  // keystroke, cleared only when a validation cycle actually completes (the
  // hook aborts superseded cycles without ever settling them, so only the
  // last one clears it).
  const [dirty, setDirty] = useState(false);
  const wasValidating = useRef(false);
  useEffect(() => {
    if (wasValidating.current && !isValidating) setDirty(false);
    wasValidating.current = isValidating;
  }, [isValidating]);

  const handleChangeText = useCallback(
    (value: string) => {
      setDirty(true);
      setRecipient(value);
    },
    [setRecipient]
  );

  const isOrdinal = nft?.blockchain === 'bitcoin';
  const canSignAccount = !!account && isSignableAccount(account);
  const canContinue = isAddressValid && !isValidating && !dirty && !isOrdinal && canSignAccount;

  const handleScan = useCallback(
    (result: QRScanResult) => {
      handleChangeText(result.address);
      setShowScanner(false);
    },
    [handleChangeText]
  );

  // The verdict travels with the flow, not with this screen: the review screen
  // signs only for the string recorded here, and a domain carries the address
  // it resolved to (the same pair `send/index.tsx` hands `SendFlowContext`).
  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    setValidatedRecipient(recipient, resolvedAddress || null);
    router.push(
      `/nft/${encodeURIComponent(params.id)}/review?section=${params.section ?? 'solana'}&sub=${
        params.sub ?? '0'
      }`
    );
  }, [
    canContinue,
    recipient,
    resolvedAddress,
    setValidatedRecipient,
    params.id,
    params.section,
    params.sub,
    router,
  ]);

  // The action row clears the keyboard by the keyboard's own measured height —
  // the idiom every keyboarded surface here uses.
  const actionBottomPadding =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader onBack={() => router.back()} title={t('nft.send.title')} subtitle={nft?.name} />

      <ScrollView
        testID="nft-send-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isOrdinal ? (
          <WarningNotice
            tone="warning"
            title={t('nft.send.ordinalsNotSupported')}
            style={styles.notice}
          />
        ) : (
          <RecipientInput
            value={recipient}
            onChangeText={handleChangeText}
            onScanPress={() => setShowScanner(true)}
            scanLabel={t('qrScanner.scanButton')}
            placeholder={t('nft.send.enterRecipientAddress')}
            validationState={validationState}
            isValidating={isValidating}
          />
        )}
      </ScrollView>

      {!isOrdinal && (
        <View style={[styles.action, { paddingBottom: actionBottomPadding }]}>
          <PrimaryButton
            testID="nft-send-continue-button"
            onPress={handleContinue}
            disabled={!canContinue}
          >
            {t('actions.continue')}
          </PrimaryButton>
        </View>
      )}

      <QRScanner
        visible={showScanner}
        blockchain={nft?.blockchain ?? 'solana'}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  notice: {
    marginTop: 0,
  },
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
  },
});
