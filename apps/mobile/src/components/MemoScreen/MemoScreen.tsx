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
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';
import { MEMO_MAX_BYTES, useMemoScreenLogic } from '@salmon/shared/powerups';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { PrimaryButton } from '../Button';
import { SectionLabel } from '../SectionLabel';
import { TextField } from '../TextInput';
import type { MemoScreenProps } from './types';

export const MemoScreen: React.FC<MemoScreenProps> = ({ style, ...logicParams }) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const logic = useMemoScreenLogic(logicParams);
  const error = logic.error;
  const errorText = error
    ? typeof error === 'string'
      ? t(error)
      : t(error.key, error.params)
    : undefined;

  return (
    <View style={[styles.container, style]} testID="memo-screen">
      <SectionLabel variant="caps">{t('memo.note_label')}</SectionLabel>
      <TextField
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
      <Text style={styles.hint} testID="memo-note-bytes">
        {t('memo.review.bytes', { count: logic.noteBytes })}
      </Text>
      <View style={styles.action}>
        <PrimaryButton
          testID="memo-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          loading={logic.isConfirming}
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
      gap: vs(spacing.md),
    },
    hint: {
      fontSize: fontSize.sm,
      fontFamily: fontFamilyNative.regular,
      color: t.text.secondary,
      textAlign: 'right',
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
