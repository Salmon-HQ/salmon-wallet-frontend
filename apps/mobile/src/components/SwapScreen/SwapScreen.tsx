/**
 * SwapScreen — the Swap Powerup on React Native: the token paid with, the
 * amount, the token received, and the one control that hands core a
 * proposal. Review, signing and the receipt are core's (`ConfirmationHost`).
 * DOM twin: `packages/ui/src/components/SwapPage`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { s, spacing, useFieldFocus, vs, type Semantic } from '@salmon/shared';
import { swapScreenView, useSwapScreenLogic } from '@salmon/shared/powerups';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { CaretRightIcon, iconSize } from '../../icons';
import { AmountEntryCard } from '../AmountEntryCard';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { TokenLogo } from '../TokenLogo';
import { TokenPickerSheet } from '../TokenPickerSheet';
import { WarningNotice } from '../WarningNotice';
import type { SwapScreenProps } from './types';

export const SwapScreen: React.FC<SwapScreenProps> = ({ style, ...logicParams }) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const amountFocus = useFieldFocus();
  const logic = useSwapScreenLogic(logicParams);
  const view = swapScreenView(logic, t);
  const state = view.unavailable ?? view.empty;

  if (state) {
    return (
      <View style={[styles.container, style]} testID="swap-screen">
        <StateBlock tone="empty" {...state} />
      </View>
    );
  }

  const caret = <CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />;
  const mark = (token: typeof logic.pay.token) => (
    <TokenLogo uri={token?.logo || undefined} symbol={token?.symbol} size={s(38)} />
  );

  return (
    <View style={[styles.container, style]} testID="swap-screen">
      {/* What stops the swap is said first, before the user composes one. */}
      {view.blockerText && (
        <WarningNotice tone="warning" title={view.blockerText} testID="swap-blocker" />
      )}
      <SectionLabel variant="caps">{view.payLabel}</SectionLabel>
      <ListRow {...view.payRow} leading={mark(logic.pay.token)} trailing={caret} />
      <AmountEntryCard
        {...view.amountCard}
        focused={amountFocus.focused || view.shortcutFocused}
        onFocus={amountFocus.onFocus}
        onBlur={amountFocus.onBlur}
      />
      <ChipGroup {...view.shortcutChips} style={styles.shortcuts} />

      <SectionLabel variant="caps">{view.receiveLabel}</SectionLabel>
      <ListRow {...view.receiveRow} leading={mark(logic.receive.token)} trailing={caret} />

      {view.errorText && <WarningNotice tone="error" title={view.errorText} testID="swap-error" />}

      <View style={styles.action}>
        <PrimaryButton {...view.submitButton}>{view.submitLabel}</PrimaryButton>
      </View>

      <TokenPickerSheet {...view.payPicker} />
      <TokenPickerSheet {...view.receivePicker} />
    </View>
  );
};

const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: s(spacing.headerPadding),
      // Tight seams so the whole form, button included, fits under Home's
      // condensed balance (owner, 2026-10-06).
      gap: vs(spacing.sm),
    },
    shortcuts: {
      flexGrow: 0,
    },
    action: {
      paddingTop: vs(spacing.sm),
    },
  });

export default SwapScreen;
