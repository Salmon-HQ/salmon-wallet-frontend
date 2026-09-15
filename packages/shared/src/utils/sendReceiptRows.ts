/**
 * The three rows the send receipt shows, built once for both twins: what
 * moved, to whom, and that the chain confirmed it.
 */
import type { KeyValueRowPropsBase } from '../types/ui/key-value-row';

export function sendReceiptRows(
  t: (key: string) => string,
  amountDisplay: string,
  recipientName: string
): KeyValueRowPropsBase[] {
  return [
    { label: t('token.send.amountLabel'), value: amountDisplay },
    { label: t('transactions.to'), value: recipientName },
    {
      label: t('send.screens.status'),
      value: t('transactions.detail.confirmed'),
      valueTone: 'success',
    },
  ];
}
