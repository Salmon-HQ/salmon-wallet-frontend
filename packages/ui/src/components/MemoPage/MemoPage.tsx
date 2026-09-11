/**
 * MemoPage — the Memo Powerup on the DOM: a note, and the one control that
 * hands core a proposal. Review, signing and the receipt are core's
 * (`ConfirmationHost`). Mobile twin: `apps/mobile/src/components/MemoScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
} from '@salmon/shared';
import { MEMO_MAX_BYTES, useMemoScreenLogic } from '@salmon/shared/powerups';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { TextInput } from '../TextInput';
import type { MemoPageProps } from './types';

export function MemoPage({ style, ...logicParams }: MemoPageProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const logic = useMemoScreenLogic(logicParams);
  const error = logic.error;

  return (
    <div
      data-testid="memo-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: spacing.md,
        padding: `${spacing['2xl']}px ${spacing.headerPadding}px ${spacing.screenGutter}px`,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.base,
          fontWeight: fontWeight.bold,
          color: semantic.text.primary,
          lineHeight: `${fontSize.base * lineHeight.condensed}px`,
        }}
      >
        {t('memo.note_label')}
      </span>
      <TextInput
        testID="memo-note-input"
        value={logic.note}
        onChangeText={logic.setNote}
        placeholder={t('memo.note_placeholder')}
        maxLength={MEMO_MAX_BYTES}
        disabled={logic.isConfirming}
      />
      <span
        data-testid="memo-note-bytes"
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.sm,
          color: semantic.text.secondary,
          textAlign: 'right',
        }}
      >
        {t('memo.review.bytes', { count: logic.noteBytes })}
      </span>
      {/* One line of the notice type, reserved: nothing moves when it fills. */}
      <div
        style={{
          minHeight: fontSize.sm * lineHeight.normal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {error ? (
          <span
            data-testid="memo-error-text"
            style={{
              fontFamily: fontFamily.sans,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: semantic.status.danger,
              textAlign: 'center',
            }}
          >
            {typeof error === 'string' ? t(error) : t(error.key, error.params)}
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: spacing.lg }}>
        <PrimaryButton
          testID="memo-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          style={{
            width: componentSizes.copyButtonWidth,
            height: componentSizes.buttonHeightCompact,
          }}
        >
          {t('memo.sign')}
        </PrimaryButton>
      </div>
    </div>
  );
}
