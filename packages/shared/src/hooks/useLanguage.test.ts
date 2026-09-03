/**
 * @vitest-environment jsdom
 *
 * useLanguage — i18next is the source of truth, storage keeps the choice.
 * i18next is stubbed as the smallest thing that has a language and emits
 * `languageChanged`, which is all the hook subscribes to.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const i18nStub = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    language: 'en',
    on: (_event: string, cb: () => void) => listeners.add(cb),
    off: (_event: string, cb: () => void) => listeners.delete(cb),
    changeLanguage: vi.fn(async (lang: string) => {
      i18nStub.language = lang;
      listeners.forEach((cb) => cb());
    }),
  };
});

vi.mock('i18next', () => ({ default: i18nStub }));

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
  STORAGE_KEYS: { LANGUAGE: 'salmon_language' },
}));

vi.mock('../locales', () => ({
  AVAILABLE_LANGUAGES: ['en', 'es'],
  DEFAULT_LANGUAGE: 'en',
  LANGUAGE_NAMES: { en: 'English', es: 'Español' },
  isLanguageSupported: (lang: string) => lang === 'en' || lang === 'es',
}));

import { useLanguage } from './useLanguage';
import * as storage from '../storage';

const mockStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };

describe('useLanguage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nStub.language = 'en';
    (storage.getStorage as ReturnType<typeof vi.fn>).mockReturnValue(mockStorage);
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  it('reads what i18next is showing, base code only', () => {
    i18nStub.language = 'es-AR';
    const { result } = renderHook(() => useLanguage());
    expect(result.current.currentLanguage).toBe('es');
    expect(result.current.availableLanguages).toEqual(['en', 'es']);
    expect(result.current.languageNames.es).toBe('Español');
  });

  it('restores the persisted choice once on mount', async () => {
    mockStorage.getItem.mockResolvedValue('es');
    const { result } = renderHook(() => useLanguage());
    await waitFor(() => expect(result.current.currentLanguage).toBe('es'));
    expect(i18nStub.changeLanguage).toHaveBeenCalledTimes(1);
  });

  it('ignores a persisted value it does not ship, and a storage failure', async () => {
    mockStorage.getItem.mockResolvedValue('xx');
    const { result, unmount } = renderHook(() => useLanguage());
    await act(async () => {});
    expect(result.current.currentLanguage).toBe('en');
    expect(i18nStub.changeLanguage).not.toHaveBeenCalled();
    unmount();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const second = renderHook(() => useLanguage());
    await act(async () => {});
    expect(second.result.current.currentLanguage).toBe('en');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('changes the language and persists it', async () => {
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await result.current.changeLanguage('es');
    });
    expect(result.current.currentLanguage).toBe('es');
    expect(mockStorage.setItem).toHaveBeenCalledWith('salmon_language', 'es');
  });

  it('follows a change made elsewhere', async () => {
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await i18nStub.changeLanguage('es');
    });
    expect(result.current.currentLanguage).toBe('es');
  });

  it('refuses a code it does not ship, and survives a persist failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await result.current.changeLanguage('invalid' as never);
    });
    expect(result.current.currentLanguage).toBe('en');
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
    await act(async () => {
      await result.current.changeLanguage('es');
    });
    expect(result.current.currentLanguage).toBe('es');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
