/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePendingAction } from './usePendingAction';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('usePendingAction', () => {
  it('holds the arguments while the action runs and clears them when it settles', async () => {
    const gate = deferred();
    const { result } = renderHook(() => usePendingAction((_domain: string) => gate.promise));
    expect(result.current.pending).toBeNull();

    let running!: Promise<void>;
    act(() => {
      running = result.current.run('example.org');
    });
    expect(result.current.pending).toEqual(['example.org']);

    await act(async () => {
      gate.resolve();
      await running;
    });
    expect(result.current.pending).toBeNull();
  });

  it('clears the flag and still rejects when the action fails', async () => {
    const gate = deferred();
    const { result } = renderHook(() => usePendingAction(() => gate.promise));

    let running!: Promise<void>;
    act(() => {
      running = result.current.run();
    });
    await act(async () => {
      gate.reject(new Error('nope'));
      await expect(running).rejects.toThrow('nope');
    });
    expect(result.current.pending).toBeNull();
  });
});
