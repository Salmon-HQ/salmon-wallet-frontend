/**
 * Tests for the in-memory session stash and session-timeout helpers (spec 009, US4)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMemoryStash,
  createStashHandler,
  initStash,
  initStashWithCustom,
  getStash,
  isStashInitialized,
  resetStash,
  getStashItem,
  setStashItem,
  removeStashItem,
  clearStash,
  updateLastActivity,
  getLastActivity,
  isSessionTimedOut,
  StashNotInitializedError,
} from './stash';
import { STASH_KEYS, type Platform } from './types';

const TIMEOUT_MS = 5 * 60 * 1000;

describe('stash', () => {
  afterEach(() => {
    resetStash();
    vi.useRealTimers();
  });

  // ==========================================================================
  // createMemoryStash
  // ==========================================================================

  describe('createMemoryStash', () => {
    it('round-trips values and returns undefined for missing keys', async () => {
      const stash = createMemoryStash();

      expect(await stash.getItem('missing')).toBeUndefined();

      await stash.setItem('a', { nested: [1, 2, 3] });
      expect(await stash.getItem<{ nested: number[] }>('a')).toEqual({ nested: [1, 2, 3] });

      await stash.removeItem('a');
      expect(await stash.getItem('a')).toBeUndefined();
    });

    it('clear removes every stored value', async () => {
      const stash = createMemoryStash();
      await stash.setItem('a', 1);
      await stash.setItem('b', 2);

      await stash.clear();

      expect(await stash.getItem('a')).toBeUndefined();
      expect(await stash.getItem('b')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Global instance lifecycle
  // ==========================================================================

  describe('init / get lifecycle', () => {
    it('getStash throws StashNotInitializedError before initStash', () => {
      expect(isStashInitialized()).toBe(false);
      expect(() => getStash()).toThrow(StashNotInitializedError);
    });

    it('initStash("mobile") and initStash("web") install a memory stash', () => {
      for (const platform of ['mobile', 'web'] as const) {
        resetStash();
        initStash(platform);
        expect(isStashInitialized()).toBe(true);
        expect(getStash()).toBeDefined();
      }
    });

    it('initStash throws for an unsupported platform', () => {
      expect(() => initStash('vr-headset' as Platform)).toThrow('Unsupported platform');
    });

    it('initStashWithCustom installs the provided implementation', async () => {
      const custom = createMemoryStash();
      await custom.setItem('marker', 'custom');

      initStashWithCustom(custom);

      expect(await getStashItem('marker')).toBe('custom');
    });

    it('resetStash de-initializes the stash', () => {
      initStash('web');
      resetStash();
      expect(isStashInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Convenience functions
  // ==========================================================================

  describe('convenience functions', () => {
    beforeEach(() => {
      initStash('web');
    });

    it('setStashItem / getStashItem / removeStashItem round-trip', async () => {
      await setStashItem('key', 42);
      expect(await getStashItem<number>('key')).toBe(42);

      await removeStashItem('key');
      expect(await getStashItem('key')).toBeUndefined();
    });

    it('clearStash wipes all session data', async () => {
      await setStashItem('a', 1);
      await setStashItem('b', 2);

      await clearStash();

      expect(await getStashItem('a')).toBeUndefined();
      expect(await getStashItem('b')).toBeUndefined();
    });

    it('convenience functions throw when the stash is not initialized', async () => {
      resetStash();
      await expect(getStashItem('a')).rejects.toThrow(StashNotInitializedError);
      await expect(setStashItem('a', 1)).rejects.toThrow(StashNotInitializedError);
    });
  });

  // ==========================================================================
  // Session timeout — exact boundary, fake timers (spec 009 FR-003)
  // ==========================================================================

  describe('session timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-12T12:00:00Z'));
      initStash('web');
    });

    it('reports timed out when no activity was ever recorded', async () => {
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(true);
    });

    it('updateLastActivity stores the current timestamp', async () => {
      await updateLastActivity();
      expect(await getLastActivity()).toBe(Date.now());
      expect(await getStashItem<number>(STASH_KEYS.LAST_ACTIVITY)).toBe(Date.now());
    });

    it('is NOT timed out exactly at the timeout boundary (strict >)', async () => {
      await updateLastActivity();
      vi.advanceTimersByTime(TIMEOUT_MS);
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(false);
    });

    it('is NOT timed out just under the boundary', async () => {
      await updateLastActivity();
      vi.advanceTimersByTime(TIMEOUT_MS - 1);
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(false);
    });

    it('IS timed out one millisecond past the boundary', async () => {
      await updateLastActivity();
      vi.advanceTimersByTime(TIMEOUT_MS + 1);
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(true);
    });

    it('updateLastActivity refreshes the timeout window', async () => {
      await updateLastActivity();
      vi.advanceTimersByTime(TIMEOUT_MS + 1);
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(true);

      await updateLastActivity();
      expect(await isSessionTimedOut(TIMEOUT_MS)).toBe(false);
    });
  });

  // ==========================================================================
  // Extension background handler (pure logic, no chrome API needed)
  // ==========================================================================

  describe('createStashHandler', () => {
    const CHANNEL = 'salmon_extension_stash_channel';

    function call(
      handler: ReturnType<typeof createStashHandler>['handler'],
      data: { method: 'get' | 'set' | 'delete' | 'clear'; key?: string; value?: unknown }
    ): { handled: boolean; response: unknown } {
      let response: unknown;
      const handled = handler({ channel: CHANNEL, data }, (r) => {
        response = r;
      });
      return { handled, response };
    }

    it('ignores messages on other channels', () => {
      const { handler } = createStashHandler();
      const handled = handler(
        { channel: 'other_channel', data: { method: 'get', key: 'a' } },
        () => {}
      );
      expect(handled).toBe(false);
    });

    it('handles set / get / delete / clear round-trips', () => {
      const { handler, stashMap } = createStashHandler();

      expect(call(handler, { method: 'set', key: 'a', value: 'secret' }).handled).toBe(true);
      expect(stashMap.get('a')).toBe('secret');
      expect(call(handler, { method: 'get', key: 'a' }).response).toBe('secret');

      call(handler, { method: 'delete', key: 'a' });
      expect(call(handler, { method: 'get', key: 'a' }).response).toBeUndefined();

      call(handler, { method: 'set', key: 'b', value: 1 });
      call(handler, { method: 'clear' });
      expect(stashMap.size).toBe(0);
    });
  });
});
