/**
 * What the send failure surface says, decided once for both platforms.
 *
 * A broadcast whose outcome could not be established is not a failure: the
 * transaction may already be relayed, so the heading must not claim the money
 * stayed put. Everything else reads the classified key, and the detail line
 * carries what the chain actually said (see `describeTransactionError`).
 */
export interface SendFailureReport {
  /** The broadcast's outcome is unknown; the heading says "unconfirmed". */
  outcomeUnknown: boolean;
  title: string;
  message: string;
  /** The chain's own words, when it said more than the message. */
  detail?: string;
}

export function sendFailureReport(
  send: { error: string | null; errorDetail: string | null },
  t: (key: string) => string
): SendFailureReport {
  const outcomeUnknown = send.error === 'transaction.errors.broadcastUnknown';
  return {
    outcomeUnknown,
    title: t(outcomeUnknown ? 'transaction.sendUnconfirmed' : 'transaction.sendFailed'),
    message: t(send.error ?? 'transaction.errors.generic'),
    detail: send.errorDetail ?? undefined,
  };
}
