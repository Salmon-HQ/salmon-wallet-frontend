/**
 * The swap screen's props per block, derived once from the hook's result so
 * each twin renders a form it did not compose (POWERUPS-UI §3.3). Everything
 * here is platform-free: strings already translated, handlers already bound,
 * ids already named. A twin adds only what its platform draws — the token
 * mark, the caret, the layout.
 */
import type { PowerupErrorMessage } from '../backend/errors';
import type { SwapSideBinding, UseSwapScreenLogicResult } from './useSwapScreenLogic';

import type { TFunction } from 'i18next';

type Translate = TFunction;

const describe = (t: Translate, message: PowerupErrorMessage | null): string | undefined =>
  message ? (typeof message === 'string' ? t(message) : t(message.key, message.params)) : undefined;

const sideRow = (t: Translate, side: SwapSideBinding, testID: string) => ({
  testID,
  onPress: side.openPicker,
  accessibilityLabel: t('swap.select_token'),
  title: side.token?.symbol ?? t('swap.select_token'),
  subtitle: side.subtitle,
});

const sidePicker = (side: SwapSideBinding, testID: string) => ({
  testID,
  visible: side.pickerOpen,
  onClose: side.closePicker,
  tokens: side.tokens,
  loading: side.loading,
  onSelectToken: side.select,
});

export function swapScreenView(logic: UseSwapScreenLogicResult, t: Translate) {
  const { pay, receive, shortcuts } = logic;
  return {
    /** The backend refused this caller: drawn in place of the form. */
    unavailable: logic.unavailable
      ? {
          testID: `swap-unavailable-${logic.unavailable}`,
          title: t(`powerups.unavailable.${logic.unavailable}`),
        }
      : null,
    /** Nothing held to pay with: drawn in place of the form. */
    empty:
      !pay.loading && pay.tokens.length === 0
        ? { testID: 'swap-empty', title: t('swap.empty_title'), body: t('swap.empty_body') }
        : null,
    blockerText: describe(t, logic.blocker),
    errorText: describe(t, logic.error),
    payLabel: t('swap.pay_label'),
    receiveLabel: t('swap.receive_label'),
    payRow: sideRow(t, pay, 'swap-pay-token'),
    receiveRow: sideRow(t, receive, 'swap-receive-token'),
    amountCard: {
      testID: 'swap-amount',
      value: logic.amount,
      onChangeValue: shortcuts.onAmountChange,
      placeholder: '0',
      subtext: logic.fiatLine,
      loading: pay.loading,
    },
    /** The amount card paints its accent edge while a fill chip is chosen, as if focused. */
    shortcutFocused: shortcuts.selected !== '',
    shortcutChips: {
      testID: 'swap-shortcuts',
      options: shortcuts.options,
      value: shortcuts.selected,
      onChange: shortcuts.select,
      size: 'md' as const,
      fill: true,
      variant: 'outline' as const,
    },
    submitLabel: t('swap.submit'),
    submitButton: {
      testID: 'swap-submit-button',
      onPress: () => void logic.submit(),
      disabled: !logic.canSubmit,
      loading: logic.isConfirming,
    },
    payPicker: sidePicker(pay, 'swap-pay-picker'),
    receivePicker: {
      ...sidePicker(receive, 'swap-receive-picker'),
      onSearch: receive.onSearch,
      showBalances: false,
    },
  };
}

export type SwapScreenView = ReturnType<typeof swapScreenView>;
