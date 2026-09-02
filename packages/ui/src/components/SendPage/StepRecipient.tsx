/**
 * Send · who — CORE 04 (+04A, +04B), on the DOM.
 *
 * The mobile twin is `apps/mobile/app/(app)/send/index.tsx` — and, with a
 * collectible, `app/(app)/nft/[id]/send.tsx`: one question, who receives
 * this. The validation is the wallet's own: `useAddressValidation` on the
 * account, the same 500ms debounce, the same result codes; this screen only
 * draws the verdict. With a token it also chooses the token up front and
 * offers the wallet's recents, own wallets and address book.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatTokenAmount,
  getShortAddress,
  isSignableAccount,
  useAddressValidation,
  useSendContacts,
  useTransactions,
  type BlockchainAccount,
  type NetworkId,
  type NftData,
  type SendRecipient,
  type SendToken,
  recipientOptions,
  type RecipientOption,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretRightIcon, iconSize } from '../../icons';
import { PrimaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { RecipientInput } from '../InputAddress';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { TokenLogo } from '../TokenList';
import { WarningNotice } from '../WarningNotice';
import { SendScreen } from './SendScreen';
import { TokenPickerSheet } from './TokenPickerSheet';

/** How many past counterparties the "Recent" section offers. */
/** The validator's debounce, mobile's number. */
const VALIDATION_DEBOUNCE_MS = 500;

/** A row the user can tap to fill the field. */

/** The initial the avatar bubble carries — a name's, or the address's. */
function initialOf(option: RecipientOption): string {
  return (option.name.trim()[0] ?? option.address[0] ?? '?').toUpperCase();
}

export interface StepRecipientProps {
  account: BlockchainAccount;
  networkId: NetworkId | null;
  recipient: SendRecipient | null;
  onContinue: (recipient: SendRecipient) => void;
  onBack: () => void;
  /** The token half. Absent when a collectible is being sent. */
  token: SendToken | null;
  tokens: SendToken[];
  tokensLoading: boolean;
  showUnverifiedTokens: boolean;
  liveBalance: number | undefined;
  onSelectToken: (token: SendToken) => void;
  /** The collectible half. */
  nft?: NftData | null;
}

export function StepRecipient({
  account,
  networkId,
  recipient,
  onContinue,
  onBack,
  token,
  tokens,
  tokensLoading,
  showUnverifiedTokens,
  liveBalance,
  onSelectToken,
  nft,
}: StepRecipientProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [address, setAddress] = useState(recipient?.address ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);

  const senderAddress = account.getReceiveAddress();
  const { contacts, ownWallets } = useSendContacts(senderAddress);

  const {
    validationState,
    isValidating,
    isValid: isAddressValid,
    resolvedAddress,
    message: addressMessage,
    messageType: addressMessageType,
  } = useAddressValidation(address, account, { debounceMs: VALIDATION_DEBOUNCE_MS });

  // The hook holds its verdict across an edit: for the debounce window it
  // still reports the PREVIOUS string's `isValid`, so a freshly typed address
  // reads as approved. `dirty` is the "judged for the current text" bit.
  const [dirty, setDirty] = useState(false);
  const wasValidating = useRef(false);
  useEffect(() => {
    if (wasValidating.current && !isValidating) setDirty(false);
    wasValidating.current = isValidating;
  }, [isValidating]);

  const handleChangeText = useCallback((value: string) => {
    setDirty(true);
    setAddress(value);
  }, []);

  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) return liveBalance;
    const fallback = token?.uiAmount;
    return typeof fallback === 'string' ? parseFloat(fallback) : (fallback ?? 0);
  }, [liveBalance, token?.uiAmount]);

  // The people this wallet has actually paid — the same field the activity
  // row reads, so the two surfaces agree on who a transfer went to.
  const { transactions } = useTransactions({
    address: senderAddress,
    networkId: (networkId ?? 'solana-mainnet') as NetworkId,
    skip: !senderAddress || !!nft,
    account,
  });

  const contactsByAddress = useMemo(
    () => Object.fromEntries(contacts.map((contact) => [contact.address, contact.name])),
    [contacts]
  );

  const { recents, contactRows, walletRows } = useMemo(
    () => recipientOptions({ transactions, senderAddress, contacts, ownWallets }),
    [transactions, senderAddress, contacts, ownWallets]
  );

  // Ordinals have no transfer path yet, and a watch-only account no key.
  const isOrdinal = nft?.blockchain === 'bitcoin';
  const canSign = !nft || isSignableAccount(account);
  const canContinue = isAddressValid && !isValidating && !dirty && !isOrdinal && canSign;

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    const trimmed = address.trim();
    onContinue({
      address: trimmed,
      resolvedAddress: resolvedAddress || undefined,
      name: contactsByAddress[resolvedAddress || trimmed] ?? contactsByAddress[trimmed],
    });
  }, [canContinue, address, resolvedAddress, contactsByAddress, onContinue]);

  const renderGroup = (labelKey: string, rows: RecipientOption[], groupTestID: string) => {
    if (rows.length === 0) return null;
    return (
      <div data-testid={groupTestID} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel variant="title">{t(labelKey)}</SectionLabel>
        {rows.map((option) => (
          <ListRow
            key={option.key}
            testID={`send-recipient-${option.address}`}
            onPress={() => handleChangeText(option.address)}
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
      </div>
    );
  };

  return (
    <SendScreen
      testID={nft ? 'nft-send-screen' : 'send-recipient-screen'}
      onBack={onBack}
      title={nft ? t('nft.send.title') : t('token.action.send')}
      subtitle={nft ? nft.name : t('send.screens.recipientSubtitle')}
      action={
        isOrdinal ? undefined : (
          <PrimaryButton
            testID={nft ? 'nft-send-continue-button' : 'send-continue-button'}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            {t('actions.continue')}
          </PrimaryButton>
        )
      }
    >
      {/* The token is chosen here, first — the amount screen's row becomes
          read-only once this screen has already asked. */}
      {!nft && (
        <ListRow
          testID="send-selected-token"
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('wallet.select_token', 'Select Token')}
          leading={
            <TokenLogo
              uri={token?.logo || undefined}
              symbol={token?.symbol}
              size={38}
              borderRadius={19}
            />
          }
          title={token?.name ?? ''}
          subtitle={`${formatTokenAmount(tokenBalance)} ${token?.symbol ?? ''}`}
          trailing={<CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />}
        />
      )}

      {isOrdinal ? (
        <WarningNotice tone="warning" title={t('nft.send.ordinalsNotSupported')} />
      ) : (
        <RecipientInput
          value={address}
          onChangeText={handleChangeText}
          placeholder={
            nft ? t('nft.send.enterRecipientAddress') : t('send.enter_address_or_domain')
          }
          validationState={validationState}
          isValidating={isValidating}
        />
      )}

      {/* 04A and 04B are one block: the validator names the state, the tone
          says how much it matters, and the copy is the validator's own. */}
      {!isOrdinal && addressMessage && (
        <WarningNotice
          tone={addressMessageType === 'warning' ? 'warning' : 'error'}
          title={t(addressMessage)}
        />
      )}

      {!nft && address.length === 0 && (
        <>
          {renderGroup('send.screens.recent', recents, 'send-recents')}
          {renderGroup('token.send.myWallets', walletRows, 'send-my-wallets')}
          {renderGroup('token.send.addressBook', contactRows, 'send-address-book')}
        </>
      )}

      {!nft && (
        <TokenPickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          tokens={tokens}
          loading={tokensLoading}
          showUnverifiedTokens={showUnverifiedTokens}
          onSelectToken={(next) => {
            onSelectToken(next);
            setPickerOpen(false);
          }}
        />
      )}
    </SendScreen>
  );
}
