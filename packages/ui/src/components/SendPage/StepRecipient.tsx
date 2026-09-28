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
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  readSettledPaymentLink,
  formatTokenAmount,
  getShortAddress,
  isSignableAccount,
  spacing,
  useAddressValidation,
  useValidationDirty,
  useSettledPaymentLink,
  useRecipientOptions,
  useSendContacts,
  useTransactions,
  type BlockchainAccount,
  type NetworkId,
  type NftData,
  type SendRecipient,
  type SendToken,
  type StartFromRequestResult,
  type TransferRequest,
  type RecipientOption,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretRightIcon, iconSize } from '../../icons';
import { PrimaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { RecipientInput } from '../InputAddress';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { SkeletonRow } from '../SkeletonRow';
import { TokenLogo } from '../TokenLogo';
import { WarningNotice } from '../WarningNotice';
import { SendScreen } from './SendScreen';
import { TokenPickerSheet } from '../TokenPickerSheet';

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
  liveBalance: number | undefined;
  onSelectToken: (token: SendToken) => void;
  /** The collectible half. */
  nft?: NftData | null;
  /**
   * A pasted Solana Pay transfer request starts the flow from what it fixed
   * (spec 033 FR-026). The side panel has no camera, so paste is its scan.
   */
  onRequest?: (request: TransferRequest) => StartFromRequestResult;
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
  liveBalance,
  onSelectToken,
  nft,
  onRequest,
}: StepRecipientProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [address, setAddress] = useState(recipient?.address ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  // A translation key when a pasted payment request could not start the flow.
  const [requestError, setRequestError] = useState<string | null>(null);

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

  // Continue waits for a verdict on the CURRENT text, not the previous one.
  const { dirty, markDirty } = useValidationDirty(isValidating);

  // The same field takes a pasted request: a `solana:` URI is classified
  // like a scan would be, so a request that arrives as text pays like one
  // that arrived as a code (spec 033 FR-026; the side panel has no camera).
  // A request that cannot be read says which part (FR-020). Anything else
  // is an address the validator judges.
  //
  // The field always shows exactly what was entered, and a link is read only
  // once it stops changing. Text can arrive a character at a time; reading
  // each prefix acted on a half-typed link.
  const handleChangeText = useCallback(
    (value: string) => {
      markDirty();
      setRequestError(null);
      setAddress(value);
    },
    [markDirty]
  );

  const handleSettledLink = useCallback(
    (link: string) => {
      const outcome = readSettledPaymentLink(link, 'solana');
      if (outcome.kind === 'error') {
        setRequestError(outcome.key);
        return;
      }
      if (outcome.kind === 'address') {
        setAddress(outcome.address);
        return;
      }
      // A flow that takes no requests (an NFT send) says so rather than
      // quietly dropping the amount and memo the link asked for.
      if (!onRequest) {
        setRequestError('send.request.errors.transactionRequest');
        return;
      }
      const started = onRequest(outcome.request);
      if (!started.ok) {
        setAddress(outcome.address);
        // An amount the token cannot hold is an unreadable amount, which is
        // the string the parser's own `amount` refusal already says.
        setRequestError(
          started.reason === 'amountDecimals'
            ? 'send.request.errors.amount'
            : 'send.request.tokenNotHeld'
        );
      }
    },
    [onRequest]
  );
  useSettledPaymentLink(address, handleSettledLink);

  // `liveBalance` already falls back to the token's own amount.
  const tokenBalance = liveBalance ?? 0;

  // The people this wallet has actually paid — the same field the activity
  // row reads, so the two surfaces agree on who a transfer went to.
  const { transactions, loading: recentsLoading } = useTransactions({
    address: senderAddress,
    networkId: (networkId ?? 'solana-mainnet') as NetworkId,
    skip: !senderAddress || !!nft,
    account,
  });

  const { recents, contactRows, walletRows, recipientFor } = useRecipientOptions({
    transactions,
    senderAddress,
    contacts,
    ownWallets,
  });

  // Ordinals have no transfer path yet, and a watch-only account no key.
  const isOrdinal = nft?.blockchain === 'bitcoin';
  const canSign = !nft || isSignableAccount(account);
  const canContinue = isAddressValid && !isValidating && !dirty && !isOrdinal && canSign;

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    onContinue(recipientFor(address, resolvedAddress));
  }, [canContinue, address, resolvedAddress, recipientFor, onContinue]);

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
        <div
          data-testid="send-token-group"
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
        >
          <SectionLabel variant="caps">{t('send.screens.youWillSend')}</SectionLabel>
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
        </div>
      )}

      {isOrdinal ? (
        <WarningNotice tone="warning" title={t('nft.send.ordinalsNotSupported')} />
      ) : (
        <RecipientInput
          value={address}
          onChangeText={handleChangeText}
          placeholder={
            nft ? t('nft.send.enterRecipientAddress') : t('send.enter_address_or_request')
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

      {requestError && (
        <WarningNotice tone="error" title={t(requestError)} testID="send-request-refused" />
      )}

      {!nft && address.length === 0 && (
        <>
          {/* The recents arrive from the network: rows stand in for them
              until they do, so the list does not appear from nowhere. */}
          {recentsLoading && recents.length === 0 ? (
            <div
              data-testid="send-recents-loading"
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <SectionLabel variant="title">{t('send.screens.recent')}</SectionLabel>
              <SkeletonRow
                leadingSize={38}
                count={3}
                accessibilityLabel={t('accessibility.loading_recents')}
              />
            </div>
          ) : (
            renderGroup('send.screens.recent', recents, 'send-recents')
          )}
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
          onSelectToken={(next) => {
            onSelectToken(next);
            setPickerOpen(false);
          }}
        />
      )}
    </SendScreen>
  );
}
