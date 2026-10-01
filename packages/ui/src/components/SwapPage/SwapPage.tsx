/**
 * SwapPage — the Swap Powerup on the DOM: the token paid with, the amount,
 * the token received, and the one control that hands core a proposal.
 * Review, signing and the receipt are core's (`ConfirmationHost`).
 * Mobile twin: `apps/mobile/src/components/SwapScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useFieldFocus } from '@salmon/shared';
import { useSwapScreenLogic } from '@salmon/shared/powerups';

import { useSemantic } from '../../theme/ThemeProvider';
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
import type { SwapPageProps } from './types';

export function SwapPage({ style, ...logicParams }: SwapPageProps) {
  const { t } = useTranslation();
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

  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    gap: spacing.md,
    padding: `0 ${spacing.headerPadding}px ${spacing.screenGutter}px`,
    ...style,
  };

  if (logic.unavailable) {
    return (
      <div data-testid="swap-screen" style={container}>
        <StateBlock
          tone="empty"
          testID={`swap-unavailable-${logic.unavailable}`}
          title={t(`powerups.unavailable.${logic.unavailable}`)}
        />
      </div>
    );
  }

  if (!pay.loading && pay.tokens.length === 0) {
    return (
      <div data-testid="swap-screen" style={container}>
        <StateBlock
          tone="empty"
          testID="swap-empty"
          title={t('swap.empty_title')}
          body={t('swap.empty_body')}
        />
      </div>
    );
  }

  const caret = <CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />;

  return (
    <div data-testid="swap-screen" style={container}>
      {/* What stops the swap is said first, before the user composes one. */}
      {blockerText && <WarningNotice tone="warning" title={blockerText} testID="swap-blocker" />}
      <SectionLabel variant="caps">{t('swap.pay_label')}</SectionLabel>
      <ListRow
        testID="swap-pay-token"
        onPress={pay.openPicker}
        accessibilityLabel={t('swap.select_token')}
        leading={
          <TokenLogo
            uri={pay.token?.logo || undefined}
            symbol={pay.token?.symbol}
            size={38}
            borderRadius={19}
          />
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
            size={38}
            borderRadius={19}
          />
        }
        title={receive.token?.symbol ?? t('swap.select_token')}
        subtitle={receive.subtitle}
        trailing={caret}
      />

      {errorText && <WarningNotice tone="error" title={errorText} testID="swap-error" />}

      <div style={{ paddingTop: spacing.lg }}>
        <PrimaryButton
          testID="swap-submit-button"
          onPress={() => void logic.submit()}
          disabled={!logic.canSubmit}
          loading={logic.isConfirming}
        >
          {t('swap.submit')}
        </PrimaryButton>
      </div>

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
    </div>
  );
}
