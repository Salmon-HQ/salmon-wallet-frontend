/**
 * DerivedAccountsSheet — "we found these; which do you want?"
 *
 * The scan behind it is `packages/shared`'s; this is the question it raises,
 * drawn once over Home. Every find arrives checked, because a funded path is
 * almost always the user's own money and unchecking is cheaper than hunting
 * for the same accounts by hand — but nothing is added until they say so
 * (spec 025, owner 2026-09-02).
 *
 * No derivation index appears here. A user reads wallets by name; the index is
 * how the app finds the key, not how a person identifies an account.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  getInitials,
  getShortAddress,
  lineHeight,
  ms,
  s,
  spacing,
  tabularNums,
  useAccountsContext,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { CheckIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { StateBlock } from '../StateBlock';
import type { DerivedAccountsSheetProps } from './types';

/** The leading well on a find, the same step every settings row carries. */
const ROW_BUBBLE_SIZE = 40;

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so this copy is what satisfies the style typing.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

export function DerivedAccountsSheet({
  visible,
  finds,
  onImport,
  onDismiss,
  style,
  testID = 'derived-accounts-sheet',
}: DerivedAccountsSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { standardContentBottomPadding } = useBottomSheetChrome();
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
    >
      <View style={[styles.content, { paddingBottom: standardContentBottomPadding }]}>
        {rows.length === 0 ? (
          <StateBlock
            tone="empty"
            testID={`${testID}-empty`}
            title={t('wallet.derived.none_new_title')}
            body={t('wallet.derived.none_new_body')}
          />
        ) : (
          <>
            <Text style={styles.hint}>{t('wallet.derived.found_body')}</Text>

            <View style={styles.list}>
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
                      <Text style={styles.balance}>
                        {balanceFormatted}
                        {` · ${getShortAddress(address) ?? address}`}
                      </Text>
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
            </View>

            <View style={styles.actions}>
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
            </View>
          </>
        )}
      </View>
    </BottomSheetContainer>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      // The component gap (DESIGN.md §Layout): 20 between sibling blocks.
      gap: vs(spacing.xl),
    },
    hint: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
      textAlign: 'center',
    },
    list: {
      gap: vs(spacing.md),
    },
    actions: {
      gap: vs(spacing.md),
    },
    // `ListRow` draws a string subtitle in this same body/secondary style; the
    // balance needs the Tabular Rule, which the row's own subtitle text does
    // not carry.
    balance: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.medium,
      fontSize: ms(fontSize.body),
      ...TABULAR,
    },
  });

export default DerivedAccountsSheet;
