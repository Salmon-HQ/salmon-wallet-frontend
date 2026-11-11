/**
 * usePhraseBackupSheet — the steps of the recovery-phrase check, shared by the
 * mobile and DOM `PhraseBackupSheet` twins (DEV-208).
 *
 * intro → identity (biometrics, else the password) → the phrase → three
 * questions. A wrong answer shows the phrase again and starts a new set of
 * questions; three right answers confirm the wallet. The phrase is only on
 * screen after the identity check, as in Settings → Backup, because an
 * unlocked session only proves the device was left open.
 *
 * @module hooks/usePhraseBackupSheet
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccountsContext } from '../contexts/AccountsContext';
import { usePhraseBackup, type PhraseBackupSheetReason } from '../contexts/PhraseBackupContext';
import type { PhraseBackupSheetPropsBase } from '../types/ui/phrase-backup-sheet';
import { getAccountMnemonic } from '../utils/account-secret';
import { buildPhraseQuiz, type PhraseQuizQuestion } from '../utils/phrase-quiz';
import { usePasswordConfirm, type PasswordConfirmState } from './usePasswordConfirm';

export type PhraseBackupStep = 'intro' | 'password' | 'phrase' | 'quiz';

export interface UsePhraseBackupSheetResult {
  visible: boolean;
  reason: PhraseBackupSheetReason;
  step: PhraseBackupStep;
  /** The sheet's title for the current step, translated. */
  title: string;
  /** The line under the title, translated; the phrase step's says if the last answer missed. */
  message: string;
  /** Empty until the identity check has passed. */
  words: string[];
  /** The last answer was wrong: the phrase is back on screen to look again. */
  missed: boolean;
  question: PhraseQuizQuestion | undefined;
  /** 0-based, of `questionCount`. */
  questionIndex: number;
  questionCount: number;
  password: PasswordConfirmState;
  /** Intro's continue: biometrics when the device has them, else the password. */
  start: () => Promise<void>;
  /** "I wrote it down": on to the questions. */
  phraseSeen: () => void;
  choose: (word: string) => Promise<void>;
  close: () => void;
}

export function usePhraseBackupSheet({
  biometricAvailable,
  verifyBiometric,
}: PhraseBackupSheetPropsBase): UsePhraseBackupSheetResult {
  const { t } = useTranslation();
  const { sheet, confirmBackup, cancelBackup } = usePhraseBackup();
  const [{ activeAccount }, accountActions] = useAccountsContext();
  const [step, setStep] = useState<PhraseBackupStep>('intro');
  const [missed, setMissed] = useState(false);
  const [quiz, setQuiz] = useState<PhraseQuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const visible = sheet !== null;

  useEffect(() => {
    if (visible) {
      setStep('intro');
      setMissed(false);
      setQuiz([]);
      setQuestionIndex(0);
    }
  }, [visible]);

  const revealed = step === 'phrase' || step === 'quiz';
  const words = useMemo(
    () => (revealed ? (getAccountMnemonic(activeAccount) ?? '').split(' ').filter(Boolean) : []),
    [revealed, activeAccount]
  );

  const password = usePasswordConfirm({
    visible: step === 'password',
    requirePassword: true,
    validatePassword: accountActions.checkPassword,
    onConfirm: () => setStep('phrase'),
    onClose: () => {},
    t,
  });

  const start = useCallback(async () => {
    if (biometricAvailable && verifyBiometric && (await verifyBiometric())) {
      setStep('phrase');
      return;
    }
    setStep('password');
  }, [biometricAvailable, verifyBiometric]);

  const phraseSeen = useCallback(() => {
    setQuiz(buildPhraseQuiz(words));
    setQuestionIndex(0);
    setMissed(false);
    setStep('quiz');
  }, [words]);

  const choose = useCallback(
    async (word: string) => {
      const question = quiz[questionIndex];
      if (!question) return;
      if (word !== question.answer) {
        setMissed(true);
        setStep('phrase');
        return;
      }
      if (questionIndex + 1 < quiz.length) {
        setQuestionIndex(questionIndex + 1);
        return;
      }
      await confirmBackup();
    },
    [quiz, questionIndex, confirmBackup]
  );

  const reason = sheet?.reason ?? 'manual';
  const copy: Record<PhraseBackupStep, [string, string]> = {
    intro:
      reason === 'send'
        ? ['phrase_check.send_title', 'phrase_check.send_body']
        : ['phrase_check.manual_title', 'phrase_check.manual_body'],
    password: ['phrase_check.password_title', 'phrase_check.password_body'],
    phrase: [
      'phrase_check.phrase_title',
      missed ? 'phrase_check.missed' : 'phrase_check.phrase_body',
    ],
    quiz: ['phrase_check.question_title', 'phrase_check.question'],
  };
  const [titleKey, messageKey] = copy[step];
  const quizQuestion = step === 'quiz' ? quiz[questionIndex] : undefined;

  return {
    visible,
    reason,
    step,
    title: t(titleKey, { current: questionIndex + 1, total: quiz.length }),
    message: t(messageKey, { position: quizQuestion?.position }),
    words,
    missed,
    question: quizQuestion,
    questionIndex,
    questionCount: quiz.length,
    password,
    start,
    phraseSeen,
    choose,
    close: cancelBackup,
  };
}
