/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHeldSheetSize } from './useHeldSheetSize';

describe('useHeldSheetSize', () => {
  it('keeps the ceiling it opened with until released, then reads afresh', () => {
    const { result, rerender } = renderHook(
      ({ visible, height }) => useHeldSheetSize(visible, height),
      { initialProps: { visible: true, height: 300 } }
    );
    expect(result.current.sheetHeight).toBe(300);

    rerender({ visible: true, height: 500 });
    expect(result.current.sheetHeight).toBe(300);

    act(() => result.current.release());
    rerender({ visible: false, height: 500 });
    expect(result.current.sheetHeight).toBe(500);

    rerender({ visible: true, height: 500 });
    rerender({ visible: true, height: 200 });
    expect(result.current.sheetHeight).toBe(500);
  });
});
