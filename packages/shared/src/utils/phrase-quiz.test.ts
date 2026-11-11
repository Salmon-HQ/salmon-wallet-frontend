import { describe, expect, it } from 'vitest';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { buildPhraseQuiz, PHRASE_QUIZ_OPTIONS, PHRASE_QUIZ_QUESTIONS } from './phrase-quiz';

// The first twelve words of the BIP39 list: a test phrase, never a wallet's.
const WORDS = wordlist.slice(0, 12);

/** A deterministic stand-in for Math.random, cycling through `values`. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('buildPhraseQuiz', () => {
  it('asks about three different positions, in phrase order', () => {
    const quiz = buildPhraseQuiz(WORDS);

    expect(quiz).toHaveLength(PHRASE_QUIZ_QUESTIONS);
    const positions = quiz.map((q) => q.position);
    expect(new Set(positions).size).toBe(PHRASE_QUIZ_QUESTIONS);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const p of positions) {
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(12);
    }
  });

  it('offers the right word among four, the others real words not in the phrase', () => {
    for (let run = 0; run < 50; run++) {
      for (const question of buildPhraseQuiz(WORDS)) {
        expect(question.options).toHaveLength(PHRASE_QUIZ_OPTIONS);
        expect(new Set(question.options).size).toBe(PHRASE_QUIZ_OPTIONS);
        expect(question.options).toContain(question.answer);
        expect(question.answer).toBe(WORDS[question.position - 1]);
        for (const option of question.options) {
          expect(wordlist).toContain(option);
          if (option !== question.answer) expect(WORDS).not.toContain(option);
        }
      }
    }
  });

  it('does not always put the answer in the same place', () => {
    const slots = new Set<number>();
    for (let run = 0; run < 50; run++) {
      for (const q of buildPhraseQuiz(WORDS)) slots.add(q.options.indexOf(q.answer));
    }
    expect(slots.size).toBeGreaterThan(1);
  });

  it('is reproducible from its random source', () => {
    const random = () => sequence(0.1, 0.5, 0.9, 0.3, 0.7);
    expect(buildPhraseQuiz(WORDS, random())).toEqual(buildPhraseQuiz(WORDS, random()));
  });

  it('has nothing to ask of a wallet without a phrase', () => {
    expect(buildPhraseQuiz([])).toEqual([]);
  });
});
