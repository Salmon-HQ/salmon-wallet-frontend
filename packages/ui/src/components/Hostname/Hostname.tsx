import React from 'react';

/**
 * A hostname, whole.
 *
 * Every other row in the app may lose its tail to an ellipsis; this one may
 * not. The hostname is the only thing on a signing screen that says who the
 * counterparty really is — the name and the icon beside it are chosen by the
 * site — and the part that decides is at the END of it. Clipping
 * `wallet.salmon.io.attacker.example` to `wallet.salmon.io…` in a window
 * whose width is fixed in code shows the victim the attacker's prefix and
 * hides the domain that owns the page, which is the whole of the attack.
 *
 * So it wraps instead: the same treatment an address gets, for the same
 * reason — the last characters are the ones being checked.
 */
export function Hostname({
  value,
  testID,
}: {
  value: string;
  testID?: string;
}): React.ReactElement {
  return (
    <span
      data-testid={testID}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minWidth: 0 }}
    >
      {value}
    </span>
  );
}
