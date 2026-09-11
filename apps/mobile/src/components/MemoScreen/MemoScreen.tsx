/**
 * MemoScreen — the Memo Powerup on React Native: a note, and the one control
 * that hands core a proposal. Review, signing and the receipt are core's
 * (`ConfirmationHost`). DOM twin: `packages/ui/src/components/MemoPage`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';
import { MEMO_MAX_BYTES, useMemoScreenLogic } from '@salmon/shared/powerups';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { PrimaryButton } from '../Button';
import { TextField } from '../TextInput';
import type { MemoScreenProps } from './types';

export const MemoScreen: React.FC<MemoScreenProps> = ({ style, ...logicParams }) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const logic = useMemoScreenLogic(logicParams);
  const error = logic.error;

  return (
    <View style={[styles.container, style]} testID="memo-screen">
      <Text style={styles.label}>{t('memo.note_label')}</Text>
      <TextField
        testID="memo-note-input"
        value={logic.note}
        onChangeText={logic.setNote}
        placeholder={t('memo.note_placeholder')}
        maxLength={MEMO_MAX_BYTES}
        disabled={logic.isConfirming}
      />
      <Text style={styles.hint} testID="memo-note-bytes">
        {t('memo.review.bytes', { count: logic.noteBytes })}
      </Text>
      {/* One line of the notice type, reserved: nothing moves when it fills. */}
      <View style={styles.noticeSlot}>
        {error ? (
          <Text style={styles.errorText} testID="memo-error-text">
            {typeof error === 'string' ? t(error) : t(error.key, error.params)}
          </Text>
        ) : null}
      </View>
      <View style={styles.action}>
        <PrimaryButton
          testID="memo-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          style={styles.button}
        >
          {t('memo.sign')}
        </PrimaryButton>
      </View>
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: s(spacing.headerPadding),
      paddingTop: vs(spacing['2xl']),
      gap: vs(spacing.md),
    },
    label: {
      fontSize: fontSize.base,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      lineHeight: fontSize.base * lineHeight.condensed,
    },
    hint: {
      fontSize: fontSize.sm,
      fontFamily: fontFamilyNative.regular,
      color: t.text.secondary,
      textAlign: 'right',
    },
    noticeSlot: {
      minHeight: vs(fontSize.sm * lineHeight.normal),
      justifyContent: 'center',
    },
    errorText: {
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * lineHeight.normal,
      fontFamily: fontFamilyNative.medium,
      color: t.status.danger,
      textAlign: 'center',
    },
    action: {
      alignItems: 'center',
      paddingTop: vs(spacing.lg),
    },
    button: {
      width: s(componentSizes.copyButtonWidth),
      height: vs(componentSizes.buttonHeightCompact),
    },
  });

export default MemoScreen;
