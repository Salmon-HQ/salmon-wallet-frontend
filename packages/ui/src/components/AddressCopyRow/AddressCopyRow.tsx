/**
 * AddressCopyRow — a label, a truncated address, and the copy control beside
 * it, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AddressCopyRow/AddressCopyRow.tsx`:
 * the kit's `KeyValueRow` with the address as a monospace value and a bare
 * copy affordance as its action — the same control the transaction hash row
 * draws (`TransactionDetailReceipt`), not a contained well: accent for the
 * affordance, success for the confirmation. The clipboard is the platform's;
 * the "copied" hold is the shared `useCopyFeedback`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  fontFamily,
  fontSize,
  truncatedAddress,
  useCopyFeedback,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import { CopyTick } from '../CopyTick';
import { KeyValueRow } from '../KeyValueRow';
import type { AddressCopyRowProps } from './types';

export function AddressCopyRow({
  label,
  address,
  truncate = 'medium',
  className,
  style,
}: AddressCopyRowProps) {
  const { t } = useTranslation();
  const { status, text } = useSemantic();
  const { copied, trigger: showCopied } = useCopyFeedback();

  const displayAddress = truncatedAddress(address, truncate);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(address);
      showCopied();
    } catch (error) {
      // Silently fail - clipboard might not be available in some environments
      console.warn('Failed to copy address:', error);
    }
  }, [address, showCopied]);

  return (
    <KeyValueRow
      className={className}
      style={style}
      label={label}
      // Monospace-Is-For-Scanning Rule: an address is read positionally,
      // prefix against suffix, so its characters must hold a fixed width —
      // Geist Mono at the address size. `KeyValueRow`'s own value style is
      // bold body, so the address arrives as a node rather than a string.
      value={
        <span
          data-testid="tx-detail-address-value"
          style={{
            fontFamily: fontFamily.mono,
            fontSize: fontSize.mono,
            color: text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayAddress}
        </span>
      }
      action={
        // Same card, same gesture, same ink as the transaction hash row's
        // copy control: a bare icon, no well, accent for the affordance and
        // success for the confirmation.
        <button
          type="button"
          data-testid={`tx-detail-copy-address-${label}`}
          onClick={() => void handleCopy()}
          aria-label={
            copied ? t('actions.copied') : t('transactions.detail.copyAddressLabel', { label })
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          <CopyTick
            copied={copied}
            copy={<CopyIcon size={iconSize.sm} color={text.accent} />}
            tick={<CheckIcon size={iconSize.sm} color={status.success} />}
          />
        </button>
      }
    />
  );
}
