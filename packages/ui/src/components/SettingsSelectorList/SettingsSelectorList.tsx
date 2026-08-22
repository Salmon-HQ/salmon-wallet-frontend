import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import { CheckIcon, iconSize } from '../../icons';
import { colors, spacing, fontSize, fontWeight } from '@salmon/shared';
import type { SettingsSelectorListProps } from './types';

// ============================================================================
// Styled Components (shared across all settings selectors)
// ============================================================================

const StyledList = styled(List)({
  padding: `${spacing.sm}px 0`,
});

const StyledListItemButton = styled(ListItemButton)<{ $selected?: boolean }>(({ $selected }) => ({
  padding: `${spacing.md}px ${spacing.lg}px`,
  backgroundColor: $selected ? colors.accent.tint : 'transparent',
  '&:hover': {
    backgroundColor: $selected ? colors.accent.tintHover : colors.background.card,
  },
}));

const CheckIconStyled = styled(CheckIcon)({
  color: colors.accent.primary,
  width: iconSize.md,
  height: iconSize.md,
});

const LoadingContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.xl,
});

const EmptyState = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.body,
  textAlign: 'center',
  padding: spacing.xl,
});

export function SettingsSelectorList<T>({
  items,
  getKey,
  isSelected,
  onSelect,
  getPrimaryText,
  getSecondaryText,
  secondaryTypographyProps,
  renderLeadingElement,
  loading,
  emptyMessage,
  testIdPrefix,
}: SettingsSelectorListProps<T>): React.ReactElement {
  const { t } = useTranslation();

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress
          size={iconSize.lg}
          aria-label={t('general.loading')}
          sx={{ color: colors.accent.primary }}
        />
      </LoadingContainer>
    );
  }

  if (items.length === 0 && emptyMessage) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    // Listbox semantics, not a list of buttons: MUI's `selected` prop is a CSS
    // class and emits neither a role nor `aria-selected`, so without this a
    // screen reader cannot tell which language, currency or network is active.
    // The `li` takes `role="none"` so each option is owned directly by the
    // listbox, as the pattern requires.
    <StyledList role="listbox">
      {items.map((item) => {
        const selected = isSelected(item);

        return (
          <ListItem key={getKey(item)} disablePadding role="none">
            <StyledListItemButton
              role="option"
              aria-selected={selected}
              selected={selected}
              $selected={selected}
              onClick={() => onSelect(item)}
              data-testid={testIdPrefix ? `${testIdPrefix}-${getKey(item)}` : undefined}
            >
              {renderLeadingElement?.(item)}
              <ListItemText
                primary={getPrimaryText(item)}
                secondary={getSecondaryText?.(item)}
                primaryTypographyProps={{
                  sx: {
                    color: colors.text.primary,
                    fontWeight: selected ? fontWeight.semibold : fontWeight.medium,
                    fontSize: fontSize.body,
                  },
                }}
                secondaryTypographyProps={
                  getSecondaryText
                    ? {
                        sx: {
                          color: colors.text.secondary,
                          fontSize: fontSize.caption,
                          ...(secondaryTypographyProps || {}),
                        },
                      }
                    : undefined
                }
              />
              {selected && <CheckIconStyled />}
            </StyledListItemButton>
          </ListItem>
        );
      })}
    </StyledList>
  );
}
