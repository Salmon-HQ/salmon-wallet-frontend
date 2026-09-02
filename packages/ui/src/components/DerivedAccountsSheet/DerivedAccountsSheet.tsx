/**
 * DerivedAccountsSheet — "we found these; which do you want?", on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/DerivedAccountsSheet/DerivedAccountsSheet.tsx`
 * and the question, the copy and the anatomy are the same, read from the same
 * `DerivedAccountsSheetPropsBase` contract. The scan behind it is
 * `packages/shared`'s; this is only the question it raises, drawn once over
 * Home.
 *
 * Every find arrives checked, because a funded path is almost always the
 * user's own money and unchecking is cheaper than hunting for the same
 * accounts by hand — but nothing is added until they say so. No derivation
 * index appears: a user reads wallets by name.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  getInitials,
  getShortAddress,
  lineHeight,
  spacing,
  tabularNums,
  useAccountsContext,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { StateBlock } from '../StateBlock';
import type { DerivedAccountsSheetProps } from './types';

/** The leading well on a find, the same step every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

export function DerivedAccountsSheet({
  visible,
  finds,
  onImport,
  onDismiss,
  style,
  className,
  testID = 'derived-accounts-sheet',
}: DerivedAccountsSheetProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [{ accounts }] = useAccountsContext();

  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => {
    setChecked(finds.map(({ index }) => index));
  }, [finds]);

  // The names these wallets would get — the same names the add-account panel
  // hands a new account, in the order they would be created.
  const rows = useMemo(
    () =>
      finds.map((find, position) => ({
        ...find,
        name: t('settings.account_add.default_name', { number: accounts.length + 1 + position }),
      })),
    [finds, accounts.length, t]
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onDismiss}
      title={<SheetTitle>{t('wallet.derived.found_title', { count: finds.length })}</SheetTitle>}
      testID={testID}
      style={style}
      className={className}
    >
      <div
        style={{
          paddingLeft: spacing.screenGutter,
          paddingRight: spacing.screenGutter,
          paddingTop: spacing.md,
          paddingBottom: spacing['2xl'],
          display: 'flex',
          flexDirection: 'column',
          // The component gap (DESIGN.md §Layout): 20 between sibling blocks.
          gap: spacing.xl,
        }}
      >
        {rows.length === 0 ? (
          <StateBlock
            tone="empty"
            testID={`${testID}-empty`}
            title={t('wallet.derived.none_new_title')}
            body={t('wallet.derived.none_new_body')}
          />
        ) : (
          <>
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.medium,
                fontSize: fontSize.body,
                lineHeight: `${fontSize.body * lineHeight.snug}px`,
                color: semantic.text.secondary,
                textAlign: 'center',
              }}
            >
              {t('wallet.derived.found_body')}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {rows.map(({ index, address, balanceFormatted, name }) => {
                const isChecked = checked.includes(index);
                return (
                  <ListRow
                    key={index}
                    testID={`${testID}-row-${index}`}
                    title={name}
                    accessibilityLabel={
                      isChecked
                        ? t('wallet.derived.skip_a11y', { name })
                        : t('wallet.derived.add_a11y', { name })
                    }
                    onPress={() =>
                      setChecked((current) =>
                        current.includes(index)
                          ? current.filter((value) => value !== index)
                          : [...current, index]
                      )
                    }
                    leading={
                      <IconBubble size={ROW_BUBBLE_SIZE} shape="circle" tone="accent-tint">
                        {getInitials(name)}
                      </IconBubble>
                    }
                    subtitle={
                      // `ListRow` draws a string subtitle in this same
                      // body/secondary style; the balance needs the Tabular
                      // Rule, which the row's own subtitle text does not carry.
                      <span
                        style={{
                          fontFamily: fontFamily.sans,
                          fontWeight: fontWeight.medium,
                          fontSize: fontSize.body,
                          color: semantic.text.secondary,
                          ...tabularNums.css,
                        }}
                      >
                        {`${balanceFormatted} · ${getShortAddress(address) ?? address}`}
                      </span>
                    }
                    // The selection mark the derive-scan step already uses: a
                    // filled accent well when taken, an empty surface one when
                    // not — the kit's bubble, not a second checkbox.
                    trailing={
                      <IconBubble
                        testID={`${testID}-check-${index}`}
                        size={componentSizes.checkboxSize}
                        shape="rounded"
                        radius="lg"
                        tone={isChecked ? 'accent' : 'surface'}
                        icon={isChecked ? CheckIcon : undefined}
                        iconSize={iconSize.sm}
                        iconColor={isChecked ? semantic.accent.onFill : undefined}
                      />
                    }
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <PrimaryButton
                testID={`${testID}-import`}
                disabled={checked.length === 0}
                onPress={() => onImport(checked)}
              >
                {t('wallet.derived.import_count', { count: checked.length })}
              </PrimaryButton>
              <SecondaryButton testID={`${testID}-dismiss`} onPress={onDismiss}>
                {t('wallet.derived.not_now')}
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </BottomSheetContainer>
  );
}
