/**
 * AddressBookPanel - Contact list management page
 */

import React, { useCallback, useState } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon, UserIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';
import {
  colors,
  semantic,
  spacing,
  getShortAddress,
  getNetworkName,
  AddressbookError,
  type AddressBookItem,
  fontSize,
  fontWeight,
  componentSizes,
} from '@salmon/shared';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { ConfirmDialog } from '../ConfirmDialog';
import type { AddressBookPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledList = styled(List)({
  padding: `${spacing.sm}px 0`,
});

// The row itself does nothing — edit and remove beside it are the only
// controls. It used to be a `ListItemButton` with no `onClick`, which is a
// focusable `role="button"` that a keyboard user lands on and cannot act on,
// so it is inert markup now (DESIGN.md §"The settings surface joined the
// system"). The hover tint went with it: a highlight on a row that cannot be
// pressed promises an action that is not there.
const ContactRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: `${spacing.sm}px ${spacing.lg}px`,
  minWidth: 0,
});

const ContactAvatar = styled(Avatar)({
  width: componentSizes.iconSizeXL,
  height: componentSizes.iconSizeXL,
  backgroundColor: colors.card.border,
});

const EmptyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['3xl']}px ${spacing.lg}px`,
  gap: spacing.md,
});

const EmptyText = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.body,
  textAlign: 'center',
  whiteSpace: 'pre-line',
});

const AddButton = styled(Button)({
  color: colors.accent.primary,
  textTransform: 'none',
  fontWeight: fontWeight.medium,
  fontSize: fontSize.body,
  marginTop: spacing.sm,
});

const WriteErrorText = styled(Typography)({
  color: semantic.status.danger,
  fontSize: fontSize.caption,
  fontWeight: fontWeight.medium,
  textAlign: 'center',
  padding: `${spacing.sm}px ${spacing.lg}px`,
});

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
}: AddressBookPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<AddressBookItem | null>(null);
  const [removeErrorKey, setRemoveErrorKey] = useState<string | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await onRemoveContact(deleteTarget.address);
      setRemoveErrorKey(null);
    } catch (err) {
      // 'resolve' means the write persisted but redisplay failed; anything
      // else means the removal was not saved.
      setRemoveErrorKey(
        err instanceof AddressbookError && err.kind === 'resolve'
          ? 'settings.addressbook.resolve_failed'
          : 'settings.addressbook.remove_failed'
      );
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, onRemoveContact]);

  return (
    <SettingsPanelContent title={t('settings.address_book', 'Address Book')} onBack={onBack}>
      {error ? (
        <EmptyContainer data-testid="address-book-error">
          <EmptyText>
            {t('settings.addressbook.load_error', "Couldn't load your contacts")}
          </EmptyText>
          {onRetry && (
            <AddButton onClick={onRetry} data-testid="address-book-retry-button">
              {t('transactions.tapToRetry', 'Tap to retry')}
            </AddButton>
          )}
        </EmptyContainer>
      ) : contacts.length > 0 ? (
        <>
          <StyledList>
            {contacts.map((contact: AddressBookItem) => (
              <ListItem
                key={contact.address}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: `${spacing.xs}px` }}>
                    <IconButton
                      edge="end"
                      onClick={() => onEditContact(contact)}
                      size="small"
                      aria-label={t('actions.edit', 'Edit')}
                      data-testid={`address-book-edit-${contact.address}`}
                      sx={{
                        color: colors.text.secondary,
                        '&:hover': { backgroundColor: colors.background.card },
                      }}
                    >
                      <PencilSimpleIcon size={iconSize.md} />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => setDeleteTarget(contact)}
                      size="small"
                      aria-label={t('actions.remove', 'Remove')}
                      data-testid={`address-book-remove-${contact.address}`}
                      sx={{
                        color: semantic.status.danger,
                        '&:hover': { backgroundColor: semantic.status.dangerTint },
                      }}
                    >
                      <TrashIcon size={iconSize.md} />
                    </IconButton>
                  </Box>
                }
              >
                <ContactRow data-testid={`address-book-contact-${contact.address}`}>
                  <ListItemAvatar>
                    <ContactAvatar>
                      <UserIcon size={iconSize.md} color={colors.text.secondary} />
                    </ContactAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={
                      <>
                        {contact.domain || getShortAddress(contact.address, 6)}
                        {' \u00B7 '}
                        {/* The whole network, environment included: this is the list a
                            send destination is picked from, and a devnet contact that
                            reads "Solana" is the confusion DESIGN.md §Chain identity
                            exists to prevent. */}
                        {getNetworkName(contact.networkId)}
                      </>
                    }
                    primaryTypographyProps={{
                      sx: {
                        color: colors.text.primary,
                        fontWeight: fontWeight.medium,
                        fontSize: fontSize.body,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        color: colors.text.secondary,
                        fontSize: fontSize.caption,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                </ContactRow>
              </ListItem>
            ))}
          </StyledList>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <AddButton
              startIcon={<PlusCircleIcon />}
              onClick={onAddContact}
              data-testid="address-book-add-button"
            >
              {t('settings.addressbook.addnew', 'Add New Address')}
            </AddButton>
          </Box>
        </>
      ) : (
        <EmptyContainer>
          <EmptyText>
            {t(
              'settings.addressbook.empty',
              'Looks empty in here.\nAdd your first contact clicking the button.'
            )}
          </EmptyText>
          <AddButton
            startIcon={<PlusCircleIcon />}
            onClick={onAddContact}
            data-testid="address-book-add-button"
          >
            {t('settings.addressbook.addnew', 'Add New Address')}
          </AddButton>
        </EmptyContainer>
      )}

      {removeErrorKey && (
        <WriteErrorText data-testid="address-book-remove-error">{t(removeErrorKey)}</WriteErrorText>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('actions.remove', 'Remove')}
        message={
          deleteTarget
            ? t('settings.addressbook.remove_confirmation', {
                name: deleteTarget.name,
                defaultValue: `Are you sure you want to remove ${deleteTarget.name} from your address book?`,
              })
            : ''
        }
        confirmText={t('actions.remove', 'Remove')}
        isDanger
        onConfirm={handleConfirmDelete}
      />
    </SettingsPanelContent>
  );
}
