/**
 * AmountEntryCard — the big centred amount card, hoisted out of Send's
 * amount step (`StepAmount.tsx`, CORE 05) so Swap's input form
 * (`SwapPage/SwapInputScreen.tsx`) draws the same card instead of its own.
 * Mobile twin: `apps/mobile/src/components/AmountEntryCard/AmountEntryCard.tsx`.
 */
import React from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  sanitizeDecimalInput,
  spacing,
  tabularNums,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, focusRingNone } from '../../theme';
import { Card } from '../Card';
import { PendingValue } from '../PendingValue';
import type { AmountEntryCardProps } from './types';

/** The amount being typed, at the size the frames draw it (CORE 05, 46/700). */
const AMOUNT_ENTRY_FONT = 46;

export function AmountEntryCard({
  value,
  onChangeValue,
  editable = true,
  placeholder = '0',
  subtext,
  loading = false,
  focused,
  style,
  testID,
}: AmountEntryCardProps) {
  const semantic = useSemantic();

  return (
    <Card
      padding="lg"
      radius="xl"
      className={editable ? FIELD_SHELL_CLASS : undefined}
      style={{
        alignItems: 'center',
        ...(focused ? { borderColor: semantic.accent.ink } : {}),
        ...style,
      }}
      testID={testID}
    >
      <div
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
      >
        {loading ? (
          <PendingValue pending style={{ flex: 1, minWidth: 80, textAlign: 'center' }}>
            {/* The wait stands where the number will: centred, at the number's size. */}
            <span
              style={{
                display: 'block',
                fontFamily: fontFamily.sans,
                fontSize: AMOUNT_ENTRY_FONT,
                lineHeight: `${AMOUNT_ENTRY_FONT * lineHeight.snug}px`,
                fontWeight: fontWeight.bold,
                color: semantic.text.secondary,
              }}
            >
              …
            </span>
          </PendingValue>
        ) : (
          <input
            data-testid={testID ? `${testID}-input` : undefined}
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            readOnly={!editable}
            onChange={(event) => onChangeValue(sanitizeDecimalInput(event.target.value))}
            autoCorrect="off"
            autoComplete="off"
            style={{
              ...tabularNums.css,
              flex: 1,
              minWidth: 80,
              border: 'none',
              ...focusRingNone,
              background: 'transparent',
              padding: 0,
              fontSize: AMOUNT_ENTRY_FONT,
              lineHeight: `${AMOUNT_ENTRY_FONT * lineHeight.snug}px`,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.bold,
              color: semantic.text.primary,
              textAlign: 'center',
            }}
          />
        )}
      </div>
      {subtext !== undefined && (
        <span
          data-testid={testID ? `${testID}-fiat` : undefined}
          style={{
            ...tabularNums.css,
            fontSize: fontSize.mono,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            color: semantic.text.secondary,
          }}
        >
          {subtext}
        </span>
      )}
    </Card>
  );
}
