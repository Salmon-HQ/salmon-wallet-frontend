import { act } from '@testing-library/react';
import { vi } from 'vitest';

import { APPROVE_ARM_MS } from '../components/DAppApproval/useApprovalArming';

/** A person moving the pointer across the approval window: two positions. */
export function movePointer(): void {
  act(() => {
    window.dispatchEvent(new MouseEvent('pointermove', { screenX: 10, screenY: 200 }));
    window.dispatchEvent(new MouseEvent('pointermove', { screenX: 15, screenY: 205 }));
  });
}

/** What a person does before Approve takes a click: waits, then moves the pointer. */
export function armApproval(): void {
  act(() => vi.advanceTimersByTime(APPROVE_ARM_MS));
  movePointer();
}
