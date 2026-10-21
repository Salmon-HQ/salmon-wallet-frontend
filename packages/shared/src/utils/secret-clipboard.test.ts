/**
 * @vitest-environment jsdom
 *
 * A copied recovery phrase or private key must not stay on the clipboard:
 * Salmon clears it 60 s after the copy while the app is open, or when the user
 * comes back to the app after that. It leaves the clipboard alone when it can
 * tell, without a paste prompt, that the user has copied something else since.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalStorageAdapter, initStorage, resetStorage } from '../storage';
import { SECRET_CLIPBOARD_CLEAR_MS, createSecretClipboard } from './secret-clipboard';

const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function platform(holds?: (text: string) => Promise<boolean>) {
  const clipboard = { text: '' };
  const deps = {
    write: vi.fn(async (text: string) => {
      clipboard.text = text;
    }),
    clear: vi.fn(async () => {
      clipboard.text = '';
    }),
    ...(holds ? { holds } : {}),
  };
  return { clipboard, deps };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
});

afterEach(() => {
  vi.useRealTimers();
  resetStorage();
});

describe('createSecretClipboard', () => {
  it('clears the clipboard 60 s after the copy while the app stays open', async () => {
    const { clipboard, deps } = platform();
    const secret = createSecretClipboard(deps);

    await secret.copy(PHRASE);
    expect(clipboard.text).toBe(PHRASE);

    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS - 1);
    expect(deps.clear).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(clipboard.text).toBe('');
    expect(deps.clear).toHaveBeenCalledTimes(1);
  });

  // iOS suspends the app's timers in the background: the return is what runs.
  it('clears on the return to the app once 60 s have passed', async () => {
    const { clipboard, deps } = platform();
    const secret = createSecretClipboard(deps);
    await secret.copy(PHRASE);

    vi.setSystemTime(Date.now() + SECRET_CLIPBOARD_CLEAR_MS + 1);
    await secret.resume();

    expect(clipboard.text).toBe('');
  });

  it('leaves the clipboard alone on a return inside the 60 s, and clears at 60 s', async () => {
    const { clipboard, deps } = platform();
    const secret = createSecretClipboard(deps);
    await secret.copy(PHRASE);

    await vi.advanceTimersByTimeAsync(10_000);
    await secret.resume();
    expect(clipboard.text).toBe(PHRASE);

    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS - 10_000);
    expect(clipboard.text).toBe('');
  });

  it('leaves what the user copied since alone, where the platform can tell', async () => {
    const { clipboard, deps } = platform(async (text) => clipboard.text === text);
    const secret = createSecretClipboard(deps);
    await secret.copy(PHRASE);

    clipboard.text = 'https://example.com';
    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS);
    await secret.resume();

    expect(deps.clear).not.toHaveBeenCalled();
    expect(clipboard.text).toBe('https://example.com');
  });

  it('clears without looking where reading the clipboard would prompt the user', async () => {
    const { clipboard, deps } = platform();
    const secret = createSecretClipboard(deps);
    await secret.copy(PHRASE);

    clipboard.text = 'something else';
    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS);

    expect(clipboard.text).toBe('');
  });

  // A browser refuses a clipboard write while its page is not focused.
  it('tries again on the next return when the clear fails', async () => {
    const { clipboard, deps } = platform();
    deps.clear.mockRejectedValueOnce(new Error('Document is not focused'));
    const secret = createSecretClipboard(deps);
    await secret.copy(PHRASE);

    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS);
    expect(clipboard.text).toBe(PHRASE);

    await secret.resume();
    expect(clipboard.text).toBe('');
  });

  // The extension's panel can close inside the 60 s, and the OS can end the
  // app: the copy's time outlives them, the secret itself is never stored.
  it('clears after a restart when the copy is more than 60 s old, once', async () => {
    const first = platform();
    await createSecretClipboard(first.deps).copy(PHRASE);
    expect(JSON.stringify(localStorage)).not.toContain('abandon');

    vi.setSystemTime(Date.now() + SECRET_CLIPBOARD_CLEAR_MS + 1);
    const after = platform();
    const restarted = createSecretClipboard(after.deps);
    await restarted.resume();
    await restarted.resume();

    expect(after.deps.clear).toHaveBeenCalledTimes(1);
  });

  it('still clears in-session when storage is not available', async () => {
    resetStorage();
    const { clipboard, deps } = platform();
    await createSecretClipboard(deps).copy(PHRASE);

    await vi.advanceTimersByTimeAsync(SECRET_CLIPBOARD_CLEAR_MS);
    expect(clipboard.text).toBe('');
  });

  it('does nothing on a return when nothing secret was copied', async () => {
    const { deps } = platform();
    await createSecretClipboard(deps).resume();
    expect(deps.clear).not.toHaveBeenCalled();
  });
});
