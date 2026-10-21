import { act } from '@testing-library/react';
import { vi } from 'vitest';

import { APPROVE_ARM_MS } from '../components/DAppApproval/useApprovalArming';

let x = 0;

/** A person moving the pointer across the approval window. */
export function movePointer(): void {
  act(() => {
    x += 10;
    window.dispatchEvent(new MouseEvent('pointermove', { screenX: x, screenY: 200 }));
    window.dispatchEvent(new MouseEvent('pointermove', { screenX: x + 5, screenY: 205 }));
  });
}

/** What a person does before Approve takes a click: waits, then moves the pointer. */
export function armApproval(): void {
  act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));
  movePointer();
}
