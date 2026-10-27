/**
 * @vitest-environment jsdom
 *
 * On the extension a copied recovery phrase or private key leaves the
 * clipboard 60 s after the copy while the panel is open, or when the user
 * comes back to it after that. The extension holds `clipboardRead`, so it
 * checks first and leaves what the user copied since alone.
 */
import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { secretClipboard, useSecretClipboardResume } from './useSecretClipboard';

const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const clipboard = { text: '' };
const writeText = vi.fn(async (text: string) => {
  clipboard.text = text;
});
const readText = vi.fn(async () => clipboard.text);

function Root() {
  useSecretClipboardResume();
  return null;
}

const comeBack = () =>
  act(async () => {
    window.dispatchEvent(new Event('focus'));
  });

beforeEach(() => {
  vi.useFakeTimers();
  clipboard.text = '';
  writeText.mockClear();
  readText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText, readText },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('secretClipboard on the extension', () => {
  it('clears the phrase 60 s after the copy while the panel is open', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));
    expect(clipboard.text).toBe(PHRASE);

    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(clipboard.text).toBe('');
  });

  it('clears on the return to the panel once 60 s have passed', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));
    // Out of focus, the browser refuses the clipboard: the timer's clear fails.
    writeText.mockRejectedValueOnce(new Error('Document is not focused'));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(clipboard.text).toBe(PHRASE);

    await comeBack();

    expect(clipboard.text).toBe('');
  });

  it('leaves what the user copied since alone', async () => {
    render(<Root />);
    await act(() => secretClipboard.copy(PHRASE));
    clipboard.text = 'https://example.com';

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    await comeBack();

    expect(clipboard.text).toBe('https://example.com');
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
