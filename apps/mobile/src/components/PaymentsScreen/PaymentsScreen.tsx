/**
 * PaymentsScreen — the Payments Powerup on React Native: the form that asks
 * for USDC, the list of what was asked, and the sheet that shows one request
 * as a code. Every prop is composed in the shared hook; this file only
 * renders. DOM twin: `packages/ui/src/components/PaymentsPage`.
 */
import React, { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { componentSizes, s, spacing, vs, type Semantic } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { powerupIcons } from '../../icons';
import { AmountEntryCard } from '../AmountEntryCard';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { TextField } from '../TextInput';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsScreenProps } from './types';

export function PaymentsScreen({
  style,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsScreenProps) {
  const styles = useThemedStyles(stylesFor);
  const { form, list, sheet, unavailable, openUri } = usePaymentsScreenLogic(logicParams);
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  const onShare = useCallback(() => {
    if (openUri) void Share.share({ message: openUri });
  }, [openUri]);

  if (unavailable) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
      </View>
    );
  }

  const { label, ...createButton } = form.createButton;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.form}>
        <SectionLabel variant="caps">{form.amountLabel}</SectionLabel>
        <AmountEntryCard
          testID="payments-amount"
          {...form.amountCard}
          focused={focused}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <TextField testID="payments-note" {...form.noteField} />
        <SectionLabel variant="caps">{form.expiryLabel}</SectionLabel>
        <ChipGroup testID="payments-expiry" {...form.expiryChips} />
        {form.errorRow && <KeyValueRow testID="payments-error" {...form.errorRow} />}
        <View style={styles.action}>
          <PrimaryButton testID="payments-create" {...createButton} style={styles.button}>
            {label}
          </PrimaryButton>
        </View>
      </View>

      <SectionLabel variant="caps">{list.title}</SectionLabel>
      {list.rows.length === 0 ? (
        <StateBlock tone="empty" testID="payments-empty" {...list.empty} />
      ) : (
        <View style={styles.list}>
          {list.rows.map((row) => (
            <ListRow
              key={row.id}
              testID={`payments-row-${row.id}`}
              {...row.listRow}
              leading={<IconBubble {...row.bubble} icon={powerupIcons.QrCode} />}
              trailing={<KeyValueRow {...row.trailing} />}
            />
          ))}
        </View>
      )}

      <PaymentRequestSheet testID="payments-sheet" {...sheet} onShare={onShare} />
    </View>
  );
}

const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: s(spacing.headerPadding),
      gap: vs(spacing.screenGutter),
    },
    form: {
      gap: vs(spacing.md),
    },
    action: {
      alignItems: 'center',
      paddingTop: vs(spacing.sm),
    },
    button: {
      width: s(componentSizes.copyButtonWidth),
      height: vs(componentSizes.buttonHeightCompact),
    },
    list: {
      gap: vs(spacing.screenGutter),
    },
  });

export default PaymentsScreen;
