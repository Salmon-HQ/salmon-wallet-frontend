/**
 * NFT · review and sign — everything the signature will move, on one card,
 * before anything is signed: the collectible, its collection, and where it is
 * going.
 *
 * Confirm calls the flow's `submitSend`, which is the sheet's
 * `handleConfirmSend` moved up a level: the same `useNftTransfer`, the same
 * NFT object. The one thing that did change is what the recipient resolves to
 * — a `.sol` domain is paid at its resolved address rather than signed for
 * verbatim — and both are on the card below, so nothing is signed that this
 * screen did not show.
 *
 * Confirm is gated on the flow's own verdict, not on the presence of a
 * string: `validatedRecipient` is what `useAddressValidation` approved, and it
 * is dropped the moment the field is edited, so the send screen's debounce
 * window cannot leak an unjudged address into a signature.
 */
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getShortAddress, isSignableAccount, s, spacing, vs } from '@salmon/shared';

import {
  Card,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  WarningNotice,
} from '../../../../src/components';
import { useNftFlow } from '../../../../src/contexts/NftFlowContext';
import { useTabChrome } from '../../../../hooks/useTabChrome';

export default function NftSendReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { floatingBottomOffset } = useTabChrome();
  const {
    nft,
    account,
    recipient,
    validatedRecipient,
    resolvedRecipient,
    sending,
    sendError,
    submitSend,
  } = useNftFlow();

  const canSignAccount = !!account && isSignableAccount(account);
  // The sheet's `canConfirmSend`, with its `addressValid` restored as the
  // flow-level verdict it has to be once the field lives on another screen.
  const canConfirm =
    validatedRecipient !== null &&
    recipient === validatedRecipient &&
    !sending &&
    nft?.blockchain !== 'bitcoin' &&
    canSignAccount;

  // What the transfer will actually pay. When a domain was typed, the resolved
  // address is the destination — showing only the domain here would ask the
  // user to sign for something this screen never displayed.
  const destination = resolvedRecipient ?? recipient;
  const resolvedFromDomain =
    resolvedRecipient && resolvedRecipient !== recipient ? recipient : null;

  const handleConfirm = useCallback(() => {
    void submitSend();
  }, [submitSend]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        backDisabled={sending}
        title={t('nft.send.reviewTitle')}
        subtitle={nft?.name}
      />

      <ScrollView
        testID="nft-send-review-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card padding="lg" gap={spacing.md} testID="nft-send-review-summary">
          <KeyValueRow label={t('nft.detail.title')} value={nft?.name ?? ''} />
          {!!nft?.collectionName && (
            <KeyValueRow
              label={t('nft.detail.collection')}
              value={nft.collectionName}
              valueTone="secondary"
            />
          )}
          <KeyValueRow
            testID="nft-send-review-recipient"
            label={t('token.send.recipient')}
            value={getShortAddress(destination) ?? destination}
          />
          {resolvedFromDomain !== null && (
            <KeyValueRow
              testID="nft-send-review-resolved-from"
              label={t('send.recipient')}
              value={resolvedFromDomain}
              valueTone="secondary"
            />
          )}
        </Card>

        {!!sendError && <WarningNotice tone="error" title={t(sendError)} style={styles.notice} />}
      </ScrollView>

      <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
        <PrimaryButton
          testID="nft-send-confirm-button"
          onPress={handleConfirm}
          disabled={!canConfirm}
          loading={sending}
        >
          {t('actions.send')}
        </PrimaryButton>
      </View>
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
