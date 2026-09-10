/**
 * @vitest-environment jsdom
 *
 * The failure says why, and — when the chain said more — what came back,
 * under the message and quieter than it. The DOM twin of
 * `apps/mobile/src/components/Send/SendFailure.test.tsx`.
 */
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';
import { SendFailure } from './SendFailure';

afterEach(cleanup);

const props = (detail?: string) => ({
  title: 'Send failed',
  message: 'The program refused this transaction.',
  detail,
  retryLabel: 'Retry',
  dismissLabel: 'Continue',
  onRetry: vi.fn(),
  onDismiss: vi.fn(),
});

it('draws the detail line only when the chain said more than the message', () => {
  renderInMode('dark', <SendFailure {...props('Program Toke…Q5DA: AccountFrozen (#17)')} />);
  expect(screen.getByTestId('send-failure-detail').textContent).toBe(
    'Program Toke…Q5DA: AccountFrozen (#17)'
  );
  cleanup();

  renderInMode('dark', <SendFailure {...props()} />);
  expect(screen.getByTestId('send-failure-message')).toBeTruthy();
  expect(screen.queryByTestId('send-failure-detail')).toBeNull();
});
