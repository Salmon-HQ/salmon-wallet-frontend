import {
  borderRadius,
  colors,
  componentSizes,
  fontSize,
  fontFamilyNative,
  letterSpacing,
  lineHeight,
  ms,
  opacity,
  s,
  spacing,
  vs,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SINK_FLOAT_STAGGER_MS, floatEntering } from '../../utils/sinkAndFloat';
import { BlurContainer } from '../BlurContainer';
import { DataAttribution } from '../DataAttribution';
import { ConfirmationDetailsCard } from './ConfirmationDetailsCard';
import { ConfirmationExchange } from './ConfirmationExchange';
import { ConfirmationButtons } from './ConfirmationButtons';
import type { TransactionConfirmationProps } from './types';

/**
 * TransactionConfirmation - core's confirmation screen (spec 027 §2).
 *
 * The last screen before anything is signed, rendered by the wallet from a
 * Powerup's proposal: what leaves and what arrives, every fee as its own
 * line, who routed it, the warning, and the pair of controls. The Powerup
 * decided none of the layout and sees none of the signature.
 */
export const TransactionConfirmation: React.FC<TransactionConfirmationProps> = ({
  display,
  onBack,
  onConfirm,
  confirmLabel,
  isRefreshing = false,
  error,
  networkId,
  style,
}) => {
  const { t } = useTranslation();

  // The screen surfaces in bands, not as one slab: title, exchange, details,
  // warning, buttons — each one `SINK_FLOAT_STAGGER_MS` (the Surfacing
  // chrome's 24ms step; owner's band 24–40) behind the last. Five steps, the
  // system's ceiling. Reduce motion: `floatEntering` is undefined — a cut.
  const isReduceMotionEnabled = useReducedMotion();
  const bandEntering = (band: number) =>
    floatEntering(isReduceMotionEnabled, { delayMs: band * SINK_FLOAT_STAGGER_MS });

  return (
    <View style={[styles.container, style]} testID="transaction-confirmation">
      {/* Title — band 0 */}
      <Animated.View entering={bandEntering(0)}>
        <Text style={styles.title}>{display.title}</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exchange graphic: sent token → arrow → received token — band 1 */}
        {display.exchange && (
          <Animated.View entering={bandEntering(1)} style={styles.cardsContainer}>
            {/* The amount being sent is what the user typed: a rebuild cannot
                change it, so it never reports loading. Its dollar value can,
                and so can everything on the receive side. */}
            <ConfirmationExchange
              send={{ ...display.exchange.send, pendingUsdValue: isRefreshing }}
              receive={{
                ...display.exchange.receive,
                pendingAmount: isRefreshing,
                pendingUsdValue: isRefreshing,
              }}
            />
          </Animated.View>
        )}

        {/* Details — one grouped card (owner, on-device 2026-08-18): a pill
            per row overflowed the viewport by itself and forced the review
            to scroll. Only the rows a rebuild can change report it. Band 2. */}
        <Animated.View entering={bandEntering(2)}>
          <ConfirmationDetailsCard
            style={styles.detailsContainer}
            rows={display.rows.map((row) => ({ ...row, pending: !!row.pending && isRefreshing }))}
            advancedRows={display.advancedRows?.map((row) => ({
              ...row,
              pending: !!row.pending && isRefreshing,
            }))}
          />
          {display.attribution ? (
            <Text style={styles.attribution} testID="confirmation-attribution">
              {display.attribution}
            </Text>
          ) : null}
          {/* The USD values' provider, credited once under the details. */}
          <DataAttribution networkId={networkId} />
        </Animated.View>

        {/* Warning box — band 3 */}
        {display.warning && (
          <Animated.View entering={bandEntering(3)}>
            <BlurContainer
              borderColor={colors.palette.amber}
              backgroundColor={semantic.status.warningTint}
              style={styles.warningBox}
            >
              <Text style={styles.warningTitle}>{display.warning.title}</Text>
              <Text style={styles.warningText}>{display.warning.body}</Text>
            </BlurContainer>
          </Animated.View>
        )}
      </ScrollView>

      {/* A failed signature is reported here, above the controls, and the
          user retries or backs out: nothing rewinds to the Powerup. */}
      {error ? (
        <Text style={styles.errorText} testID="confirmation-error">
          {t(error)}
        </Text>
      ) : null}

      {/* Buttons — band 4, the last step of the stagger */}
      <Animated.View entering={bandEntering(4)}>
        <ConfirmationButtons
          onBack={onBack}
          onConfirm={onConfirm}
          isRefreshing={isRefreshing}
          confirmLabel={confirmLabel}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: s(spacing.headerPadding),
    paddingTop: vs(spacing['2xl']),
  },
  title: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: letterSpacing.snug,
    lineHeight: ms(24 * lineHeight.condensed),
    marginBottom: vs(spacing['2xl']),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(spacing['4xl']),
  },
  cardsContainer: {
    gap: vs(spacing.md),
    marginBottom: vs(spacing['2xl']),
  },
  detailsContainer: {
    marginBottom: vs(spacing.sm),
  },
  attribution: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    textAlign: 'center',
    opacity: opacity.soft,
    marginBottom: vs(spacing['3xl']),
    minHeight: vs(componentSizes.swapDetailRowHeight / 2),
  },
  warningBox: {
    borderRadius: borderRadius.md,
    padding: s(spacing.base),
    marginBottom: vs(spacing.lg),
  },
  warningTitle: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.status.warning,
    marginBottom: vs(spacing.xs),
    letterSpacing: letterSpacing.normal,
  },
  warningText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.secondary,
    lineHeight: ms(12 * lineHeight.normal),
    letterSpacing: letterSpacing.normal,
  },
  errorText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: semantic.status.danger,
    textAlign: 'center',
    marginBottom: vs(spacing.md),
  },
});

export default TransactionConfirmation;
