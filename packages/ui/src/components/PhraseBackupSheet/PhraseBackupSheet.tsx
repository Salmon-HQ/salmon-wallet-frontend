/**
 * PhraseBackupSheet — confirms the active wallet's recovery phrase (DEV-208),
 * on the DOM.
 *
 * Mounted once per surface; it opens when a send waits on the check or the
 * owner starts it from Home or Settings. The steps live in shared
 * (`usePhraseBackupSheet`); this renders them. The phrase and the questions
 * paint on bedrock, as every screen that shows the phrase does.
 *
 * The mobile twin is `apps/mobile/src/components/PhraseBackupSheet`.
 */
import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, lineHeight, spacing, usePhraseBackupSheet } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { secretClipboard } from '../../hooks/useSecretClipboard';
import { PrimaryButton, SecondaryButton } from '../Button';
import { HoldToApproveButton } from '../HoldToApproveButton';
import { Card } from '../Card';
import { PasswordInput } from '../PasswordInput';
import { SeedWordGrid } from '../SeedPhrase';
import { WarningNotice } from '../WarningNotice';
import type { PhraseBackupSheetProps } from './types';

export function PhraseBackupSheet(props: PhraseBackupSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const { text, surface } = useSemantic();
  const sheet = usePhraseBackupSheet(props);
  const { step, password, question } = sheet;
  const gate = step === 'intro' || step === 'password';

  const message: CSSProperties = {
    margin: 0,
    color: step === 'quiz' ? text.primary : text.secondary,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyLg,
    fontWeight: step === 'quiz' ? 600 : undefined,
    lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
    textAlign: step === 'quiz' ? 'center' : 'left',
  };

  return (
    <BottomSheetContainer
      visible={sheet.visible}
      onClose={sheet.close}
      dismissible={!password.loading}
      testID="phrase-check-sheet"
      title={<SheetTitle>{sheet.title}</SheetTitle>}
      background={
        gate ? undefined : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              backgroundColor: surface.bedrock,
            }}
          />
        )
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        }}
      >
        {sheet.missed && step === 'phrase' ? (
          <WarningNotice tone="error" title={sheet.message} />
        ) : gate ? (
          <Card padding="lg">
            <p style={message}>{sheet.message}</p>
          </Card>
        ) : (
          <p style={message}>{sheet.message}</p>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
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
            <HoldToApproveButton
              onApprove={() => sheet.copyPhrase((phrase) => secretClipboard.copy(phrase))}
              disabled={sheet.copyLocked}
              variant="secondary"
              testID="phrase-check-copy"
            >
              {sheet.copyLabel}
            </HoldToApproveButton>
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
        </div>
      </div>
    </BottomSheetContainer>
  );
}
