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
 * the DOM twin never changes DOM shapes: the tab row always sits inside a
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
 * The ground an arrow stands on, and the scroller's `scroll-padding-inline`.
 *
 * No layout space is reserved for it: the arrows overlay the row. What keeps
 * a tab from coming to rest under one is scroll snapping — the row snaps by
 * the inline axis, each tab is a snap point, and `scroll-padding` insets the
 * *optical* viewport the browser snaps against. A tab therefore always halts
 * this far in from whichever edge carries an arrow.
 *
 * The ends need no special case, and that is the point: a snap position
 * outside the scroll range clamps, so at rest the first tab sits flush at the
 * left (with no arrow there to cover it) and at the end the last tab sits
 * flush at the right (with no arrow there either). Flush start, nothing
 * clickable under a chevron, no layout jump, no leftover indent.
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
  settled = true,
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
  /** The underline's travel in flight, so a newer one can take over from it. */
  const underlineAnimation = useRef<Animation | null>(null);
  // The web font may land after the first paint and change every tab's
  // width: until it has, the underline is placed, never animated, and one
  // more measurement follows the fonts (`document.fonts.ready`).
  const fontsReady = useRef(typeof document === 'undefined' || !('fonts' in document));
  useEffect(() => {
    if (fontsReady.current) return undefined;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      fontsReady.current = true;
      setMeasureTick((tick) => tick + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [focusedKey, setFocusedKey] = useState(activeKey);

  // A change in the SET of tabs moves only the tabs concerned (owner,
  // 2026-09-16), the same as the mobile twin: a tab that joins grows in where
  // it lands, one that leaves shrinks out — held in the row for the length of
  // the exit so the ones after it slide over on the flow — and a reorder
  // slides each tab from where it was to where it goes (FLIP). Each tab sits
  // in its own wrapper, which is what the width and the travel animate.
  const wrapRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [rendered, setRendered] = useState<{ tabs: UnderlineTab[]; leaving: Set<string> }>({
    tabs,
    leaving: new Set(),
  });
  const prevLefts = useRef<Map<string, number>>(new Map());
  const prevKeys = useRef('');
  const hasMounted = useRef(false);
  const [measureTick, setMeasureTick] = useState(0);
  useEffect(() => {
    const keys = new Set(tabs.map((tab) => tab.key));
    const gone = rendered.tabs.filter((tab) => !keys.has(tab.key));
    if (gone.length === 0) {
      setRendered((prev) =>
        prev.tabs === tabs && prev.leaving.size === 0 ? prev : { tabs, leaving: new Set() }
      );
      return undefined;
    }
    // The leaving tabs keep their place while they shrink; the rest take the
    // new order around them.
    const merged: UnderlineTab[] = [];
    const next = [...tabs];
    rendered.tabs.forEach((tab) => {
      if (!keys.has(tab.key)) merged.push(tab);
      else if (next.length) merged.push(next.shift() as UnderlineTab);
    });
    merged.push(...next);
    setRendered({ tabs: merged, leaving: new Set(gone.map((tab) => tab.key)) });
    const timer = setTimeout(
      () => setRendered({ tabs, leaving: new Set() }),
      resolveMotionMs(motionMs.ebb, isReduceMotionEnabled)
    );
    return () => clearTimeout(timer);
    // `rendered` is what this effect writes; reading it here would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, isReduceMotionEnabled]);

  useLayoutEffect(() => {
    const lefts = new Map<string, number>();
    // A set still being read (`settled` false) changes without motion, the
    // same as the first mount: hydration owes no verb.
    // Only a change to the set or its order moves a tab. The parent hands a
    // new array on every render; measuring then read ancestors mid-animation
    // as a move and slid a tab that had not changed — Bitcoin trembled when
    // the sub-tab below changed.
    const keys = rendered.tabs.map((tab) => tab.key).join('|');
    const setChanged = keys !== prevKeys.current || rendered.leaving.size > 0;
    prevKeys.current = keys;
    const canAnimate = !isReduceMotionEnabled && hasMounted.current && settled && setChanged;
    let pending = 0;
    const settle = () => {
      pending -= 1;
      if (pending === 0) setMeasureTick((tick) => tick + 1);
    };
    const run = (element: HTMLElement, frames: Keyframe[], duration: number, easing: string) => {
      if (typeof element.animate !== 'function') return;
      pending += 1;
      element
        .animate(frames, { duration, easing, fill: 'backwards' })
        .addEventListener('finish', settle);
    };
    rendered.tabs.forEach((tab, index) => {
      const wrap = wrapRefs.current.get(tab.key);
      if (!wrap) return;
      // Layout positions within the (positioned) row, not painted ones: no
      // transform on the row or above it reads as a tab moving.
      const box = { width: wrap.offsetWidth };
      const left = wrap.offsetLeft;
      lefts.set(tab.key, left);
      const gapSide = index === 0 ? 'marginRight' : 'marginLeft';
      if (rendered.leaving.has(tab.key)) {
        if (!prevLefts.current.has(tab.key) || !canAnimate) return;
        prevLefts.current.delete(tab.key);
        run(
          wrap,
          [
            { width: `${box.width}px`, opacity: 1, [gapSide]: '0px' },
            { width: '0px', opacity: 0, [gapSide]: `${-metrics.gap}px` },
          ],
          resolveMotionMs(motionMs.ebb, isReduceMotionEnabled),
          motionEasing.sink.css
        );
        wrap.style.width = '0px';
        wrap.style.opacity = '0';
        return;
      }
      const before = prevLefts.current.get(tab.key);
      if (before === undefined) {
        if (!canAnimate) return;
        run(
          wrap,
          [
            { width: '0px', opacity: 0, [gapSide]: `${-metrics.gap}px` },
            { width: `${box.width}px`, opacity: 1, [gapSide]: '0px' },
          ],
          resolveMotionMs(motionMs.drift, isReduceMotionEnabled),
          motionEasing.current.css
        );
        return;
      }
      const delta = before - left;
      if (Math.abs(delta) >= 0.5 && canAnimate) {
        run(
          wrap,
          [{ transform: `translateX(${delta}px)` }, { transform: 'translateX(0)' }],
          resolveMotionMs(motionMs.drift, isReduceMotionEnabled),
          motionEasing.current.css
        );
      }
    });
    prevLefts.current = lefts;
    hasMounted.current = true;
  }, [rendered, metrics.gap, isReduceMotionEnabled, settled]);

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

    // The tab's layout box within the row (the row is positioned), not its
    // painted one: a tab floating in or a row scaling mid-transition reported
    // a moving, shrunken box, and the underline kept that half-measure.
    const x = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;

    const nextTransform = `translateX(${x}px)`;
    const nextWidth = `${width}px`;
    // A travel still in flight is taken over from where it is on screen, and
    // only the newest travel may commit its end: an older one finishing late
    // used to write its own target over the newer one, freezing the underline
    // at a width between two tabs.
    const inFlight = underlineAnimation.current;
    if (inFlight) {
      const onScreen = getComputedStyle(underline);
      underline.style.transform = onScreen.transform === 'none' ? '' : onScreen.transform;
      underline.style.width = onScreen.width;
      inFlight.cancel();
      underlineAnimation.current = null;
    }
    if (!hasMeasuredActive.current || !settled || !fontsReady.current) {
      underline.style.transform = nextTransform;
      underline.style.width = nextWidth;
      hasMeasuredActive.current = true;
      return;
    }
    // Already there: nothing to travel.
    if (underline.style.transform === nextTransform && underline.style.width === nextWidth) return;

    if (typeof underline.animate !== 'function') {
      underline.style.transform = nextTransform;
      underline.style.width = nextWidth;
      return;
    }

    const duration = resolveMotionMs(motionMs.drift, isReduceMotionEnabled);
    const travel = underline.animate(
      [
        {
          transform: underline.style.transform || 'translateX(0px)',
          width: underline.style.width || '0px',
        },
        { transform: nextTransform, width: nextWidth },
      ],
      { duration, easing: motionEasing.current.css, fill: 'forwards' }
    );
    underlineAnimation.current = travel;
    travel.addEventListener('finish', () => {
      if (underlineAnimation.current !== travel) return;
      underline.style.transform = nextTransform;
      underline.style.width = nextWidth;
      travel.cancel();
      underlineAnimation.current = null;
    });
  }, [activeKey, tabs, isOverflowing, isReduceMotionEnabled, measureTick, settled]);

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

  // Nothing is reserved and nothing is pushed: the row occupies the full
  // width and the arrows overlay it. Snapping is what keeps a tab from
  // resting under a chevron, and `scroll-padding-inline` is where it stops.
  const scrollerStyle: React.CSSProperties = {
    overflowX: isOverflowing ? 'auto' : 'hidden',
    scrollbarWidth: 'none',
    scrollSnapType: isOverflowing ? 'inline mandatory' : 'none',
    scrollPaddingInline: isOverflowing ? SCROLL_ARROW_GUTTER : 0,
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
          {rendered.tabs.map((tab: UnderlineTab) => {
            const isActive = tab.key === activeKey;
            return (
              <span
                key={tab.key}
                ref={(node) => {
                  if (node) wrapRefs.current.set(tab.key, node);
                  else wrapRefs.current.delete(tab.key);
                }}
                style={{ display: 'inline-flex', overflow: 'hidden', flexShrink: 0 }}
              >
                <button
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
                    // Each tab is a snap point; it comes to rest at the padded
                    // start of the scroller, never under the leading chevron.
                    scrollSnapAlign: 'start',
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
                    // Colour eases; the weight does not. Tweening the weight widened the
                    // tab frame by frame and shoved its neighbours along with it —
                    // the labels trembled — and the underline measured a width the
                    // label had not reached yet.
                    transition: `color ${resolveMotionMs(motionMs.drift, isReduceMotionEnabled)}ms ${motionEasing.current.css}`,
                  }}
                >
                  {tab.label}
                </button>
              </span>
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
