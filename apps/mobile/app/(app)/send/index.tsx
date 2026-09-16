/**
 * Send · who — CORE 04 (+04A, +04B).
 *
 * The first of the four send screens. It answers one question — who receives
 * this — and nothing else: the amount is the next screen's job, which is why
 * the sheet's single "address and amount" step became two.
 *
 * The validation is the wallet's own, unchanged: `useAddressValidation` on the
 * active account, the same 500ms debounce, the same result codes. The two
 * states the frames single out are the two that hook already reports:
 *
 * - **04A** — the address is rejected (`invalid`). The message is the one the
 *   validator produced; the card is where the frames put it.
 * - **04B** — the address is valid but the account does not exist on-chain yet
 *   (`no_info`, a WARNING). Informational: Continue stays live, because the
 *   transfer is what will initialise it.
 *
 * Both are one block: the tone follows the validator's message type and the
 * copy is the validator's own key. Nothing here decides whether an address is
 * good — this screen only draws the verdict.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  classifyScanPayload,
  formatTokenAmount,
  getShortAddress,
  s,
  spacing,
  useAddressValidation,
  useRecipientOptions,
  useSendContacts,
  useTransactions,
  vs,
  type NetworkId,
  type RecipientOption,
  type TransferRequest,
} from '@salmon/shared';

import {
  IconBubble,
  ListRow,
  PrimaryButton,
  QRScanner,
  RecipientInput,
  SectionLabel,
  SettingsScreenLayout,
  TokenLogo,
  TokenPickerSheet,
  WarningNotice,
} from '../../../src/components';
import type { QRScanResult } from '../../../src/components';
import { CaretRightIcon, iconSize } from '../../../src/icons';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useSemantic } from '../../../src/theme/useThemedStyles';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';

/** How many past counterparties the "Recent" section offers. */

/** A row the user can tap to fill the field. */

/** The initial the avatar bubble carries — a name's, or the address's. */
function initialOf(option: RecipientOption): string {
  return (option.name.trim()[0] ?? option.address[0] ?? '?').toUpperCase();
}

export default function SendRecipientScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const semantic = useSemantic();
  const { floatingBottomOffset } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();
  const {
    account,
    blockchain,
    networkId,
    recipient,
    setRecipient,
    token,
    setToken,
    tokens,
    tokensLoading,
    liveBalance,
    startFromRequest,
  } = useSendFlow();

  const [address, setAddress] = useState(recipient?.address ?? '');
  // Payments' Pay lands here with the scanner already up.
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  const [showScanner, setShowScanner] = useState(scan === '1');
  const [pickerOpen, setPickerOpen] = useState(false);
  // A scanned payment request asked for a token this account does not hold.
  // The wallet never substitutes another (spec 033 FR-023).
  // A translation key when a payment request could not start the flow: the
  // token is not held, or the pasted text is a request the wallet cannot read.
  const [requestError, setRequestError] = useState<string | null>(null);

  // `liveBalance` already falls back to the token's own amount.
  const tokenBalance = liveBalance ?? 0;

  const senderAddress = account?.getReceiveAddress() ?? '';
  const { contacts, ownWallets } = useSendContacts(senderAddress);

  const {
    validationState,
    isValidating,
    isValid: isAddressValid,
    resolvedAddress,
    message: addressMessage,
    messageType: addressMessageType,
  } = useAddressValidation(address, account, { debounceMs: 500 });

  // The people this wallet has actually paid. The counterparty of a send is
  // the same field the activity row reads, so the two surfaces agree on who a
  // transfer went to.
  const { transactions } = useTransactions({
    address: senderAddress,
    networkId: (networkId ?? 'solana-mainnet') as NetworkId,
    skip: !senderAddress,
    account,
  });

  const { recents, contactRows, walletRows, recipientFor } = useRecipientOptions({
    transactions,
    senderAddress,
    contacts,
    ownWallets,
  });

  // A payment request fills the whole flow: the recipient, the token and the
  // amount are the requester's, and the next screen is whichever the request
  // left open (spec 033 US3). Scanned or pasted, it is the same door.
  const startRequest = useCallback(
    (request: TransferRequest, fallbackAddress: string) => {
      const outcome = startFromRequest(request, tokens);
      if (!outcome.ok) {
        setAddress(fallbackAddress);
        setRequestError('send.request.tokenNotHeld');
        return;
      }
      router.push(outcome.next === 'review' ? '/send/review' : '/send/amount');
    },
    [router, startFromRequest, tokens]
  );

  // A code that only carries an address fills the field, as it always has.
  const handleScan = useCallback(
    (result: QRScanResult) => {
      setShowScanner(false);
      setRequestError(null);
      if (!result.request) {
        setAddress(result.address);
        return;
      }
      startRequest(result.request, result.address);
    },
    [startRequest]
  );

  // The same field takes a pasted request: a `solana:` URI is classified like
  // a scan, so a request that arrived as text on the phone pays like one that
  // arrived as a code. Anything else is an address the validator judges.
  const handleChangeText = useCallback(
    (next: string) => {
      setRequestError(null);
      const trimmed = next.trim();
      if (!/^solana:/i.test(trimmed)) {
        setAddress(next);
        return;
      }
      const outcome = classifyScanPayload(trimmed, blockchain);
      if (outcome.kind === 'invalidRequest') {
        setAddress(next);
        setRequestError(`send.request.errors.${outcome.reason}`);
        return;
      }
      if (outcome.kind !== 'valid') {
        setAddress(next);
        return;
      }
      if (!outcome.request) {
        setAddress(outcome.address);
        return;
      }
      startRequest(outcome.request, outcome.address);
    },
    [blockchain, startRequest]
  );

  const handleContinue = useCallback(() => {
    if (!isAddressValid || isValidating) return;
    setRecipient(recipientFor(address, resolvedAddress));
    router.push('/send/amount');
  }, [isAddressValid, isValidating, address, resolvedAddress, recipientFor, setRecipient, router]);

  const renderGroup = (labelKey: string, rows: RecipientOption[], groupTestID: string) => {
    if (rows.length === 0) return null;
    return (
      <View style={styles.group} testID={groupTestID}>
        <SectionLabel variant="title">{t(labelKey)}</SectionLabel>
        {rows.map((option) => (
          <ListRow
            key={option.key}
            testID={`send-recipient-${option.address}`}
            onPress={() => setAddress(option.address)}
            leading={
              <IconBubble size={38} tone="accent-tint">
                {initialOf(option)}
              </IconBubble>
            }
            title={option.name}
            subtitle={getShortAddress(option.address) ?? option.address}
            trailing={<CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />}
          />
        ))}
      </View>
    );
  };

  // The shell's KeyboardAvoidingView lifts the footer by the keyboard; the
  // inset under it is what is left of the old padding — the floating chrome
  // when there is no keyboard, a step when there is.
  const footerBottomInset = keyboardHeight > 0 ? vs(spacing.sm) : floatingBottomOffset;

  return (
    <>
      <SettingsScreenLayout
        testID="send-recipient-screen"
        title={t('token.action.send')}
        subtitle={t('send.screens.recipientSubtitle')}
        onBack={() => router.back()}
        footerBottomInset={footerBottomInset}
        footer={
          <PrimaryButton
            testID="send-continue-button"
            onPress={handleContinue}
            disabled={!isAddressValid || isValidating}
          >
            {t('actions.continue')}
          </PrimaryButton>
        }
      >
        {/* The token is chosen here, first — amount's row becomes read-only
            once this screen has already asked (owner ruling 2026-09-01). */}
        <ListRow
          testID="send-selected-token"
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('wallet.select_token', 'Select Token')}
          leading={<TokenLogo uri={token?.logo || undefined} symbol={token?.symbol} size={s(38)} />}
          title={token?.name ?? ''}
          subtitle={`${formatTokenAmount(tokenBalance)} ${token?.symbol ?? ''}`}
          trailing={<CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />}
        />

        <RecipientInput
          value={address}
          onChangeText={handleChangeText}
          onScanPress={() => setShowScanner(true)}
          scanLabel={t('qrScanner.scanButton', 'Scan QR code')}
          placeholder={t('send.enter_address_or_domain')}
          validationState={validationState}
          isValidating={isValidating}
        />

        {/* 04A and 04B are one block: the validator names the state, the tone
            says how much it matters, and the copy is the validator's own. */}
        {addressMessage && (
          <WarningNotice
            tone={addressMessageType === 'warning' ? 'warning' : 'error'}
            title={t(addressMessage)}
            style={styles.notice}
          />
        )}

        {requestError && (
          <WarningNotice
            tone="error"
            title={t(requestError)}
            style={styles.notice}
            testID="send-request-refused"
          />
        )}

        {address.length === 0 && (
          <>
            {renderGroup('send.screens.recent', recents, 'send-recents')}
            {renderGroup('token.send.myWallets', walletRows, 'send-my-wallets')}
            {renderGroup('token.send.addressBook', contactRows, 'send-address-book')}
          </>
        )}
      </SettingsScreenLayout>

      <QRScanner
        visible={showScanner}
        blockchain={blockchain}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />

      <TokenPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tokens={tokens}
        loading={tokensLoading}
        onSelectToken={(next) => {
          setToken(next);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // A group is one composed block: its own heading and rows sit at the tighter
  // in-component step, and the 20 belongs to the seam above it.
  group: {
    gap: vs(spacing.sm),
  },
  notice: {
    marginTop: 0,
  },
});
