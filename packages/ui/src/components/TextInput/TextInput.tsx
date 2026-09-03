/**
 * TextInput — a `Card` holding an `<input>`, on the DOM.
 *
 * Mobile draws its plain fields as `<Card padding="lg"><TextInput /></Card>`
 * with an error line under the card (`AccountNamePanel`, the address book
 * panels, the add-account name and watch-only steps). This is that shell,
 * once, so no DOM panel hand-draws a box around a field.
 */
import React, { useId } from 'react';
import { fontFamily, fontSize, lineHeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, FIELD_SHELL_ERROR_CLASS, focusRingNone } from '../../theme';
import { Card } from '../Card';
import type { TextInputProps } from './types';

export function TextInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  error,
  autoFocus,
  maxLength,
  onSubmitEditing,
  mono = false,
  disabled,
  style,
  className,
  testID,
}: TextInputProps): React.ReactElement {
  const t = useSemantic();
  const errorId = useId();

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, ...style }}
    >
      {/* The card is the field's shape owner, so it wears the shell class:
          focus turns its border accent and keyboard focus rings it, from the
          one rule every field shares. Error is a border here rather than an
          inset shadow — the ring is drawn with the same shadow, and the two
          used to fight over it. */}
      <Card
        padding="lg"
        className={[FIELD_SHELL_CLASS, error ? FIELD_SHELL_ERROR_CLASS : null]
          .filter(Boolean)
          .join(' ')}
        style={error ? { borderColor: t.status.danger } : undefined}
      >
        <input
          data-testid={testID}
          type="text"
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          aria-label={accessibilityLabel ?? placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoFocus={autoFocus}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmitEditing) {
              e.preventDefault();
              onSubmitEditing();
            }
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
            border: 'none',
            ...focusRingNone,
            background: 'transparent',
            color: t.text.primary,
            fontFamily: mono ? fontFamily.mono : fontFamily.sans,
            fontSize: mono ? fontSize.mono : fontSize.bodyLg,
            lineHeight: `${(mono ? fontSize.mono : fontSize.bodyLg) * lineHeight.snug}px`,
          }}
        />
      </Card>
      {error ? (
        <span
          id={errorId}
          role="status"
          data-testid={testID ? `${testID}-error` : undefined}
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.caption,
            color: t.status.danger,
            paddingLeft: spacing.xs,
            paddingRight: spacing.xs,
          }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
