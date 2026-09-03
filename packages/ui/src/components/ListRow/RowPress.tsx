/**
 * RowPress / StopPress — a pressable row that holds its own buttons, on the
 * DOM.
 *
 * Mobile nests a pencil and a trash `IconBubble` inside a pressable card
 * (Wallets, Accounts). A `<button>` may not contain a `<button>`, so on the
 * DOM the row's press is a `role="button"` wrapper around a plain `Card`, and
 * the inner controls sit in a `StopPress` so their clicks do not also select
 * the row.
 */
import React from 'react';

interface RowPressProps {
  onPress: () => void;
  /** Spoken name of the row. */
  accessibilityLabel?: string;
  /** `aria-current` — the current item in a set. */
  current?: boolean;
  testID?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function RowPress({
  onPress,
  accessibilityLabel,
  current,
  testID,
  children,
  style,
}: RowPressProps): React.ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={accessibilityLabel}
      aria-current={current || undefined}
      data-testid={testID}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onPress();
      }}
      style={{ cursor: 'pointer', ...style }}
    >
      {children}
    </div>
  );
}

/** Holds the row's own controls; their activation never reaches the row. */
export function StopPress({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}): React.ReactElement {
  return (
    <span
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      {children}
    </span>
  );
}
