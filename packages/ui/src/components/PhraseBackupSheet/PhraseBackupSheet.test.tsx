/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { UsePhraseBackupSheetResult } from '@salmon/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { PhraseBackupSheet } from './PhraseBackupSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The steps are the shared hook's and tested there; this pins what each step draws.
let mockSheet: UsePhraseBackupSheetResult;
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  usePhraseBackupSheet: () => mockSheet,
}));

const WORDS = ['alpha', 'bravo', 'charlie', 'delta'];

function sheetAt(step: UsePhraseBackupSheetResult['step'], extra = {}): UsePhraseBackupSheetResult {
  return {
    visible: true,
    reason: 'send',
    step,
    title: `title-${step}`,
    message: `message-${step}`,
    words: step === 'phrase' || step === 'quiz' ? WORDS : [],
    missed: false,
    question: undefined,
    questionIndex: 0,
    questionCount: 3,
    password: {
      password: '',
      passwordError: undefined,
      loading: false,
      canConfirm: false,
      setPassword: vi.fn(),
      confirm: vi.fn(),
    },
    start: vi.fn(async () => {}),
    phraseSeen: vi.fn(),
    choose: vi.fn(async () => {}),
    close: vi.fn(),
    ...extra,
  };
}

function render(sheet: UsePhraseBackupSheetResult) {
  mockSheet = sheet;
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  renderInMode('dark', <PhraseBackupSheet />);
}

describe('PhraseBackupSheet (DOM)', () => {
  afterEach(cleanup);

  it('asks before showing anything secret, and starts on Confirm now', () => {
    const sheet = sheetAt('intro');
    render(sheet);

    expect(screen.getByText('title-intro')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
    fireEvent.click(screen.getByTestId('phrase-check-start'));
    expect(sheet.start).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('phrase-check-cancel'));
    expect(sheet.close).toHaveBeenCalled();
  });

  it('takes the password with the phrase still hidden', () => {
    render(sheetAt('password'));
    expect(screen.getByTestId('phrase-check-password')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
  });

  it('shows the phrase, and the miss when the last answer was wrong', () => {
    const sheet = sheetAt('phrase', { missed: true });
    render(sheet);
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('message-phrase')).toBeTruthy();
    fireEvent.click(screen.getByTestId('phrase-check-phrase-seen'));
    expect(sheet.phraseSeen).toHaveBeenCalled();
  });

  it('offers the four words of a question and answers with the one chosen', () => {
    const sheet = sheetAt('quiz', {
      question: { position: 2, answer: 'bravo', options: ['delta', 'bravo', 'echo', 'fox'] },
    });
    render(sheet);
    expect(screen.getByTestId('phrase-check-option-3')).toBeTruthy();
    fireEvent.click(screen.getByTestId('phrase-check-option-1'));
    expect(sheet.choose).toHaveBeenCalledWith('bravo');
    expect(screen.queryByTestId('phrase-check-cancel')).toBeNull();
  });
});
