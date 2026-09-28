/**
 * ConfirmationDetailsCard — the confirmation's detail rows grouped into ONE
 * card, on the same material and rhythm as every other card of facts in
 * the wallet (the token detail's Market data, a Powerup's Made by /
 * Networks): `Card` + `KeyValueRow`, rows spaced by the card's gap, no
 * hairlines (owner, 2026-09-11). Advanced rows fold behind a "Details"
 * disclosure, collapsed by default — the critical rows and the warning stay
 * on screen. The DOM twin is
 * `packages/ui/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  spacing,
  valueInkFor,
  type Semantic,
} from '@salmon/shared';
import { CaretDownIcon, iconSize } from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { PendingValue } from '../PendingValue';
import type { ConfirmationDetailsCardProps, ConfirmationRow } from './types';

/** One row: the kit's label, and the kit's value wrapped in the pending shimmer. */
const DetailRow: React.FC<ConfirmationRow> = ({ label, value, pending = false }) => {
  const styles = useThemedStyles(stylesFor);
  const valueInk = valueInkFor(useSemantic());
  return (
    <KeyValueRow
      label={label}
      value={
        <PendingValue pending={pending}>
          <Text
            style={[styles.value, { color: valueInk.primary }]}
            maxFontSizeMultiplier={fontScaleCap.dense}
            numberOfLines={1}
          >
            {value}
          </Text>
        </PendingValue>
      }
    />
  );
};

export const ConfirmationDetailsCard: React.FC<ConfirmationDetailsCardProps> = ({
  rows,
  advancedRows = [],
  style,
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAdvanced = advancedRows.length > 0;

  return (
    <Card
      padding="lg"
      gap={spacing.md}
      radius="xl"
      style={style}
      testID="confirmation-details-card"
    >
      {rows.map((row) => (
        <DetailRow key={row.label} {...row} />
      ))}
      {hasAdvanced && (
        <>
          {/* The disclosure is a row in the card's own rhythm: the label at
              the row label's weight, the caret where a value would sit. */}
          <TouchableOpacity
            testID="confirmation-details-disclosure"
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={t('confirmation.details', 'Details')}
            onPress={() => setIsExpanded((expanded) => !expanded)}
            style={styles.disclosure}
          >
            <Text style={styles.label} maxFontSizeMultiplier={fontScaleCap.dense}>
              {t('confirmation.details', 'Details')}
            </Text>
            <View style={isExpanded ? styles.chevronExpanded : undefined}>
              <CaretDownIcon size={iconSize.sm} color={semantic.text.secondary} />
            </View>
          </TouchableOpacity>
          {isExpanded && advancedRows.map((row) => <DetailRow key={row.label} {...row} />)}
        </>
      )}
    </Card>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    disclosure: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    // The kit row's label and value, so a pending value and the disclosure
    // read exactly like the rows beside them.
    label: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
    },
    value: {
      fontFamily: fontFamilyNative.bold,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
    },
    chevronExpanded: {
      transform: [{ rotate: '180deg' }],
    },
  });

export default ConfirmationDetailsCard;
