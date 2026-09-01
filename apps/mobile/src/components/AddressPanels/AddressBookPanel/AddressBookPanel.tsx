/**
 * AddressBookPanel - Contact list management component for mobile
 *
 * Displays saved address book contacts and allows the user
 * to add, edit, or remove entries.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CaretRightIcon, PlusIcon, TrashIcon, iconSize } from '../../../icons';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  getShortAddress,
  s,
  semantic,
  spacing,
  type AddressBookSelectorBaseProps,
  type AddressBookItem,
} from '@salmon/shared';
import { Card } from '../../Card';
import { IconBubble } from '../../IconBubble';
import { ListRow } from '../../ListRow';
import { SecondaryButton } from '../../Button';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { WarningNotice } from '../../WarningNotice';
import { ConfirmSheet } from '../../ConfirmSheet';

/** The initial the avatar bubble carries, same idiom as the send recipients. */
function initialOf(contact: AddressBookItem): string {
  return (contact.name.trim()[0] ?? contact.address[0] ?? '?').toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export function AddressBookPanel({
  contacts,
  onAddContact,
  onEditContact,
  onRemoveContact,
  onBack,
  error = null,
  onRetry,
}: AddressBookSelectorBaseProps) {
  const { t } = useTranslation();
  const [contactToRemove, setContactToRemove] = useState<AddressBookItem | null>(null);

  const handleRemoveConfirmed = useCallback(async () => {
    if (!contactToRemove) return;
    await onRemoveContact(contactToRemove.address);
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
        subtitle={contact.domain || (getShortAddress(contact.address, 6) ?? contact.address)}
        trailing={
          // Two presses, not one row press: a row that also carried its own
          // `onPress` would wrap the trash button in a nested touchable, and
          // RN's touch responder does not reliably hand the tap to the inner
          // one. The chevron is what opens edit, exactly as the rule says.
          <View style={styles.trailing}>
            <IconBubble
              testID={`address-book-remove-${contact.address}`}
              size={36}
              tone="ghost"
              icon={TrashIcon}
              iconColor={semantic.status.danger}
              onPress={() => setContactToRemove(contact)}
              accessibilityLabel={t('actions.remove', 'Remove')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
            <IconBubble
              testID={`address-book-edit-${contact.address}`}
              size={36}
              tone="ghost"
              icon={CaretRightIcon}
              onPress={() => onEditContact(contact)}
              accessibilityLabel={t('actions.edit', 'Edit')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </View>
        }
      />
    ),
    [onEditContact, t]
  );

  // The one action that is not a contact: outlined, so it reads as an empty
  // slot rather than a card with nothing in it — same idiom as Wallets'
  // "Add wallet" row.
  const addAction = (
    <Card
      testID="address-book-add-button"
      padding="lg"
      onPress={onAddContact}
      accessibilityLabel={t('settings.addressbook.addnew', 'Add New Address')}
      style={styles.addCard}
    >
      <View style={styles.addRow}>
        <PlusIcon size={iconSize.md} color={semantic.accent.ink} />
        <Text style={styles.addLabel}>{t('settings.addressbook.addnew', 'Add New Address')}</Text>
      </View>
    </Card>
  );

  return (
    <SettingsScreenLayout title={t('settings.address_book', 'Address Book')} onBack={onBack}>
      {error ? (
        <View testID="address-book-error">
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
        </View>
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

      <ConfirmSheet
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
    </SettingsScreenLayout>
  );
}

export default AddressBookPanel;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  addCard: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: semantic.border.raised,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
  },
  addLabel: {
    color: semantic.accent.ink,
    fontFamily: fontFamilyNative.bold,
    fontSize: s(fontSize.body),
  },
});
