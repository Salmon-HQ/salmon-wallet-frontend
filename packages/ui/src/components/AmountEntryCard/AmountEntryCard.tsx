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
        ...(focused ? { borderColor: semantic.accent.ink } : {}),
        ...style,
      }}
      testID={testID}
    >
      {/* The field spans the card and centres its text, so the number, the
          placeholder and the wait all sit on one centre line and the card
          never changes shape between them. The input stays mounted while a
          quote loads; the wait floats over it. */}
      <div style={{ position: 'relative', display: 'flex', alignSelf: 'stretch' }}>
        <input
          data-testid={testID ? `${testID}-input` : undefined}
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          readOnly={!editable || loading}
          onChange={(event) => onChangeValue(sanitizeDecimalInput(event.target.value))}
          autoCorrect="off"
          autoComplete="off"
          style={{
            ...tabularNums.css,
            flex: 1,
            minWidth: 0,
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
            opacity: loading ? 0 : 1,
          }}
        />
        {loading && (
          <PendingValue
            pending
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              data-testid={testID ? `${testID}-loading` : undefined}
              style={{
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
        )}
      </div>
      {subtext !== undefined && (
        <span
          data-testid={testID ? `${testID}-fiat` : undefined}
          style={{
            ...tabularNums.css,
            alignSelf: 'center',
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
