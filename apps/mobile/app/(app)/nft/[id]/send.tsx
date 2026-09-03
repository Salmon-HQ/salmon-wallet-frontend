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
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  isSignableAccount,
  spacing,
  useAddressValidation,
  useValidationDirty,
  vs,
} from '@salmon/shared';

import {
  PrimaryButton,
  QRScanner,
  RecipientInput,
  SettingsScreenLayout,
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

  // Continue waits for a verdict on the CURRENT text, not the previous one.
  const { dirty, markDirty } = useValidationDirty(isValidating);

  const handleChangeText = useCallback(
    (value: string) => {
      markDirty();
      setRecipient(value);
    },
    [markDirty, setRecipient]
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

  // The shell's KeyboardAvoidingView lifts the footer by the keyboard; the
  // inset under it is what is left of the old padding — the floating chrome
  // when there is no keyboard, a step when there is.
  const footerBottomInset = keyboardHeight > 0 ? vs(spacing.sm) : floatingBottomOffset;

  return (
    <>
      <SettingsScreenLayout
        testID="nft-send-screen"
        title={t('nft.send.title')}
        subtitle={nft?.name}
        onBack={() => router.back()}
        footerBottomInset={footerBottomInset}
        footer={
          isOrdinal ? undefined : (
            <PrimaryButton
              testID="nft-send-continue-button"
              onPress={handleContinue}
              disabled={!canContinue}
            >
              {t('actions.continue')}
            </PrimaryButton>
          )
        }
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
      </SettingsScreenLayout>

      <QRScanner
        visible={showScanner}
        blockchain={nft?.blockchain ?? 'solana'}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: 0,
  },
});
