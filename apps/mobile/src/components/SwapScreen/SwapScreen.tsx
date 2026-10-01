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
import { useSwapScreenLogic } from '@salmon/shared/powerups';

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
  const { pay, receive, shortcuts } = logic;
  const error = logic.error;
  const describe = (message: typeof error) =>
    message
      ? typeof message === 'string'
        ? t(message)
        : t(message.key, message.params)
      : undefined;
  const errorText = describe(error);
  const blockerText = describe(logic.blocker);

  if (logic.unavailable) {
    return (
      <View style={[styles.container, style]} testID="swap-screen">
        <StateBlock
          tone="empty"
          testID={`swap-unavailable-${logic.unavailable}`}
          title={t(`powerups.unavailable.${logic.unavailable}`)}
        />
      </View>
    );
  }

  if (!pay.loading && pay.tokens.length === 0) {
    return (
      <View style={[styles.container, style]} testID="swap-screen">
        <StateBlock
          tone="empty"
          testID="swap-empty"
          title={t('swap.empty_title')}
          body={t('swap.empty_body')}
        />
      </View>
    );
  }

  const caret = <CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />;

  return (
    <View style={[styles.container, style]} testID="swap-screen">
      {/* What stops the swap is said first, before the user composes one. */}
      {blockerText && <WarningNotice tone="warning" title={blockerText} testID="swap-blocker" />}
      <SectionLabel variant="caps">{t('swap.pay_label')}</SectionLabel>
      <ListRow
        testID="swap-pay-token"
        onPress={pay.openPicker}
        accessibilityLabel={t('swap.select_token')}
        leading={
          <TokenLogo uri={pay.token?.logo || undefined} symbol={pay.token?.symbol} size={s(38)} />
        }
        title={pay.token?.symbol ?? t('swap.select_token')}
        subtitle={pay.subtitle}
        trailing={caret}
      />
      <AmountEntryCard
        testID="swap-amount"
        value={logic.amount}
        onChangeValue={shortcuts.onAmountChange}
        placeholder="0"
        subtext={logic.fiatLine}
        loading={pay.loading}
        focused={amountFocus.focused || shortcuts.selected !== ''}
        onFocus={amountFocus.onFocus}
        onBlur={amountFocus.onBlur}
      />
      <ChipGroup
        testID="swap-shortcuts"
        options={shortcuts.options}
        value={shortcuts.selected}
        onChange={shortcuts.select}
        size="md"
        fill
        variant="outline"
        style={styles.shortcuts}
      />

      <SectionLabel variant="caps">{t('swap.receive_label')}</SectionLabel>
      <ListRow
        testID="swap-receive-token"
        onPress={receive.openPicker}
        accessibilityLabel={t('swap.select_token')}
        leading={
          <TokenLogo
            uri={receive.token?.logo || undefined}
            symbol={receive.token?.symbol}
            size={s(38)}
          />
        }
        title={receive.token?.symbol ?? t('swap.select_token')}
        subtitle={receive.subtitle}
        trailing={caret}
      />

      {errorText && <WarningNotice tone="error" title={errorText} testID="swap-error" />}

      <View style={styles.action}>
        <PrimaryButton
          testID="swap-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          loading={logic.isConfirming}
        >
          {t('swap.submit')}
        </PrimaryButton>
      </View>

      <TokenPickerSheet
        testID="swap-pay-picker"
        visible={pay.pickerOpen}
        onClose={pay.closePicker}
        tokens={pay.tokens}
        loading={pay.loading}
        onSelectToken={pay.select}
      />
      <TokenPickerSheet
        testID="swap-receive-picker"
        visible={receive.pickerOpen}
        onClose={receive.closePicker}
        tokens={receive.tokens}
        loading={receive.loading}
        onSelectToken={receive.select}
        onSearch={receive.onSearch}
        showBalances={false}
      />
    </View>
  );
};

const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: s(spacing.headerPadding),
      gap: vs(spacing.md),
    },
    shortcuts: {
      flexGrow: 0,
    },
    action: {
      paddingTop: vs(spacing.lg),
    },
  });

export default SwapScreen;
