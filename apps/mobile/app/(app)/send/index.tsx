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
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatTokenAmount,
  getShortAddress,
  s,
  spacing,
  useAddressValidation,
  useSendContacts,
  useTransactions,
  vs,
  type NetworkId,
  type Transaction,
} from '@salmon/shared';

import {
  DepthBackground,
  IconBubble,
  ListRow,
  PrimaryButton,
  QRScanner,
  RecipientInput,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
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
const MAX_RECENTS = 3;

/** A row the user can tap to fill the field. */
interface RecipientOption {
  key: string;
  name: string;
  address: string;
}

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
    showUnverifiedTokens,
    liveBalance,
  } = useSendFlow();

  const [address, setAddress] = useState(recipient?.address ?? '');
  const [showScanner, setShowScanner] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) return liveBalance;
    const fallback = token?.uiAmount;
    return typeof fallback === 'string' ? parseFloat(fallback) : (fallback ?? 0);
  }, [liveBalance, token?.uiAmount]);

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

  const contactsByAddress = useMemo(
    () => Object.fromEntries(contacts.map((contact) => [contact.address, contact.name])),
    [contacts]
  );

  const recents = useMemo<RecipientOption[]>(() => {
    const seen = new Set<string>();
    const rows: RecipientOption[] = [];
    for (const tx of transactions as Transaction[]) {
      if (tx.type !== 'send') continue;
      const destination = tx.outputs[0]?.destination;
      if (!destination || destination === senderAddress || seen.has(destination)) continue;
      seen.add(destination);
      rows.push({
        key: `recent-${destination}`,
        name: contactsByAddress[destination] ?? getShortAddress(destination) ?? destination,
        address: destination,
      });
      if (rows.length === MAX_RECENTS) break;
    }
    return rows;
  }, [transactions, senderAddress, contactsByAddress]);

  const contactRows = useMemo<RecipientOption[]>(
    () =>
      contacts.map((contact) => ({
        key: `contact-${contact.address}`,
        name: contact.name,
        address: contact.address,
      })),
    [contacts]
  );

  const walletRows = useMemo<RecipientOption[]>(
    () =>
      ownWallets.map((wallet) => ({
        key: `wallet-${wallet.address}`,
        name: wallet.accountName,
        address: wallet.address,
      })),
    [ownWallets]
  );

  const handleScan = useCallback((result: QRScanResult) => {
    setAddress(result.address);
    setShowScanner(false);
  }, []);

  const handleContinue = useCallback(() => {
    if (!isAddressValid || isValidating) return;
    const trimmed = address.trim();
    setRecipient({
      address: trimmed,
      resolvedAddress: resolvedAddress || undefined,
      name: contactsByAddress[resolvedAddress || trimmed] ?? contactsByAddress[trimmed],
    });
    router.push('/send/amount');
  }, [
    isAddressValid,
    isValidating,
    address,
    resolvedAddress,
    contactsByAddress,
    setRecipient,
    router,
  ]);

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

  // The action row clears the keyboard by the keyboard's own measured height —
  // one number for both platforms, the idiom every keyboarded surface here
  // uses.
  const actionBottomPadding =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Pushed over the tab shell, so it mounts its own water. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        title={t('token.action.send')}
        subtitle={t('send.screens.recipientSubtitle')}
      />

      <ScrollView
        testID="send-recipient-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          onChangeText={setAddress}
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

        {address.length === 0 && (
          <>
            {renderGroup('send.screens.recent', recents, 'send-recents')}
            {renderGroup('token.send.myWallets', walletRows, 'send-my-wallets')}
            {renderGroup('token.send.addressBook', contactRows, 'send-address-book')}
          </>
        )}
      </ScrollView>

      <View style={[styles.action, { paddingBottom: actionBottomPadding }]}>
        <PrimaryButton
          testID="send-continue-button"
          onPress={handleContinue}
          disabled={!isAddressValid || isValidating}
        >
          {t('actions.continue')}
        </PrimaryButton>
      </View>

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
        showUnverifiedTokens={showUnverifiedTokens}
        onSelectToken={(next) => {
          setToken(next);
          setPickerOpen(false);
        }}
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
  // The component gap: every top-level child of a screen is 20 from the next
  // (DESIGN.md §Layout — "The component gap").
  content: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.screenGutter),
    gap: vs(spacing.screenGutter),
  },
  // A group is one composed block: its own heading and rows sit at the tighter
  // in-component step, and the 20 belongs to the seam above it.
  group: {
    gap: vs(spacing.sm),
  },
  notice: {
    marginTop: 0,
  },
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
  },
});
