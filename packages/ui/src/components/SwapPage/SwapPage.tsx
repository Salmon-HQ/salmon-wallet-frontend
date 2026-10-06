/**
 * SwapPage — the Swap Powerup on the DOM: the token paid with, the amount,
 * the token received, and the one control that hands core a proposal.
 * Review, signing and the receipt are core's (`ConfirmationHost`).
 * Mobile twin: `apps/mobile/src/components/SwapScreen`.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useFieldFocus } from '@salmon/shared';
import { swapScreenView, useSwapScreenLogic } from '@salmon/shared/powerups';

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
  const view = swapScreenView(logic, t);
  const state = view.unavailable ?? view.empty;

  const container: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    // Tight seams so the whole form, button included, fits the popup under
    // Home's condensed balance (owner, 2026-10-06).
    gap: spacing.sm,
    padding: `0 ${spacing.headerPadding}px ${spacing.screenGutter}px`,
    ...style,
  };

  if (state) {
    return (
      <div data-testid="swap-screen" style={container}>
        <StateBlock tone="empty" {...state} />
      </div>
    );
  }

  const caret = <CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />;
  const mark = (token: typeof logic.pay.token) => (
    <TokenLogo uri={token?.logo || undefined} symbol={token?.symbol} size={38} borderRadius={19} />
  );

  return (
    <div data-testid="swap-screen" style={container}>
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
      <ChipGroup {...view.shortcutChips} />

      <SectionLabel variant="caps">{view.receiveLabel}</SectionLabel>
      <ListRow {...view.receiveRow} leading={mark(logic.receive.token)} trailing={caret} />

      {view.errorText && <WarningNotice tone="error" title={view.errorText} testID="swap-error" />}

      <div style={{ paddingTop: spacing.sm }}>
        <PrimaryButton {...view.submitButton}>{view.submitLabel}</PrimaryButton>
      </div>

      <TokenPickerSheet {...view.payPicker} />
      <TokenPickerSheet {...view.receivePicker} />
    </div>
  );
}
