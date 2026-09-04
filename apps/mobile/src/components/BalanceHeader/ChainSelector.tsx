/**
 * ChainSelector — the balance block's chain switcher.
 *
 * Sits where the "Total balance" label used to: a plain trigger reading the
 * active chain and its environment ("Solana · Devnet") with a chevron and an
 * accent underline in the chain's own hue — the same selection language
 * `UnderlineTabs` uses for lateral choices, just not sliding (DESIGN.md
 * §Chain identity). No box, no chip. Tapping it opens a sheet listing every
 * chain the balance block already pages through; the swipe gesture on the
 * amount (`BalanceHeader`'s own `panGesture`) keeps working exactly as it did
 * — this is an alternate route to the same `onSelect`, not a replacement.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  type BlockchainBalance,
  componentSizes,
  fontFamilyNative,
  fontSize,
  getChainSelectorOptions,
  getChainSelectorTrigger,
  ms,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { CaretDownIcon, CheckIcon } from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { ListRow } from '../ListRow';

const TOUCH_TARGET_MIN = 44;
const CHEVRON_SIZE = ms(componentSizes.iconSizeXxs);
const UNDERLINE_HEIGHT = 2;

interface ChainSelectorProps {
  blockchains: BlockchainBalance[];
  activeIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  blockchains,
  activeIndex,
  onSelect,
  testID = 'balance-chain-selector',
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { chain, accent } = useSemantic();
  const { standardContentBottomPadding } = useBottomSheetChrome();
  const [open, setOpen] = useState(false);

  const info = getChainSelectorTrigger(blockchains, activeIndex);
  if (!info) return null;
  const ink = chain.hintInk[info.blockchain];
  const trigger = (
    <View style={styles.trigger}>
      <View style={styles.triggerRow}>
        <Text style={styles.label} numberOfLines={1}>
          {info.label}
        </Text>
        {info.canSwitch && <CaretDownIcon size={CHEVRON_SIZE} color={ink} weight="bold" />}
      </View>
      <View style={[styles.underline, { backgroundColor: ink }]} />
    </View>
  );

  if (!info.canSwitch) return trigger;

  return (
    <>
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        hitSlop={{
          top: (TOUCH_TARGET_MIN - ms(fontSize.caption)) / 2,
          bottom: (TOUCH_TARGET_MIN - ms(fontSize.caption)) / 2,
          left: s(spacing.xs),
          right: s(spacing.xs),
        }}
        accessibilityRole="button"
        accessibilityLabel={t('home.switch_network', 'Switch network')}
      >
        {trigger}
      </Pressable>
      <BottomSheetContainer
        visible={open}
        onClose={() => setOpen(false)}
        title={<SheetTitle>{t('home.switch_network', 'Switch network')}</SheetTitle>}
        testID={`${testID}-sheet`}
      >
        <View style={[styles.list, { paddingBottom: standardContentBottomPadding }]}>
          {getChainSelectorOptions(blockchains).map((option) => {
            const isActive = option.index === activeIndex;
            return (
              <ListRow
                key={option.id}
                testID={`${testID}-option-${option.index}`}
                title={option.name}
                subtitle={option.networkLabel ?? undefined}
                accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                  name: option.name,
                })}
                leading={
                  <View
                    style={[styles.optionDot, { backgroundColor: chain.hintInk[option.blockchain] }]}
                  />
                }
                trailing={
                  isActive ? (
                    <CheckIcon size={ms(componentSizes.iconSizeXs)} color={accent.fill} />
                  ) : undefined
                }
                onPress={() => {
                  setOpen(false);
                  if (!isActive) onSelect(option.index);
                }}
              />
            );
          })}
        </View>
      </BottomSheetContainer>
    </>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    trigger: {
      alignSelf: 'flex-start',
      gap: vs(spacing.xxs),
    },
    triggerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xxs),
    },
    label: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
    underline: {
      alignSelf: 'stretch',
      height: UNDERLINE_HEIGHT,
      borderRadius: UNDERLINE_HEIGHT / 2,
    },
    list: {
      gap: vs(spacing.xs),
    },
    optionDot: {
      width: componentSizes.iconSizeXxsm,
      height: componentSizes.iconSizeXxsm,
      borderRadius: componentSizes.iconSizeXxsm / 2,
    },
  });

export default ChainSelector;
