import { describe, expect, it } from 'vitest';
import { sendFailureReport } from './send-failure-report';

const t = (key: string) => key;

describe('sendFailureReport', () => {
  it('reads a classified failure with the chain’s words under it', () => {
    expect(
      sendFailureReport(
        { error: 'transaction.errors.programRejected', errorDetail: 'Program: X' },
        t
      )
    ).toEqual({
      outcomeUnknown: false,
      title: 'transaction.sendFailed',
      message: 'transaction.errors.programRejected',
      detail: 'Program: X',
    });
  });

  it('does not call an unknown outcome a failure', () => {
    expect(
      sendFailureReport({ error: 'transaction.errors.broadcastUnknown', errorDetail: null }, t)
    ).toMatchObject({
      outcomeUnknown: true,
      title: 'transaction.sendUnconfirmed',
      detail: undefined,
    });
  });

  it('falls back to the generic message with nothing else to say', () => {
    expect(sendFailureReport({ error: null, errorDetail: null }, t).message).toBe(
      'transaction.errors.generic'
    );
  });
});
