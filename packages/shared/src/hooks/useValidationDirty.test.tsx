/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useValidationDirty } from './useValidationDirty';

describe('useValidationDirty', () => {
  it('is dirty from a keystroke until a validation cycle completes', () => {
    const { result, rerender } = renderHook(({ v }) => useValidationDirty(v), {
      initialProps: { v: false },
    });
    expect(result.current.dirty).toBe(false);

    act(() => result.current.markDirty());
    expect(result.current.dirty).toBe(true);

    // A cycle that starts and ends settles it; a start alone does not.
    rerender({ v: true });
    expect(result.current.dirty).toBe(true);
    rerender({ v: false });
    expect(result.current.dirty).toBe(false);
  });

  it('ignores a flip to idle that no cycle preceded', () => {
    const { result, rerender } = renderHook(({ v }) => useValidationDirty(v), {
      initialProps: { v: false },
    });
    act(() => result.current.markDirty());
    rerender({ v: false });
    expect(result.current.dirty).toBe(true);
  });
});
