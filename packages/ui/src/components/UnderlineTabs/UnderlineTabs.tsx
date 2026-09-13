/**
 * UnderlineTabs — the product's one selection language for lateral choices,
 * on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/UnderlineTabs/UnderlineTabs.tsx`:
 * a horizontal set of mutually exclusive options, the selected one carrying an
 * accent underline that slides from the previous option to the new one. Here
 * the travel is drawn with the Web Animations API instead of Reanimated,
 * driven by the same `motionMs.drift` duration and `motionEasing.current`
 * curve, collapsed under `useReducedMotion()`.
 *
 * **One scroller, always.** Unlike mobile's static-row-vs-ScrollView split,
 * the DOM twin never swaps DOM shapes: the tab row always sits inside a
 * horizontal scroller. A `ResizeObserver` compares the scroller's own width
 * against its content's, and only *enables* scrolling (and shows the trailing
 * fade) once the content overruns the scroller — never mounts a second tree.
 *
 * Keyboard: `role="tablist"` / `role="tab"`, roving tabindex, ArrowLeft /
 * ArrowRight move and select, Home / End jump to the ends. A horizontal wheel
 * (`deltaX`, or a vertical wheel held with Shift) scrolls the row directly,
 * since a bare vertical wheel over a horizontal-only scroller does nothing on
 * most platforms.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  motionEasing,
  motionMs,
  resolveMotionMs,
  spacing,
  withAlpha,
  type Semantic,
  overflowEdges,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { CaretLeftIcon, CaretRightIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import type { UnderlineTab, UnderlineTabsProps, UnderlineTabsSize } from './types';

const UNDERLINE_HEIGHT = 2;
/** What the row keeps under its labels for the sliding underline. */
const UNDERLINE_RESERVE = spacing.xxs + UNDERLINE_HEIGHT;
/**
 * The cut at an edge that still hides tabs. A hard edge reads as the end of
 * the set; a fade reads as "there is more this way". Longer here than on the
 * mobile twin for one reason: on the DOM it straddles the arrow's gutter and
 * the content beyond it, so the chevron stands on its own ground while the
 * tabs still fade as they leave.
 */
const OVERFLOW_FADE_WIDTH = componentSizes.iconBubbleSm + spacing.md;
/** How much of the previous tab stays visible when one is scrolled into view. */
const SCROLL_INTO_VIEW_MARGIN = spacing.md;
/** Sub-pixel slack before a row counts as overrunning its container, px. */
const OVERFLOW_TOLERANCE = 1;
/**
 * Hover-only scroll arrows: the kit's own well at the size `PortfolioSubTabs`'
 * order button already wears beside this row, with the glyph size that call
 * site pairs it with. They are a pointer convenience — the keyboard moves
 * through the tabs with the roving tabindex below — so the well is
 * `decorative`: out of the accessibility tree and out of the tab order.
 */
const SCROLL_ARROW_SIZE = componentSizes.iconBubbleSm;
/**
 * The ground each arrow stands on. While the row overruns, the scroller is
 * held this far in from both edges, so a tab can never travel under an arrow
 * and a chevron never covers something the user meant to press.
 */
const SCROLL_ARROW_GUTTER = componentSizes.iconBubbleSm;
const SCROLL_ARROW_ICON_SIZE = componentSizes.iconSizeXSmall;
/** A click moves about two thirds of the visible row — enough to feel
 * purposeful without jumping past the neighboring tabs. */
const SCROLL_STEP_RATIO = 2 / 3;

type SizeMetrics = { font: number; gap: number; uppercase: boolean; letterSpacing: number };

const SIZES: Record<UnderlineTabsSize, SizeMetrics> = {
  md: { font: fontSize.bodyLg, gap: spacing.xl, uppercase: false, letterSpacing: 0 },
  sm: {
    font: fontSize.caption,
    gap: spacing.md,
    uppercase: true,
    letterSpacing: letterSpacing.label,
  },
};

export function UnderlineTabs({
  tabs,
  activeKey,
  onChange,
  size = 'md',
  tabTestIDPrefix,
  underlineTestID,
  style,
  className,
  testID,
}: UnderlineTabsProps) {
  const t: Semantic = useSemantic();
  const isReduceMotionEnabled = useReducedMotion();
  const metrics = SIZES[size];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [isOverflowing, setIsOverflowing] = useState(false);
  const [edges, setEdges] = useState({ leading: false, trailing: false });
  const [isHovered, setIsHovered] = useState(false);
  const hasMeasuredActive = useRef(false);
  const [focusedKey, setFocusedKey] = useState(activeKey);

  useEffect(() => {
    setFocusedKey(activeKey);
  }, [activeKey]);

  // One scroller, always: only its `scrollEnabled`-equivalent (overflowX) and
  // the trailing fade react to the measurement, never the DOM shape.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const row = rowRef.current;
    if (!scroller || !row || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const overrun = row.scrollWidth > scroller.clientWidth + OVERFLOW_TOLERANCE;
      setIsOverflowing((prev) => (prev === overrun ? prev : overrun));
      // A fade only where content is hidden: none at the start while the
      // row rests on its first tab, none at the end once the last is in view.
      const next = overflowEdges({
        offset: scroller.scrollLeft,
        contentWidth: row.scrollWidth,
        containerWidth: scroller.clientWidth,
        tolerance: OVERFLOW_TOLERANCE,
      });
      setEdges((prev) =>
        prev.leading === next.leading && prev.trailing === next.trailing ? prev : next
      );
    };
    scroller.addEventListener('scroll', measure, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(row);
    measure();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', measure);
    };
  }, [tabs.length]);

  // The travelling underline: measured off the active tab's own box each time
  // the selection or the layout changes, animated with WAAPI on the same
  // curve mobile drives with Reanimated.
  useLayoutEffect(() => {
    const underline = underlineRef.current;
    const row = rowRef.current;
    const activeTab = tabRefs.current.get(activeKey);
    if (!underline || !row || !activeTab) return;

    const rowBox = row.getBoundingClientRect();
    const tabBox = activeTab.getBoundingClientRect();
    const x = tabBox.left - rowBox.left;
    const width = tabBox.width;

    if (!hasMeasuredActive.current) {
      underline.style.transform = `translateX(${x}px)`;
      underline.style.width = `${width}px`;
      hasMeasuredActive.current = true;
      return;
    }

    if (typeof underline.animate !== 'function') {
      underline.style.transform = `translateX(${x}px)`;
      underline.style.width = `${width}px`;
      return;
    }

    const duration = resolveMotionMs(motionMs.drift, isReduceMotionEnabled);
    underline
      .animate(
        [
          {
            transform: underline.style.transform || 'translateX(0px)',
            width: underline.style.width || '0px',
          },
          { transform: `translateX(${x}px)`, width: `${width}px` },
        ],
        { duration, easing: motionEasing.current.css, fill: 'forwards' }
      )
      .addEventListener('finish', () => {
        underline.style.transform = `translateX(${x}px)`;
        underline.style.width = `${width}px`;
      });
  }, [activeKey, tabs, isOverflowing, isReduceMotionEnabled]);

  // Off-screen active tab (including the one restored at mount) is brought
  // into view rather than leaving the underline to travel somewhere unseen.
  useEffect(() => {
    if (!isOverflowing) return;
    const scroller = scrollerRef.current;
    const activeTab = tabRefs.current.get(activeKey);
    if (!scroller || !activeTab) return;

    const scrollerBox = scroller.getBoundingClientRect();
    const tabBox = activeTab.getBoundingClientRect();
    const left = tabBox.left - scrollerBox.left + scroller.scrollLeft - SCROLL_INTO_VIEW_MARGIN;
    const maxLeft = scroller.scrollWidth - scroller.clientWidth;
    const target = Math.min(Math.max(left, 0), Math.max(maxLeft, 0));

    scroller.scrollTo({ left: target, behavior: isReduceMotionEnabled ? 'auto' : 'smooth' });
  }, [activeKey, isOverflowing, isReduceMotionEnabled]);

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) onChange(key);
    },
    [activeKey, onChange]
  );

  const focusTab = useCallback((key: string) => {
    setFocusedKey(key);
    tabRefs.current.get(key)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((tab) => tab.key === focusedKey);
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft')
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;

      if (nextIndex === null) return;
      event.preventDefault();
      const nextKey = tabs[nextIndex].key;
      focusTab(nextKey);
      handlePress(nextKey);
    },
    [tabs, focusedKey, focusTab, handlePress]
  );

  // Horizontal wheel (`deltaX`) or a vertical wheel held with Shift scrolls
  // the row directly — a bare vertical wheel over a horizontal-only scroller
  // does nothing on most platforms.
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!isOverflowing) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const delta = event.deltaX !== 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (delta === 0) return;
      scroller.scrollLeft += delta;
    },
    [isOverflowing]
  );

  // A pointer-only convenience toward one edge, about two thirds of the
  // visible row — the same idiom the active tab's own scroll-into-view uses.
  const handleScrollArrow = useCallback(
    (edge: 'leading' | 'trailing') => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const distance = scroller.clientWidth * SCROLL_STEP_RATIO;
      scroller.scrollBy({
        left: edge === 'leading' ? -distance : distance,
        behavior: isReduceMotionEnabled ? 'auto' : 'smooth',
      });
    },
    [isReduceMotionEnabled]
  );

  // In on `swell`, out on `ebb` — a state change in place, per §1.11.
  const arrowTransition = `opacity ${resolveMotionMs(isHovered ? motionMs.swell : motionMs.ebb, isReduceMotionEnabled)}ms ${motionEasing.current.css}`;

  /**
   * The arrow's ground: the fade's own width, and the label's line box rather
   * than the whole row, so the chevron sits on the labels' line and not on the
   * underline below them. The slot centres the kit's well and carries the
   * fade, because the well draws its own transform and would drop a
   * `translateY` of ours.
   */
  const arrowSlotStyle = (edge: 'leading' | 'trailing'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: UNDERLINE_RESERVE,
    [edge === 'leading' ? 'left' : 'right']: 0,
    width: SCROLL_ARROW_GUTTER,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isHovered ? 1 : 0,
    pointerEvents: isHovered ? 'auto' : 'none',
    transition: arrowTransition,
  });

  const containerStyle: React.CSSProperties = { position: 'relative', ...style };

  // The tabs never enter the gutters the arrows stand on, so nothing
  // clickable is ever behind a chevron. Both are reserved at once: toggling
  // one with the scroll position would resize the scroller mid-gesture.
  const gutter = isOverflowing ? SCROLL_ARROW_GUTTER : 0;

  const scrollerStyle: React.CSSProperties = {
    marginLeft: gutter,
    marginRight: gutter,
    overflowX: isOverflowing ? 'auto' : 'hidden',
    scrollbarWidth: 'none',
  };

  const rowStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: metrics.gap,
    paddingBottom: UNDERLINE_RESERVE,
    width: 'max-content',
  };

  const gradientStop = t.water.gradient[0];
  const activeTab = tabs.find((tab) => tab.key === activeKey);

  return (
    <div
      data-testid={testID}
      className={className}
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollerRef}
        role="tablist"
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        style={scrollerStyle}
        data-testid={testID ? `${testID}-scroll` : undefined}
        data-scroll-enabled={isOverflowing}
      >
        <div ref={rowRef} style={rowStyle}>
          {tabs.map((tab: UnderlineTab) => {
            const isActive = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.key, node);
                  else tabRefs.current.delete(tab.key);
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                tabIndex={tab.key === focusedKey ? 0 : -1}
                data-testid={tabTestIDPrefix ? `${tabTestIDPrefix}-${tab.key}` : undefined}
                onClick={() => {
                  focusTab(tab.key);
                  handlePress(tab.key);
                }}
                style={{
                  font: 'inherit',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: fontFamily.sans,
                  fontWeight: isActive ? fontWeight.bold : fontWeight.semibold,
                  fontSize: metrics.font,
                  // With a unit: React treats a bare number here as a
                  // multiplier of the font size, which made every tab
                  // `font × snug` lines tall and pushed the underline a
                  // screen below its label (side panel, 2026-09-02).
                  lineHeight: `${metrics.font * lineHeight.snug}px`,
                  letterSpacing: metrics.letterSpacing,
                  textTransform: metrics.uppercase ? 'uppercase' : 'none',
                  color: isActive ? t.text.primary : t.text.secondary,
                  whiteSpace: 'nowrap',
                  transition: `color ${resolveMotionMs(motionMs.drift, isReduceMotionEnabled)}ms ${motionEasing.current.css}, font-weight ${resolveMotionMs(motionMs.drift, isReduceMotionEnabled)}ms ${motionEasing.current.css}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
          <div
            ref={underlineRef}
            data-testid={underlineTestID}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: UNDERLINE_HEIGHT,
              borderRadius: borderRadius.r1,
              backgroundColor: activeTab?.underlineColor ?? t.accent.fill,
            }}
          />
        </div>
      </div>

      {isOverflowing && edges.leading && (
        <div
          data-testid={testID ? `${testID}-fade-leading` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: OVERFLOW_FADE_WIDTH,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${gradientStop}, ${withAlpha(gradientStop, 0)})`,
          }}
        />
      )}
      {isOverflowing && edges.trailing && (
        <div
          data-testid={testID ? `${testID}-fade` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: OVERFLOW_FADE_WIDTH,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${withAlpha(gradientStop, 0)}, ${gradientStop})`,
          }}
        />
      )}

      {isOverflowing && edges.leading && (
        <div style={arrowSlotStyle('leading')}>
          <IconBubble
            decorative
            size={SCROLL_ARROW_SIZE}
            tone="surface"
            icon={CaretLeftIcon}
            iconSize={SCROLL_ARROW_ICON_SIZE}
            onPress={() => handleScrollArrow('leading')}
            testID={testID ? `${testID}-scroll-leading` : undefined}
          />
        </div>
      )}
      {isOverflowing && edges.trailing && (
        <div style={arrowSlotStyle('trailing')}>
          <IconBubble
            decorative
            size={SCROLL_ARROW_SIZE}
            tone="surface"
            icon={CaretRightIcon}
            iconSize={SCROLL_ARROW_ICON_SIZE}
            onPress={() => handleScrollArrow('trailing')}
            testID={testID ? `${testID}-scroll-trailing` : undefined}
          />
        </div>
      )}
    </div>
  );
}
