/**
 * HomeTabOrderSheet — where the user arranges Home's sub-tabs.
 *
 * One state, so it is a sheet and not a screen (DESIGN.md §Sheets): a list of
 * the tabs Home currently offers, each with a drag handle, and nothing a
 * second tap can turn into another surface. Order only — hiding a tab is a
 * separate decision, so no copy here promises it.
 *
 * There is no Save. The new order is reported as each row is dropped, Home
 * re-flows behind the sheet, and the arrangement is already persisted by the
 * time the handle or the backdrop dismisses it.
 *
 * The drag is arithmetic on one stride — a row's measured height plus the
 * component gap. The dragged row follows the finger; every row between its
 * origin and its target makes room by exactly one stride on the `drift` beat,
 * which reduce motion collapses to a snap. Nothing here is a list library:
 * the set is two rows today and a handful once powerups add theirs.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  motionMs,
  s,
  shadows,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { timing } from '../../utils/motion';
import { DotsSixVerticalIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { ListRow } from '../ListRow';
import type { HomeTabOrderSheetProps } from './types';

/** The component gap (DESIGN.md §Layout): 20 between one row and the next. */
const ROW_GAP = spacing.xl;

/**
 * Where a row dragged by `dragY` from `from` would land.
 *
 * Shared by every row's animated style: the row being dragged reads it to know
 * nothing, the others read it to know whether they are inside the span the
 * drag has crossed and must therefore make room.
 */
function resolveTargetIndex(from: number, dragY: number, stride: number, count: number): number {
  'worklet';
  if (stride <= 0) return from;
  const raw = from + Math.round(dragY / stride);
  return Math.min(Math.max(raw, 0), count - 1);
}

interface TabOrderRowProps {
  index: number;
  count: number;
  label: string;
  handleLabel: string;
  isDragged: boolean;
  isReduceMotionEnabled: boolean;
  activeIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  stride: SharedValue<number>;
  onMeasure: (height: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (from: number, to: number) => void;
  testID: string;
}

const TabOrderRow: React.FC<TabOrderRowProps> = ({
  index,
  count,
  label,
  handleLabel,
  isDragged,
  isReduceMotionEnabled,
  activeIndex,
  dragY,
  stride,
  onMeasure,
  onDragStart,
  onDrop,
  testID,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const shiftTiming = useMemo(
    () => timing(motionMs.drift, isReduceMotionEnabled),
    [isReduceMotionEnabled]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onMeasure(event.nativeEvent.layout.height),
    [onMeasure]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          activeIndex.value = index;
          dragY.value = 0;
          runOnJS(onDragStart)(index);
        })
        .onUpdate((event) => {
          dragY.value = event.translationY;
        })
        .onEnd(() => {
          const to = resolveTargetIndex(index, dragY.value, stride.value, count);
          runOnJS(onDrop)(index, to);
        })
        .onFinalize(() => {
          // The list re-renders in its new order, so the offsets that
          // described the drag have to be gone by the time it does.
          activeIndex.value = -1;
          dragY.value = 0;
          runOnJS(onDragStart)(-1);
        }),
    [index, count, activeIndex, dragY, stride, onDragStart, onDrop]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    if (active === -1) return { transform: [{ translateY: 0 }], zIndex: 0 };
    if (active === index) return { transform: [{ translateY: dragY.value }], zIndex: 1 };

    const to = resolveTargetIndex(active, dragY.value, stride.value, count);
    let shift = 0;
    if (active < index && index <= to) shift = -stride.value;
    else if (to <= index && index < active) shift = stride.value;

    return { transform: [{ translateY: withTiming(shift, shiftTiming) }], zIndex: 0 };
  });

  return (
    <Animated.View testID={`${testID}-slot`} style={animatedStyle} onLayout={handleLayout}>
      <ListRow
        testID={testID}
        leading={null}
        title={label}
        accessibilityLabel={label}
        // The lift: the dragged row leaves the membrane for the opaque raised
        // surface and casts the card ambient, so it reads as picked up rather
        // than as the same row somewhere unexpected.
        style={isDragged ? styles.lifted : undefined}
        trailing={
          <GestureDetector gesture={pan}>
            <View
              style={styles.handle}
              accessibilityRole="adjustable"
              accessibilityLabel={handleLabel}
              testID={`${testID}-handle`}
            >
              <DotsSixVerticalIcon size={iconSize.md} color={text.tertiary} />
            </View>
          </GestureDetector>
        }
      />
    </Animated.View>
  );
};

export const HomeTabOrderSheet: React.FC<HomeTabOrderSheetProps> = ({
  visible,
  onClose,
  tabs,
  onOrderChange,
  style,
  testID = 'home-tab-order-sheet',
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const isReduceMotionEnabled = useReducedMotion();
  const { standardContentBottomPadding } = useBottomSheetChrome();

  const [rowHeight, setRowHeight] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(-1);

  const activeIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const stride = useSharedValue(0);

  useEffect(() => {
    stride.value = rowHeight > 0 ? rowHeight + vs(ROW_GAP) : 0;
  }, [rowHeight, stride]);

  const handleMeasure = useCallback((height: number) => {
    setRowHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handleDrop = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const keys = tabs.map((tab) => tab.key);
      const [moved] = keys.splice(from, 1);
      keys.splice(to, 0, moved);
      onOrderChange(keys);
    },
    [tabs, onOrderChange]
  );

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{t('home.tabs.order.title', 'Arrange tabs')}</SheetTitle>}
      testID={testID}
      style={style}
    >
      <View style={[styles.content, { paddingBottom: standardContentBottomPadding }]}>
        <Text style={styles.hint} maxFontSizeMultiplier={fontScaleCap.chrome}>
          {t('home.tabs.order.hint', 'Drag to change the order.')}
        </Text>

        <View style={styles.list}>
          {tabs.map((tab, index) => (
            <TabOrderRow
              key={tab.key}
              index={index}
              count={tabs.length}
              label={tab.label}
              handleLabel={t('home.tabs.order.handle', 'Reorder {{tab}}', { tab: tab.label })}
              isDragged={draggedIndex === index}
              isReduceMotionEnabled={isReduceMotionEnabled}
              activeIndex={activeIndex}
              dragY={dragY}
              stride={stride}
              onMeasure={handleMeasure}
              onDragStart={setDraggedIndex}
              onDrop={handleDrop}
              testID={`home-tab-order-row-${tab.key}`}
            />
          ))}
        </View>
      </View>
    </BottomSheetContainer>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
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
      gap: vs(ROW_GAP),
    },
    lifted: {
      backgroundColor: t.surface.raised,
      ...shadows.card,
    },
    handle: {
      // A grip needs a target, and 12 around a 20pt glyph clears the 44pt
      // minimum without inflating the row.
      padding: s(spacing.md),
    },
  });

export default HomeTabOrderSheet;
