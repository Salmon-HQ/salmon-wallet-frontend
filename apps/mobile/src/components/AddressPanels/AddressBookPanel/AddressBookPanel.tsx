/**
 * AddressBookPanel - Contact list management component for mobile
 *
 * Displays saved address book contacts and allows the user
 * to add, edit, or remove entries.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  getShortAddress,
  type AddressBookSelectorBaseProps,
  type AddressBookItem,
fontSize, } from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';

// ============================================================================
// Component
// ============================================================================

export function AddressBookPanel({
  contacts,
  onAddContact,
  onEditContact,
  onRemoveContact,
  onBack,
}: AddressBookSelectorBaseProps) {
  const { t } = useTranslation();

  const handleRemove = useCallback(
    (contact: AddressBookItem) => {
      Alert.alert(
        t('actions.remove', 'Remove'),
        t('settings.addressbook.remove_confirmation', {
          name: contact.name,
          defaultValue: `Are you sure you want to remove ${contact.name} from your address book?`,
        }),
        [
          { text: t('actions.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('actions.remove', 'Remove'),
            style: 'destructive',
            onPress: () => onRemoveContact(contact.address),
          },
        ],
      );
    },
    [t, onRemoveContact],
  );

  const renderContactItem = useCallback(
    (contact: AddressBookItem) => (
      <View key={contact.address} style={styles.contactItem} testID={`address-book-contact-${contact.address}`}>
        <View style={styles.contactInfo}>
          <View style={styles.contactIconPlaceholder}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.text.secondary}
            />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contact.name}
            </Text>
            <Text style={styles.contactAddress} numberOfLines={1}>
              {contact.domain || getShortAddress(contact.address, 6)}
            </Text>
            <Text style={styles.contactNetwork} numberOfLines={1}>
              {contact.networkId.split('-')[0].charAt(0).toUpperCase() + contact.networkId.split('-')[0].slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEditContact(contact)}
            activeOpacity={0.7}
            testID={`address-book-edit-${contact.address}`}
            accessibilityRole="button"
            accessibilityLabel={t('actions.edit', 'Edit')}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(contact)}
            activeOpacity={0.7}
            testID={`address-book-remove-${contact.address}`}
            accessibilityRole="button"
            accessibilityLabel={t('actions.remove', 'Remove')}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.status.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [onEditContact, handleRemove, t],
  );

  return (
    <SettingsScreenLayout
      title={t('settings.address_book', 'Address Book')}
      onBack={onBack}
    >
      {contacts.length > 0 ? (
        <>
          {contacts.map(renderContactItem)}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddContact}
            activeOpacity={0.7}
            testID="address-book-add-button"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.addButtonText}>
              {t('settings.addressbook.addnew', 'Add New Address')}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {t('settings.addressbook.empty', 'Looks empty in here.\nAdd your first contact clicking the button.')}
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddContact}
            activeOpacity={0.7}
            testID="address-book-add-button"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.addButtonText}>
              {t('settings.addressbook.addnew', 'Add New Address')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SettingsScreenLayout>
  );
}

export default AddressBookPanel;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  contactIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.iconContainer,
    backgroundColor: colors.card.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing.xxs,
  },
  contactName: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
  },
  contactAddress: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 13,
  },
  contactNetwork: {
    color: colors.text.disabled,
    fontFamily: fontFamilyNative.regular,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  addButtonText: {
    color: colors.accent.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.base,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
