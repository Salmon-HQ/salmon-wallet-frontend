/**
 * MemoPage — the Memo Powerup on the DOM: a note, and the one control that
 * hands core a proposal. Review, signing and the receipt are core's
 * (`ConfirmationHost`). Mobile twin: `apps/mobile/src/components/MemoScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { componentSizes, fontFamily, fontSize, spacing } from '@salmon/shared';
import { MEMO_MAX_BYTES, useMemoScreenLogic } from '@salmon/shared/powerups';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import { SectionLabel } from '../SectionLabel';
import { TextInput } from '../TextInput';
import type { MemoPageProps } from './types';

export function MemoPage({ style, ...logicParams }: MemoPageProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const logic = useMemoScreenLogic(logicParams);
  const error = logic.error;
  const errorText = error
    ? typeof error === 'string'
      ? t(error)
      : t(error.key, error.params)
    : undefined;

  return (
    <div
      data-testid="memo-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: spacing.md,
        padding: `0 ${spacing.headerPadding}px ${spacing.screenGutter}px`,
        ...style,
      }}
    >
      <SectionLabel variant="caps">{t('memo.note_label')}</SectionLabel>
      <TextInput
        testID="memo-note-input"
        value={logic.note}
        onChangeText={logic.setNote}
        placeholder={t('memo.note_placeholder')}
        maxLength={MEMO_MAX_BYTES}
        disabled={logic.isConfirming}
        error={errorText}
      />
      {/* ponytail: the byte count is a hand-drawn supporting line; the kit has
          no field hint yet (docs/POWERUPS-UI.md G1). */}
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
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: spacing.lg }}>
        <PrimaryButton
          testID="memo-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          loading={logic.isConfirming}
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
