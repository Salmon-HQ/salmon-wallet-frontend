/**
 * RecipientInput — the address field of CORE 04, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Send/RecipientInput.tsx`: a
 * `Card` at `md`, a mono input (an address is a position-critical string),
 * the verdict's mark, and one affordance beside the field. Mobile's is the QR
 * scanner; the side panel has no camera, so the same bubble pastes from the
 * clipboard instead — the DOM alternative spec 028 lists for the scan.
 *
 * It renders state, it does not compute it: `useAddressValidation` stays in
 * the screen, which is also what decides whether Continue is live.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  type Semantic,
  type ValidationState,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ClipboardIcon, iconSize } from '../../icons';
import { ButtonSpinner } from '../Button/ButtonSpinner';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import type { RecipientInputProps } from './types';

/** The edge each validation state paints. `idle`/`loading` keep the hairline. */
const edgeFor = (t: Semantic): Partial<Record<ValidationState, string>> => ({
  valid: t.status.success,
  invalid: t.status.danger,
  warning: t.status.warning,
});

/** The glyph the field shows once an address has been judged. */
const markFor = (
  t: Semantic
): Partial<Record<ValidationState, { glyph: string; color: string }>> => ({
  valid: { glyph: '✓', color: t.status.success },
  invalid: { glyph: '✕', color: t.status.danger },
  warning: { glyph: '⚠', color: t.status.warning },
});

export function RecipientInput({
  value,
  onChangeText,
  placeholder,
  validationState,
  isValidating,
  testID = 'send-recipient-field',
  testIDPrefix = 'send',
  style,
  className,
}: RecipientInputProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const edge = edgeFor(semantic)[validationState];
  const mark = value.length > 0 && !isValidating ? markFor(semantic)[validationState] : undefined;

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChangeText(text.trim());
    } catch {
      // Clipboard access refused: the field is still there to type into.
    }
  }, [onChangeText]);

  return (
    <Card
      testID={testID}
      padding="md"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        ...(edge ? { borderColor: edge, borderWidth: borderWidth.thin } : {}),
        ...style,
      }}
    >
      <input
        data-testid={`${testIDPrefix}-recipient-input`}
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          padding: 0,
          fontFamily: fontFamily.mono,
          fontSize: fontSize.mono,
          color: semantic.text.primary,
        }}
      />
      {value.length > 0 && isValidating && (
        <ButtonSpinner color={semantic.text.secondary} size={iconSize.md} />
      )}
      {mark && (
        <span
          data-testid="send-recipient-mark"
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.bodyLg,
            color: mark.color,
          }}
        >
          {mark.glyph}
        </span>
      )}
      <IconBubble
        testID={`${testIDPrefix}-paste-button`}
        size={36}
        tone="ghost"
        icon={ClipboardIcon}
        iconSize={iconSize.md}
        onPress={() => void handlePaste()}
        accessibilityLabel={t('actions.paste', 'Paste')}
      />
    </Card>
  );
}
