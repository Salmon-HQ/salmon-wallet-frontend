import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_ADD_METHODS,
  ACCOUNT_ADD_STEP_TITLE_KEYS,
  ACCOUNT_ADD_STEP_SUBTITLE_KEYS,
} from './accountAddPanelCopy';
import type { AccountAddStep } from '../types/ui/account-add';

const ALL_STEPS: readonly AccountAddStep[] = [
  'select-method',
  'derive-scan',
  'import-seed',
  'import-private-key',
  'import-watch-only',
  'set-name',
  'reauth',
  'complete',
];

describe('ACCOUNT_ADD_METHODS', () => {
  it('lists derive first, then import, private-key, watch-only', () => {
    expect(ACCOUNT_ADD_METHODS.map((method) => method.id)).toEqual([
      'derive',
      'import',
      'private-key',
      'watch-only',
    ]);
  });

  it('gives every method a title and description key', () => {
    for (const method of ACCOUNT_ADD_METHODS) {
      expect(method.titleKey).toMatch(/^settings\.account_add\./);
      expect(method.descriptionKey.length).toBeGreaterThan(0);
    }
  });
});

describe('ACCOUNT_ADD_STEP_TITLE_KEYS / ACCOUNT_ADD_STEP_SUBTITLE_KEYS', () => {
  it('covers every AccountAddStep', () => {
    for (const step of ALL_STEPS) {
      expect(ACCOUNT_ADD_STEP_TITLE_KEYS[step]).toBeTruthy();
      expect(ACCOUNT_ADD_STEP_SUBTITLE_KEYS[step]).toBeTruthy();
    }
  });

  it("'complete' subtitle repeats its own key as fallback", () => {
    const [key, fallback] = ACCOUNT_ADD_STEP_SUBTITLE_KEYS.complete;
    expect(fallback).toBe(key);
  });

  it('reauth title and subtitle use distinct keys', () => {
    expect(ACCOUNT_ADD_STEP_TITLE_KEYS.reauth).toBe('settings.account_add.reauth_title');
    expect(ACCOUNT_ADD_STEP_SUBTITLE_KEYS.reauth[0]).toBe('settings.account_add.reauth_subtitle');
  });
});
