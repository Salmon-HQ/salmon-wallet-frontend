/**
 * HomeTabOrderSheet — where the user arranges Home's sub-tabs, on the DOM.
 *
 * The mobile twin is
 * `apps/mobile/src/components/HomeTabOrderSheet/HomeTabOrderSheet.tsx`: one
 * state, so it is a sheet and not a screen (DESIGN.md §Sheets), a list of the
 * tabs Home currently offers, and no Save — the new order is reported as each
 * row is dropped and Home re-flows behind the sheet.
 *
 * Mobile drags with `react-native-gesture-handler`. Here the drag is Pointer
 * Events (spec 028, DOM alternatives): press the grip, move, drop. The rows
 * between the origin and the target make room by exactly one stride on the
 * `drift` beat, which reduce motion collapses to a snap.
 *
 * A drag is not the only way in. Each grip is a real `<button>` that answers
 * `ArrowUp`/`ArrowDown` (and `Home`/`End`) by moving its row one place — the
 * keyboard fallback the brief requires, and the only route a screen reader or
 * a switch user has. Nothing here is a list library: the set is two rows today
 * and a handful once powerups add theirs.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  motionEasing,
  motionMs,
  shadowsCSS,
  spacing,
  type HomeTabOrderTab,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { DotsSixVerticalIcon, iconSize } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { ListRow } from '../ListRow';
import type { HomeTabOrderSheetProps } from './types';

/** The component gap (DESIGN.md §Layout): 20 between one row and the next. */
const ROW_GAP = spacing.xl;

/** Where a row dragged by `dragY` from `from` would land. */
function resolveTargetIndex(from: number, dragY: number, stride: number, count: number): number {
  if (stride <= 0) return from;
  const raw = from + Math.round(dragY / stride);
  return Math.min(Math.max(raw, 0), count - 1);
}

/** The list with `from` moved to `to`. Never mutates the array it is given. */
function moved(keys: readonly string[], from: number, to: number): string[] {
  const next = [...keys];
  const [key] = next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}

interface DragState {
  index: number;
  dragY: number;
  stride: number;
}

export function HomeTabOrderSheet({
  visible,
  onClose,
  tabs,
  onOrderChange,
  style,
  className,
  testID = 'home-tab-order-sheet',
}: HomeTabOrderSheetProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const reducedMotion = useReducedMotion();

  const [drag, setDrag] = useState<DragState | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const keys = tabs.map((tab) => tab.key);
  const count = tabs.length;

  const reorder = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to > count - 1) return;
      onOrderChange(moved(keys, from, to));
    },
    [keys, count, onOrderChange]
  );

  const handlePointerDown = useCallback(
    (index: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      // One row's measured height plus the component gap is the whole drag's
      // arithmetic: the stride every row makes room by.
      const height = rowRefs.current[index]?.getBoundingClientRect?.().height ?? 0;
      const stride = height > 0 ? height + ROW_GAP : 0;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDrag({ index, dragY: 0, stride });
    },
    []
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    setDrag((current) =>
      current ? { ...current, dragY: current.dragY + event.movementY } : current
    );
  }, []);

  const handlePointerUp = useCallback(() => {
    setDrag((current) => {
      if (current) {
        const to = resolveTargetIndex(current.index, current.dragY, current.stride, count);
        // The list re-renders in its new order, so the offsets that described
        // the drag have to be gone by the time it does.
        if (to !== current.index) reorder(current.index, to);
      }
      return null;
    });
  }, [count, reorder]);

  const handleKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowUp') reorder(index, index - 1);
      else if (event.key === 'ArrowDown') reorder(index, index + 1);
      else if (event.key === 'Home') reorder(index, 0);
      else if (event.key === 'End') reorder(index, count - 1);
      else return;
      event.preventDefault();
    },
    [count, reorder]
  );

  /** How far a row that is not the dragged one has to move out of the way. */
  const offsetFor = (index: number): number => {
    if (!drag) return 0;
    if (drag.index === index) return drag.dragY;
    const to = resolveTargetIndex(drag.index, drag.dragY, drag.stride, count);
    if (drag.index < index && index <= to) return -drag.stride;
    if (to <= index && index < drag.index) return drag.stride;
    return 0;
  };

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<SheetTitle>{t('home.tabs.order.title', 'Arrange tabs')}</SheetTitle>}
      testID={testID}
      style={style}
      className={className}
    >
      <div
        style={{
          paddingTop: spacing.md,
          paddingBottom: spacing['2xl'],
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xl,
        }}
      >
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
          {t('home.tabs.order.hint', 'Drag to change the order.')}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {tabs.map((tab: HomeTabOrderTab, index) => {
            const isDragged = drag?.index === index;
            const rowTestID = `home-tab-order-row-${tab.key}`;
            return (
              <div
                key={tab.key}
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                data-testid={`${rowTestID}-slot`}
                style={{
                  transform: `translateY(${offsetFor(index)}px)`,
                  zIndex: isDragged ? 1 : 0,
                  transition:
                    reducedMotion || isDragged
                      ? undefined
                      : `transform ${motionMs.drift}ms ${motionEasing.settle.css}`,
                }}
              >
                <ListRow
                  testID={rowTestID}
                  leading={null}
                  title={tab.label}
                  accessibilityLabel={tab.label}
                  // The lift: the dragged row leaves the membrane for the
                  // opaque raised surface and casts the card ambient, so it
                  // reads as picked up rather than as the same row somewhere
                  // unexpected.
                  style={
                    isDragged
                      ? {
                          backgroundColor: semantic.surface.raised,
                          boxShadow: shadowsCSS.cardAmbient,
                        }
                      : undefined
                  }
                  trailing={
                    <button
                      type="button"
                      data-testid={`${rowTestID}-handle`}
                      aria-label={t('home.tabs.order.handle', 'Reorder {{tab}}', {
                        tab: tab.label,
                      })}
                      onPointerDown={handlePointerDown(index)}
                      onPointerMove={isDragged ? handlePointerMove : undefined}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onKeyDown={handleKeyDown(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        // A grip needs a target, and 12 around a 20pt glyph
                        // clears the 44pt minimum without inflating the row.
                        padding: spacing.md,
                        display: 'inline-flex',
                        cursor: 'grab',
                        touchAction: 'none',
                      }}
                    >
                      <DotsSixVerticalIcon size={iconSize.md} color={semantic.text.tertiary} />
                    </button>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheetContainer>
  );
}
