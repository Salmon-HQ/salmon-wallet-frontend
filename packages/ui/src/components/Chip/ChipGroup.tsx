/**
 * ChipGroup — a horizontally scrollable row of single-select chips, on the
 * DOM. Mirrors `apps/mobile/src/components/Chip/ChipGroup.tsx`: `fill`
 * shares the row equally instead of scrolling, otherwise it is a native
 * horizontal scroller with no visible scrollbar.
 */
import React, { useCallback } from 'react';
import { spacing } from '@salmon/shared';

import { Chip } from './Chip';
import type { ChipGroupProps } from './types';

export function ChipGroup({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'filter',
  fill = false,
  style,
  className,
  testID,
}: ChipGroupProps) {
  const handlePress = useCallback((key: string) => () => onChange(key), [onChange]);

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...(fill
      ? {}
      : {
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }),
    ...style,
  };

  const chips = options.map((option) => (
    <Chip
      key={option.key}
      testID={`${testID ?? 'chip-group'}-${option.key}`}
      label={option.label}
      selected={option.key === value}
      onPress={handlePress(option.key)}
      size={size}
      variant={variant}
      style={fill ? { flex: 1 } : undefined}
    />
  ));

  return (
    <div data-testid={testID} className={className} style={rowStyle}>
      {chips}
    </div>
  );
}
