/**
 * ChainSelector — the balance block's chain switcher.
 *
 * Sits where the "Total balance" label used to: a plain trigger reading the
 * active chain and its environment ("Solana Devnet" — `NETWORK_DISPLAY`'s
 * name already carries the environment, so this never appends a second tag)
 * with a chevron and an accent underline in the chain's own hue under the
 * name only, not the chevron — the same selection language `UnderlineTabs`
 * uses for lateral choices, just not sliding (DESIGN.md §Chain identity).
 * No box, no chip.
 *
 * Tapping it opens a dropdown anchored to the trigger itself — not a sheet:
 * a `Modal` measures the trigger's window position on open and positions the
 * option list right under it, closing on a tap outside or a selection. The
 * swipe gesture on the amount (`BalanceHeader`'s own `panGesture`) keeps
 * working exactly as it did; this is an alternate route to the same
 * `onSelect`, not a replacement.
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  type BlockchainBalance,
  componentSizes,
  fontFamilyNative,
  fontSize,
  getChainSelectorOptions,
  getChainSelectorTrigger,
  ms,
  s,
  shadows,
  singleScale,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { CaretDownIcon, CheckIcon } from '../../icons';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../Card';
import { ListRow } from '../ListRow';

const TOUCH_TARGET_MIN = 44;
const CHEVRON_SIZE = ms(componentSizes.iconSizeXs);
const UNDERLINE_HEIGHT = 2;
/** Gap between the trigger's bottom edge and the dropdown. */
const DROPDOWN_OFFSET = s(spacing.xs);
const DROPDOWN_WIDTH = 220;
/** The row marker: one scale from the seigaiha motif, wide-stroked rather
 * than filled, at the trigger's own aspect ratio. */
const SCALE_WIDTH = ms(componentSizes.iconSizeXSmall);
const SCALE_HEIGHT = ms(componentSizes.iconSizeXSmall * (singleScale.height / singleScale.width));
const SCALE_STROKE_WIDTH = 5;

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
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number } | null>(null);

  const info = getChainSelectorTrigger(blockchains, activeIndex);
  if (!info) return null;
  const ink = chain.hintInk[info.blockchain];
  const trigger = (
    <View style={styles.trigger}>
      <View style={styles.triggerRow}>
        <View style={styles.nameColumn}>
          <Text style={styles.label} numberOfLines={1}>
            {info.label}
          </Text>
          <View style={[styles.underline, { backgroundColor: ink }]} />
        </View>
        {info.canSwitch && <CaretDownIcon size={CHEVRON_SIZE} color={ink} weight="bold" />}
      </View>
    </View>
  );

  if (!info.canSwitch) return trigger;

  const open = anchor !== null;
  const close = () => setAnchor(null);

  return (
    <>
      <Pressable
        ref={triggerRef}
        testID={testID}
        onPress={() => {
          triggerRef.current?.measureInWindow((x, y, _width, height) => {
            setAnchor({ x, y, height });
          });
        }}
        hitSlop={{
          top: (TOUCH_TARGET_MIN - ms(fontSize.body)) / 2,
          bottom: (TOUCH_TARGET_MIN - ms(fontSize.body)) / 2,
          left: s(spacing.xs),
          right: s(spacing.xs),
        }}
        accessibilityRole="button"
        accessibilityLabel={t('home.switch_network', 'Switch network')}
        accessibilityState={{ expanded: open }}
      >
        {trigger}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          testID={`${testID}-backdrop`}
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel={t('home.switch_network', 'Switch network')}
        />
        {anchor && (
          <Card
            testID={`${testID}-dropdown`}
            tone="surface"
            padding="sm"
            gap={spacing.sm}
            style={[
              styles.dropdown,
              shadows.sm,
              { top: anchor.y + anchor.height + DROPDOWN_OFFSET, left: anchor.x },
            ]}
          >
            {getChainSelectorOptions(blockchains).map((option) => {
              const isActive = option.index === activeIndex;
              return (
                <ListRow
                  key={option.id}
                  testID={`${testID}-option-${option.index}`}
                  title={option.name}
                  accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                    name: option.name,
                  })}
                  leading={
                    <Svg
                      width={SCALE_WIDTH}
                      height={SCALE_HEIGHT}
                      viewBox={`0 0 ${singleScale.width} ${singleScale.height}`}
                    >
                      <Path
                        d={singleScale.path}
                        stroke={chain.hintInk[option.blockchain]}
                        strokeWidth={SCALE_STROKE_WIDTH}
                        fill="none"
                      />
                    </Svg>
                  }
                  trailing={
                    isActive ? (
                      <CheckIcon size={ms(componentSizes.iconSizeXs)} color={accent.fill} />
                    ) : undefined
                  }
                  padding="md"
                  onPress={() => {
                    close();
                    if (!isActive) onSelect(option.index);
                  }}
                />
              );
            })}
          </Card>
        )}
      </Modal>
    </>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    trigger: {
      alignSelf: 'flex-start',
    },
    triggerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xxs),
    },
    // The underline lives in this column, not the row: `alignSelf: 'stretch'`
    // then matches only the name's width, never the chevron beside it.
    nameColumn: {
      alignItems: 'stretch',
      gap: vs(spacing.xxs),
    },
    label: {
      fontSize: ms(fontSize.body),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
    underline: {
      alignSelf: 'stretch',
      height: UNDERLINE_HEIGHT,
      borderRadius: UNDERLINE_HEIGHT / 2,
    },
    dropdown: {
      position: 'absolute',
      width: DROPDOWN_WIDTH,
    },
  });

export default ChainSelector;
