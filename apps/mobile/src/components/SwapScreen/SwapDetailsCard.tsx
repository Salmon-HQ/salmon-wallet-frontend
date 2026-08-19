import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  ms,
  s,
  spacing,
  vs,
} from '@salmon/shared';
import { CaretDownIcon, iconSize } from '../../icons';
import { BlurContainer } from '../BlurContainer';
import { PendingValue } from '../PendingValue';
import type { SwapDetailItem } from '@salmon/shared';
import type { SwapDetailsCardProps } from './types';

/**
 * SwapDetailsCard - the review screens' detail rows grouped into ONE card.
 *
 * Each row used to be its own pill (padding + gap per row); nine to eleven of
 * them alone overflowed the viewport, which is what kept the review
 * scrolling. Grouped, a row costs `componentSizes.swapDetailRowHeight` and a
 * hairline. Advanced rows fold behind a "Details" disclosure, collapsed by
 * default — the critical rows and the warning stay on screen.
 */
const DetailRow: React.FC<SwapDetailItem & { withSeparator: boolean }> = ({
  label,
  value,
  pending = false,
  withSeparator,
}) => (
  <View style={[styles.row, withSeparator && styles.rowSeparator]}>
    <Text style={styles.label}>{label}</Text>
    <PendingValue pending={pending}>
      <Text style={styles.value}>{value}</Text>
    </PendingValue>
  </View>
);

export const SwapDetailsCard: React.FC<SwapDetailsCardProps> = ({
  rows,
  advancedRows = [],
  style,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAdvanced = advancedRows.length > 0;

  return (
    // BlurContainer takes no testID; the wrapper carries the hook instead.
    <View style={style} testID="swap-details-card">
      <BlurContainer style={styles.card}>
        {rows.map((row, index) => (
          <DetailRow key={row.label} {...row} withSeparator={index > 0} />
        ))}
        {hasAdvanced && (
          <>
            <TouchableOpacity
              testID="swap-details-disclosure"
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={t('swap.review.details', 'Details')}
              onPress={() => setIsExpanded((expanded) => !expanded)}
              style={[styles.row, styles.rowSeparator]}
            >
              <Text style={styles.label}>{t('swap.review.details', 'Details')}</Text>
              <View style={isExpanded ? styles.chevronExpanded : undefined}>
                <CaretDownIcon size={iconSize.sm} color={colors.text.secondary} />
              </View>
            </TouchableOpacity>
            {isExpanded &&
              advancedRows.map((row) => <DetailRow key={row.label} {...row} withSeparator />)}
          </>
        )}
      </BlurContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    paddingVertical: vs(spacing.xs),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.base),
    height: vs(componentSizes.swapDetailRowHeight),
  },
  rowSeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  label: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(15 * lineHeight.normal),
  },
  value: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.extraBold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.slight,
    lineHeight: ms(15 * lineHeight.normal),
  },
});

export default SwapDetailsCard;
