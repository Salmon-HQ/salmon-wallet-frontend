/**
 * The send failure, reported on the task surface the passage already owns.
 *
 * The mobile twin is `apps/mobile/src/components/Send/SendFailure.tsx`. A
 * failed transfer does not rewind the passage: the surface the wait was
 * standing on stays, and this is what stands on it instead — what went
 * wrong, the action that tries again without leaving, and the one gesture
 * out. No bottom inset on the DOM: the panel has no safe area.
 */
import React from 'react';
import { fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton, SecondaryButton } from '../Button';
import type { SendFailureProps } from './types';

export function SendFailure({
  title,
  message,
  onRetry,
  onDismiss,
  retryLabel,
  dismissLabel,
}: SendFailureProps) {
  const t = useSemantic();

  return (
    <div
      data-testid="send-failure"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `0 ${spacing.headerPadding}px`,
          gap: spacing.md,
        }}
      >
        <p
          data-testid="send-failure-title"
          style={{
            margin: 0,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.xl,
            color: t.text.primary,
            textAlign: 'center',
          }}
        >
          {title}
        </p>
        <p
          data-testid="send-failure-message"
          style={{
            margin: 0,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.sm,
            color: t.status.danger,
            textAlign: 'center',
          }}
        >
          {message}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          padding: `0 ${spacing.headerPadding}px ${spacing.xl}px`,
        }}
      >
        <PrimaryButton testID="send-failure-retry" onPress={onRetry}>
          {retryLabel}
        </PrimaryButton>
        <SecondaryButton testID="send-failure-dismiss" onPress={onDismiss}>
          {dismissLabel}
        </SecondaryButton>
      </div>
    </div>
  );
}
