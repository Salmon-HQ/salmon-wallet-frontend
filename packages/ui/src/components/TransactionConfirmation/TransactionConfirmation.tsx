/**
 * TransactionConfirmation — core's confirmation screen, on the DOM (spec 027 §2).
 *
 * The last screen before anything is signed, rendered by the wallet from a
 * Powerup's proposal: what leaves and what arrives, every fee as its own
 * line, who routed it, the warning, and the pair of controls. The mobile
 * twin is `apps/mobile/src/components/TransactionConfirmation`.
 */
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SINK_FLOAT_STAGGER_MS,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  opacity,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { floatEntering, useReducedMotion } from '../../motion';
import { WarningNotice } from '../WarningNotice';
import { ConfirmationButtons } from './ConfirmationButtons';
import { ConfirmationDetailsCard } from './ConfirmationDetailsCard';
import { ConfirmationExchange } from './ConfirmationExchange';
import type { TransactionConfirmationProps } from './types';

/** One staged block, floating in on the verb at its own beat — the DOM's Reanimated. */
function Band({
  step,
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { step: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    floatEntering(ref.current, reducedMotion, { delayMs: step * SINK_FLOAT_STAGGER_MS });
  }, [reducedMotion, step]);
  return (
    <div ref={ref} style={style} {...rest}>
      {children}
    </div>
  );
}

export function TransactionConfirmation({
  display,
  onBack,
  onConfirm,
  confirmLabel,
  isRefreshing = false,
  error,
  style,
}: TransactionConfirmationProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();

  return (
    <div
      data-testid="transaction-confirmation"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        padding: `${spacing['2xl']}px ${spacing.headerPadding}px ${spacing.screenGutter}px`,
        ...style,
      }}
    >
      <Band step={0}>
        <h1
          style={{
            margin: `0 0 ${spacing['2xl']}px`,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.headline,
            fontWeight: fontWeight.semibold,
            letterSpacing: letterSpacing.snug,
            lineHeight: lineHeight.condensed,
            color: semantic.text.primary,
            textAlign: 'center',
          }}
        >
          {display.title}
        </h1>
      </Band>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: spacing['4xl'],
        }}
      >
        {display.exchange && (
          <Band step={1} style={{ marginBottom: spacing.xl }}>
            {/* The amount being sent is what the user typed: a rebuild cannot
                change it. Its dollar value can, and so can the receive side. */}
            <ConfirmationExchange
              send={{ ...display.exchange.send, pendingUsdValue: isRefreshing }}
              receive={{
                ...display.exchange.receive,
                pendingAmount: isRefreshing,
                pendingUsdValue: isRefreshing,
              }}
            />
          </Band>
        )}

        <Band
          step={2}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xl,
            marginBottom: spacing['2xl'],
          }}
        >
          <ConfirmationDetailsCard
            rows={display.rows.map((row) => ({ ...row, pending: !!row.pending && isRefreshing }))}
            advancedRows={display.advancedRows?.map((row) => ({
              ...row,
              pending: !!row.pending && isRefreshing,
            }))}
          />
          {display.attribution ? (
            <span
              data-testid="confirmation-attribution"
              style={{
                fontFamily: fontFamily.sans,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: semantic.text.tertiary,
                opacity: opacity.soft,
                textAlign: 'center',
              }}
            >
              {display.attribution}
            </span>
          ) : null}
          {display.contributor ? (
            <span
              data-testid="confirmation-contributor"
              style={{
                fontFamily: fontFamily.sans,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: semantic.text.tertiary,
                opacity: opacity.soft,
                textAlign: 'center',
              }}
            >
              {t('powerups.detail.made_by')}: {display.contributor.name}
            </span>
          ) : null}
        </Band>

        {display.warning && (
          <Band step={3}>
            <WarningNotice tone="warning" title={display.warning.title}>
              {display.warning.body}
            </WarningNotice>
          </Band>
        )}
      </div>

      {error ? (
        <span
          data-testid="confirmation-error"
          role="alert"
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: semantic.status.danger,
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          {t(error)}
        </span>
      ) : null}

      <Band step={4}>
        <ConfirmationButtons
          onBack={onBack}
          onConfirm={onConfirm}
          isRefreshing={isRefreshing}
          confirmLabel={confirmLabel}
        />
      </Band>
    </div>
  );
}
