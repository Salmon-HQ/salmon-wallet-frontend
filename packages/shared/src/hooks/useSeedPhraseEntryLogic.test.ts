/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSeedPhraseEntryLogic, type FocusableRef } from './useSeedPhraseEntryLogic';

function fakeRef() {
  return { focus: vi.fn() } as FocusableRef & { focus: ReturnType<typeof vi.fn> };
}

describe('useSeedPhraseEntryLogic', () => {
  it('is not dense at 12 words, dense at more than 12', () => {
    const twelve = renderHook(() =>
      useSeedPhraseEntryLogic({
        words: Array(12).fill(''),
        onChange: vi.fn(),
        onLengthChange: vi.fn(),
      })
    );
    expect(twelve.result.current.dense).toBe(false);
    expect(twelve.result.current.columns).toBe(3);

    const twentyFour = renderHook(() =>
      useSeedPhraseEntryLogic({
        words: Array(24).fill(''),
        onChange: vi.fn(),
        onLengthChange: vi.fn(),
      })
    );
    expect(twentyFour.result.current.dense).toBe(true);
    expect(twentyFour.result.current.columns).toBe(4);
  });

  it('a trailing space commits the word and moves focus to the next box', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words: Array(12).fill(''), onChange, onLengthChange: vi.fn() })
    );
    const nextRef = fakeRef();
    act(() => result.current.setRef(1)(nextRef));

    act(() => result.current.handleChange(0, 'abandon '));

    expect(onChange).toHaveBeenCalledWith(['abandon', ...Array(11).fill('')]);
    expect(nextRef.focus).toHaveBeenCalledTimes(1);
  });

  it('typing past the twelfth word grows the grid to 24', () => {
    const onChange = vi.fn();
    const onLengthChange = vi.fn();
    const words = [...Array(11).fill('word'), ''];
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words, onChange, onLengthChange })
    );

    act(() => result.current.handleChange(11, 'last '));

    expect(onLengthChange).toHaveBeenCalledWith(24);
    expect(onChange).toHaveBeenCalledWith([
      ...Array(11).fill('word'),
      'last',
      ...Array(12).fill(''),
    ]);
  });

  it('a paste (text containing whitespace) fills the whole grid via distributePhrase', () => {
    const onChange = vi.fn();
    const onLengthChange = vi.fn();
    const onPasteRejected = vi.fn();
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({
        words: Array(12).fill(''),
        onChange,
        onLengthChange,
        onPasteRejected,
      })
    );

    act(() => result.current.handleChange(0, 'one two three'));

    expect(onLengthChange).toHaveBeenCalledWith(12);
    expect(onChange).toHaveBeenCalled();
    // Only 3 of 12 words: the paste does not "fit" a full phrase length.
    expect(onPasteRejected).toHaveBeenCalledWith(3);
  });

  it('a single word with no trailing space just updates that box, no focus move', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words: Array(12).fill(''), onChange, onLengthChange: vi.fn() })
    );
    const nextRef = fakeRef();
    act(() => result.current.setRef(1)(nextRef));

    act(() => result.current.handleChange(0, 'aba'));

    expect(onChange).toHaveBeenCalledWith(['aba', ...Array(11).fill('')]);
    expect(nextRef.focus).not.toHaveBeenCalled();
  });

  it('backspace on an empty box moves focus to the previous one', () => {
    const words = ['abandon', '', ...Array(10).fill('')];
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words, onChange: vi.fn(), onLengthChange: vi.fn() })
    );
    const prevRef = fakeRef();
    act(() => result.current.setRef(0)(prevRef));

    act(() => result.current.handleBackspace(1));

    expect(prevRef.focus).toHaveBeenCalledTimes(1);
  });

  it('backspace on a non-empty box does not move focus', () => {
    const words = ['abandon', 'word', ...Array(10).fill('')];
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words, onChange: vi.fn(), onLengthChange: vi.fn() })
    );
    const prevRef = fakeRef();
    act(() => result.current.setRef(0)(prevRef));

    act(() => result.current.handleBackspace(1));

    expect(prevRef.focus).not.toHaveBeenCalled();
  });

  it('backspace on the first box (index 0) never moves focus', () => {
    const words = ['', ...Array(11).fill('')];
    const { result } = renderHook(() =>
      useSeedPhraseEntryLogic({ words, onChange: vi.fn(), onLengthChange: vi.fn() })
    );

    expect(() => act(() => result.current.handleBackspace(0))).not.toThrow();
  });
});
