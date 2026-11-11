/**
 * The recovery-phrase check: for a few positions of the phrase, the right word
 * among other words of the BIP39 list. Choosing cannot be passed by pasting the
 * phrase and deleting words, which typing could.
 *
 * @module utils/phrase-quiz
 */
import { wordlist } from '@scure/bip39/wordlists/english.js';

export const PHRASE_QUIZ_QUESTIONS = 3;
export const PHRASE_QUIZ_OPTIONS = 4;

export interface PhraseQuizQuestion {
  /** 1-based, as the phrase grid numbers its words. */
  position: number;
  answer: string;
  /** The answer and its decoys, shuffled. */
  options: string[];
}

function pickIndexes(count: number, from: number, random: () => number): number[] {
  const picked = new Set<number>();
  while (picked.size < Math.min(count, from)) picked.add(Math.floor(random() * from));
  return [...picked];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Three questions, in phrase order, for `words`; none for an empty phrase. */
export function buildPhraseQuiz(
  words: readonly string[],
  random: () => number = Math.random
): PhraseQuizQuestion[] {
  if (words.length === 0) return [];
  const inPhrase = new Set(words);
  return pickIndexes(PHRASE_QUIZ_QUESTIONS, words.length, random)
    .sort((a, b) => a - b)
    .map((index) => {
      const answer = words[index];
      const decoys = new Set<string>();
      while (decoys.size < PHRASE_QUIZ_OPTIONS - 1) {
        const word = wordlist[Math.floor(random() * wordlist.length)];
        if (!inPhrase.has(word)) decoys.add(word);
      }
      return { position: index + 1, answer, options: shuffle([answer, ...decoys], random) };
    });
}
