/**
 * PhraseBackupSheet — confirms the active wallet's recovery phrase (DEV-208).
 *
 * Mounted once in the app shell; it opens when a send waits on the check or
 * the owner starts it from Home or Settings. The steps live in shared
 * (`usePhraseBackupSheet`); this renders them. The phrase and the questions
 * paint on bedrock, as every screen that shows the phrase does.
 *
 * The DOM twin is `packages/ui/src/components/PhraseBackupSheet`.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  usePhraseBackupSheet,
  vs,
  type PhraseBackupSheetPropsBase,
  type Semantic,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { PasswordInput } from '../PasswordInput';
import { SeedWordGrid } from '../SeedPhrase';
import { WarningNotice } from '../WarningNotice';
import { useThemedStyles } from '../../theme/useThemedStyles';

type PhraseBackupSheetProps = PhraseBackupSheetPropsBase;

export function PhraseBackupSheet(props: PhraseBackupSheetProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { compactContentBottomPadding } = useBottomSheetChrome();
  const sheet = usePhraseBackupSheet(props);
  const { step, password, question } = sheet;
  const gate = step === 'intro' || step === 'password';

  return (
    <BottomSheetContainer
      visible={sheet.visible}
      onClose={sheet.close}
      dismissible={!password.loading}
      testID="phrase-check-sheet"
      title={<SheetTitle>{sheet.title}</SheetTitle>}
      forTyping={step === 'password'}
      background={gate ? undefined : <View style={styles.bedrock} />}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: compactContentBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sheet.missed && step === 'phrase' ? (
          <WarningNotice tone="error" title={sheet.message} />
        ) : gate ? (
          <Card padding="lg">
            <Text style={styles.message}>{sheet.message}</Text>
          </Card>
        ) : (
          <Text style={step === 'quiz' ? styles.question : styles.message}>{sheet.message}</Text>
        )}

        {step === 'password' && (
          <PasswordInput
            value={password.password}
            onChangeText={password.setPassword}
            placeholder={t('general.password')}
            error={password.passwordError}
            editable={!password.loading}
            autoFocus
            onSubmitEditing={() => void password.confirm()}
            testID="phrase-check-password"
          />
        )}

        {step === 'phrase' && <SeedWordGrid words={sheet.words} columns={3} />}

        <View style={styles.actions}>
          {gate && (
            <SecondaryButton
              onPress={sheet.close}
              disabled={password.loading}
              testID="phrase-check-cancel"
            >
              {t('actions.cancel')}
            </SecondaryButton>
          )}
          {step === 'intro' && (
            <PrimaryButton onPress={() => void sheet.start()} testID="phrase-check-start">
              {t('phrase_check.start')}
            </PrimaryButton>
          )}
          {step === 'password' && (
            <PrimaryButton
              onPress={() => void password.confirm()}
              disabled={!password.canConfirm}
              loading={password.loading}
              testID="phrase-check-password-confirm"
            >
              {t('actions.continue')}
            </PrimaryButton>
          )}
          {step === 'phrase' && (
            <PrimaryButton onPress={sheet.phraseSeen} testID="phrase-check-phrase-seen">
              {t('phrase_check.phrase_seen')}
            </PrimaryButton>
          )}
          {question?.options.map((word, index) => (
            <SecondaryButton
              key={`${question.position}-${word}`}
              onPress={() => void sheet.choose(word)}
              testID={`phrase-check-option-${index}`}
            >
              {word}
            </SecondaryButton>
          ))}
        </View>
      </ScrollView>
    </BottomSheetContainer>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    bedrock: {
      ...StyleSheet.absoluteFill,
      backgroundColor: t.surface.bedrock,
      borderTopLeftRadius: borderRadius.header,
      borderTopRightRadius: borderRadius.header,
    },
    scroll: {
      flexGrow: 0,
    },
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.xl),
    },
    message: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      textAlign: 'left',
    },
    question: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.bodyLg),
      textAlign: 'center',
    },
    actions: {
      gap: vs(spacing.sm),
    },
  });

export default PhraseBackupSheet;
