import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
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
  fontSize: fontSize.xl,
});

const LoadingContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.xl,
});

const EmptyState = styled(Typography)({
  color: colors.text.secondary,
  fontSize: fontSize.base,
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
  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={24} sx={{ color: colors.accent.primary }} />
      </LoadingContainer>
    );
  }

  if (items.length === 0 && emptyMessage) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <StyledList>
      {items.map((item) => {
        const selected = isSelected(item);

        return (
          <ListItem key={getKey(item)} disablePadding>
            <StyledListItemButton
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
                    fontSize: fontSize.base,
                  },
                }}
                secondaryTypographyProps={
                  getSecondaryText
                    ? {
                        sx: {
                          color: colors.text.secondary,
                          fontSize: fontSize.sm,
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
