/**
 * AddressBookPanel — the contact list, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressPanels/AddressBookPanel`:
 * a `ListRow` per contact (initial bubble, name, domain or short address plus
 * the whole network name), trash + edit trailing, and the outlined "Add"
 * card — the same idiom as Wallets' "Add wallet".
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AddressbookError,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  getNetworkName,
  getShortAddress,
  spacing,
  type AddressBookItem,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretRightIcon, PlusIcon, TrashIcon, iconSize } from '../../icons';
import { SecondaryButton } from '../Button';
import { Card } from '../Card';
import { ConfirmDialog } from '../ConfirmDialog';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WarningNotice } from '../WarningNotice';
import type { AddressBookPanelProps } from './types';

/** The initial the avatar bubble carries, same idiom as the send recipients. */
function initialOf(contact: AddressBookItem): string {
  return (contact.name.trim()[0] ?? contact.address[0] ?? '?').toUpperCase();
}

export function AddressBookPanel({
  contacts,
  onAddContact,
  onEditContact,
  onRemoveContact,
  onBack,
  error = null,
  onRetry,
}: AddressBookPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const [contactToRemove, setContactToRemove] = useState<AddressBookItem | null>(null);
  const [removeErrorKey, setRemoveErrorKey] = useState<string | null>(null);

  const handleRemoveConfirmed = useCallback(async () => {
    if (!contactToRemove) return;
    try {
      await onRemoveContact(contactToRemove.address);
      setRemoveErrorKey(null);
    } catch (err) {
      // 'resolve' means the write persisted but redisplay failed; anything
      // else means the removal was not saved.
      setRemoveErrorKey(
        err instanceof AddressbookError && err.kind === 'resolve'
          ? 'settings.addressbook.resolve_failed'
          : 'settings.addressbook.remove_failed'
      );
    }
  }, [contactToRemove, onRemoveContact]);

  const renderContactItem = useCallback(
    (contact: AddressBookItem) => (
      <ListRow
        key={contact.address}
        testID={`address-book-contact-${contact.address}`}
        leading={
          <IconBubble size={40} tone="accent-tint">
            {initialOf(contact)}
          </IconBubble>
        }
        title={contact.name}
        // The whole network, environment included: this is the list a send
        // destination is picked from, and a devnet contact that reads
        // "Solana" is the confusion DESIGN.md §Chain identity exists to prevent.
        subtitle={`${contact.domain || (getShortAddress(contact.address, 6) ?? contact.address)} · ${getNetworkName(contact.networkId)}`}
        trailing={
          // Two presses, not one row press: the chevron is what opens edit.
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
            <IconBubble
              testID={`address-book-remove-${contact.address}`}
              size={36}
              tone="ghost"
              icon={TrashIcon}
              iconColor={tokens.status.danger}
              onPress={() => setContactToRemove(contact)}
              accessibilityLabel={t('actions.remove', 'Remove')}
            />
            <IconBubble
              testID={`address-book-edit-${contact.address}`}
              size={36}
              tone="ghost"
              icon={CaretRightIcon}
              onPress={() => onEditContact(contact)}
              accessibilityLabel={t('actions.edit', 'Edit')}
            />
          </span>
        }
      />
    ),
    [onEditContact, t, tokens.status.danger]
  );

  // The one action that is not a contact: outlined, so it reads as an empty
  // slot rather than a card with nothing in it.
  const addAction = (
    <Card
      testID="address-book-add-button"
      padding="lg"
      onPress={onAddContact}
      accessibilityLabel={t('settings.addressbook.addnew', 'Add New Address')}
      style={{
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
        borderWidth: borderWidth.thin,
        borderColor: tokens.border.raised,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <PlusIcon size={iconSize.md} color={tokens.accent.ink} />
      <span
        style={{
          color: tokens.accent.ink,
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.bold,
          fontSize: fontSize.body,
        }}
      >
        {t('settings.addressbook.addnew', 'Add New Address')}
      </span>
    </Card>
  );

  return (
    <SettingsPanelContent
      title={t('settings.address_book', 'Address Book')}
      subtitle={t('settings.address_book_subtitle', 'Save addresses you send to often.')}
      onBack={onBack}
    >
      {error ? (
        <div data-testid="address-book-error">
          <WarningNotice
            tone="error"
            title={t('settings.addressbook.load_error', "Couldn't load your contacts")}
            action={
              onRetry ? (
                <SecondaryButton testID="address-book-retry-button" onPress={onRetry}>
                  {t('transactions.tapToRetry')}
                </SecondaryButton>
              ) : undefined
            }
          />
        </div>
      ) : contacts.length > 0 ? (
        <>
          {contacts.map(renderContactItem)}
          {addAction}
        </>
      ) : (
        <>
          <WarningNotice
            tone="warning"
            title={t(
              'settings.addressbook.empty',
              'Looks empty in here.\nAdd your first contact clicking the button.'
            )}
          />
          {addAction}
        </>
      )}

      {removeErrorKey && (
        <div data-testid="address-book-remove-error">
          <WarningNotice tone="error" title={t(removeErrorKey)} />
        </div>
      )}

      <ConfirmDialog
        visible={contactToRemove !== null}
        onClose={() => setContactToRemove(null)}
        title={t('actions.remove', 'Remove')}
        message={t('settings.addressbook.remove_confirmation', {
          name: contactToRemove?.name ?? '',
          defaultValue: `Are you sure you want to remove ${contactToRemove?.name} from your address book?`,
        })}
        confirmText={t('actions.remove', 'Remove')}
        isDanger
        onConfirm={handleRemoveConfirmed}
      />
    </SettingsPanelContent>
  );
}
