/**
 * What the four approval views share that the kit does not already carry:
 * two typography styles, the card's head row and the signing account card.
 * Everything else the gate draws is a kit piece — `OnboardingLayout` on
 * bedrock, `Card`, `ListRow`, `KeyValueRow`, `SectionLabel`, `WarningNotice`,
 * the buttons.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  fontWeight,
  getShortAddress,
  lineHeight,
  spacing,
  type Semantic,
  type SigningAccount,
} from '@salmon/shared';

import { WalletIcon, iconSize } from '../../icons';
import type { IconComponent } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { visuallyHidden } from '../../utils/visuallyHidden';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import type { ApprovalArming } from './useApprovalArming';

/** Body copy: a hint under a card's fields, a note over the hold. */
export const bodyText = (t: Semantic): React.CSSProperties => ({
  margin: 0,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
  lineHeight: `${fontSize.body * lineHeight.normal}px`,
  color: t.text.secondary,
  overflowWrap: 'anywhere',
});

/** Verbatim signing content — the scanning face, wrapped, never clipped. */
export const monoText = (t: Semantic): React.CSSProperties => ({
  margin: 0,
  fontFamily: fontFamily.mono,
  fontSize: fontSize.mono,
  fontWeight: fontWeight.regular,
  lineHeight: `${fontSize.mono * lineHeight.relaxed}px`,
  color: t.text.primary,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

/** The head row of every approval card: a glyph and the group label. */
export function CardHead({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  const t = useSemantic();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <Icon size={iconSize.sm} color={t.text.secondary} />
      <SectionLabel variant="group">{label}</SectionLabel>
    </div>
  );
}

/** A card's column: the kit `Card` takes a gap, this is the direction. */
export const cardColumn: React.CSSProperties = { flexDirection: 'column' };

/** The account a signature comes from, by name and short address. */
export function SigningAccountCard({ account }: { account: SigningAccount }) {
  const { t } = useTranslation();
  return (
    <Card padding="lg" gap={spacing.md} style={cardColumn}>
      <CardHead icon={WalletIcon} label={t('dapp.wallet_address', 'Wallet')} />
      <KeyValueRow
        label={account.name || t('dapp.current_wallet', 'Current wallet')}
        value={getShortAddress(account.address, 4) ?? account.address}
        valueFont="mono"
        testID="signing-account"
      />
    </Card>
  );
}

/**
 * Wraps Approve with the arming handlers, and, while Approve waits, the hint
 * its `aria-describedby` names. It draws no box of its own, so the layout
 * around the button is unchanged.
 */
export function ApproveArea({
  arming,
  children,
}: {
  arming: ApprovalArming;
  children: React.ReactNode;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <span style={{ display: 'contents' }} {...arming.handlers}>
      {children}
      {arming.armed ? null : (
        <span id={arming.hintId} style={visuallyHidden}>
          {t(
            'dapp.approve_arming_hint',
            'To turn this button on, move the pointer onto it or move the keyboard focus.'
          )}
        </span>
      )}
    </span>
  );
}
