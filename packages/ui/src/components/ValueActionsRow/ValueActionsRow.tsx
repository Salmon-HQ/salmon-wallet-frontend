import React from 'react';
import { spacing } from '@salmon/shared';
import type { ValueActionsRowProps } from './types';

export function ValueActionsRow({
  leading,
  actions,
  style,
  className,
  testID,
}: ValueActionsRowProps) {
  return (
    <div
      data-testid={testID}
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: spacing.md, ...style }}
    >
      {leading}
      {actions != null && (
        <div
          data-testid={testID ? `${testID}-actions` : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
