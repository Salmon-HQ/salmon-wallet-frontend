import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionId } from './install-id';

describe('createSessionId', () => {
  afterEach(() => {
    // Drops the own property the first test adds, so the prototype's randomUUID shows again.
    delete (crypto as { randomUUID?: unknown }).randomUUID;
    vi.restoreAllMocks();
  });

  it('draws from the CSPRNG when randomUUID is missing, and never from Math.random', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    const getRandomValues = vi.spyOn(crypto, 'getRandomValues');
    const mathRandom = vi.spyOn(Math, 'random');

    const id = createSessionId();

    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(mathRandom).not.toHaveBeenCalled();
  });

  it('uses randomUUID where the platform has it', () => {
    expect(createSessionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
