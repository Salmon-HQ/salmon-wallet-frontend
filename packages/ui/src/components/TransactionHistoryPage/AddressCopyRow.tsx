/**
 * AddressCopyRow — a label, a truncated address, and the copy control beside
 * it, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/AddressCopyRow.tsx`:
 * the kit's `KeyValueRow` with the address as a monospace value and the copy
 * well (`IconBubble`) as its action — accent for the affordance, success for
 * the confirmation. The clipboard is the platform's; the "copied" hold is the
 * shared `useCopyFeedback`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  fontFamily,
  fontSize,
  getShortAddress,
  useCopyFeedback,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import { CopyTick } from '../CopyTick';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import type { AddressCopyRowProps } from './types';

// The copy control is the kit's 32-ish well; `IconBubble`'s closed union has
// no 32, so this takes the nearest step (36) rather than growing a tenth size
// for one caller.
const COPY_BUBBLE_SIZE = 36;

/** Character counts for each truncation mode */
const TRUNCATE_CHARS: Record<'short' | 'medium' | 'long', number> = {
  short: 4,
  medium: 6,
  long: 8,
};

function getTruncatedAddress(
  address: string,
  truncate: 'short' | 'medium' | 'long' | false
): string {
  if (truncate === false) return address;
  return getShortAddress(address, TRUNCATE_CHARS[truncate]) ?? address;
}

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

  const displayAddress = getTruncatedAddress(address, truncate);

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
        <IconBubble
          testID={`tx-detail-copy-address-${label}`}
          size={COPY_BUBBLE_SIZE}
          tone={copied ? 'success-tint' : 'surface'}
          onPress={() => void handleCopy()}
          accessibilityLabel={
            copied ? t('actions.copied') : t('transactions.detail.copyAddressLabel', { label })
          }
          accessibilityHint={t('transactions.detail.copyAddressHint')}
        >
          <CopyTick
            copied={copied}
            copy={<CopyIcon size={iconSize.sm} color={text.accent} />}
            tick={<CheckIcon size={iconSize.sm} color={status.success} />}
          />
        </IconBubble>
      }
    />
  );
}
