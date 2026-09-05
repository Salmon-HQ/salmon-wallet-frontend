/**
 * BalanceHeader — the balance block of the redesigned Home, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/BalanceHeader/BalanceHeader.tsx`
 * and the anatomy is the same, read from the same `BalanceHeaderPropsBase`
 * contract: `ChainSelector` where "Total balance" used to sit, the amount
 * with the eye beside it, the 24h change, and the three money circles
 * (Send, Receive, Activity) at the right. There is no card, no gradient pane
 * and no edge light — the number sits directly on the water column.
 *
 * What differs is how a page is turned. Mobile pans the amount under the
 * finger; the side panel has no touch, so the same page change is (spec 028,
 * DOM alternatives):
 *
 * - **arrow keys** on the focusable amount region (`ArrowLeft`/`ArrowRight`,
 *   plus `Home`/`End`), which is also what assistive tech drives;
 * - **a horizontal wheel** over the block — a trackpad's two-finger swipe;
 * - **the `ChainSelector` sheet** — the same alternate route mobile's sheet
 *   gives a tap.
 *
 * The verb is unchanged and every number comes from `@salmon/shared`: the
 * outgoing amount slides `LATERAL_SWAP_TRAVEL` toward the edge it is heading
 * for and loses its light on `sink`; the incoming one starts at the opposite
 * edge and comes to rest on `settle`. The 24h change never moves sideways — it
 * has neighbours on both sides — so it plays the sink *in place*, the same
 * drop, recession and loss of light, and floats back with the new value. The
 * frame around them holds still (DESIGN.md §The balance block's motion, rule
 * four); under `prefers-reduced-motion` every page change is a cut.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LATERAL_SWAP_TRAVEL,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  getLabelValue,
  hiddenValue,
  isMainnetNetworkId,
  letterSpacing,
  motionEasing,
  motionMs,
  NETWORK_DISPLAY,
  showPercentage,
  spacing,
  tabularNums,
  useCurrencyContext,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { clearAnimations, useReducedMotion } from '../../motion';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ClockIcon, EyeIcon, EyeSlashIcon } from '../../icons';
import { ChainSelector } from './ChainSelector';
import { IconBubble } from '../IconBubble';
import { PendingValue } from '../PendingValue';
import type { BalanceHeaderProps } from './types';

/** A value the backend has not returned yet — never a fabricated 0. */
const EM_DASH = '—';

/** How far a long total may shrink before it is allowed to clip. */
const BALANCE_MIN_FONT_SCALE = 0.6;

/** How far a horizontal wheel has to travel before it counts as a page. */
const WHEEL_PAGE_THRESHOLD = 40;

/** `Element.animate` is absent in jsdom and in very old engines. */
function canAnimate(element: Element | null): element is HTMLElement {
  return !!element && typeof (element as HTMLElement).animate === 'function';
}

export function BalanceHeader({
  blockchains,
  hiddenBalance = false,
  onToggleVisibility,
  onBlockchainChange,
  activeIndex: controlledIndex,
  onSendPress,
  onReceivePress,
  onActivityPress,
  sendDisabled = false,
  style,
  className,
  testID,
}: BalanceHeaderProps) {
  const { t } = useTranslation();
  const { text, change } = useSemantic();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const reducedMotion = useReducedMotion();

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  const amountRef = useRef<HTMLDivElement>(null);
  const changeRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef<HTMLSpanElement>(null);
  const eyeRef = useRef<HTMLDivElement>(null);
  // A long total fits itself to the width beside Send/Receive rather than
  // wrapping — mobile's `adjustsFontSizeToFit`, measured here.
  const [balanceFit, setBalanceFit] = useState(1);
  // The index the arrival animation has already been played for. A page change
  // is committed by the parent a beat after the exit finishes, so the arrival
  // runs from an effect — otherwise the OLD number would be the one sliding in.
  const enteredIndexRef = useRef(activeIndex);
  // Which edge the block is heading for, remembered across the commit so the
  // arrival is the horizontal mirror of the exit.
  const leavingRef = useRef(false);

  const updateIndex = useCallback(
    (newIndex: number) => {
      // Controlled: the parent owns the index, and writing the local copy only
      // creates a second source of truth that can disagree with it.
      if (controlledIndex == null) setInternalIndex(newIndex);
      const blockchain = blockchains[newIndex];
      if (blockchain) onBlockchainChange?.(blockchain.network.blockchain, newIndex);
    },
    [blockchains, onBlockchainChange, controlledIndex]
  );

  /**
   * Send the amount off the edge it is heading for, and change the chain when
   * it gets there. One verb for every page change — a dot, an arrow key, a
   * wheel — so they all arrive the same way.
   */
  const leaveFor = useCallback(
    (newIndex: number) => {
      if (newIndex === activeIndex || !blockchains[newIndex]) return;
      if (reducedMotion || !canAnimate(amountRef.current)) {
        updateIndex(newIndex);
        return;
      }

      leavingRef.current = true;
      const direction = newIndex > activeIndex ? -1 : 1;
      const exit = {
        duration: motionMs.drift,
        easing: motionEasing.sink.css,
        fill: 'forwards' as const,
      };

      // The 24h change sinks in place: the same drop, recession and loss of
      // light `sinkExiting` draws, on the beat the amount leaves.
      changeRef.current?.animate?.(
        [
          { opacity: 1, transform: 'translateY(0px) scale(1)' },
          {
            opacity: 0,
            transform: `translateY(${SINK_FLOAT_TRAVEL}px) scale(${SINK_EXIT_SCALE})`,
          },
        ],
        exit
      );

      const slide = amountRef.current.animate(
        [
          { opacity: 1, transform: 'translateX(0px)' },
          { opacity: 0, transform: `translateX(${direction * LATERAL_SWAP_TRAVEL}px)` },
        ],
        exit
      );
      const commit = () => updateIndex(newIndex);
      slide.finished.then(commit).catch(commit);
    },
    [activeIndex, blockchains, reducedMotion, updateIndex]
  );

  // The arrival: the new amount starts at the opposite edge with no light and
  // comes back to rest gaining it, and the change un-sinks and floats.
  useEffect(() => {
    const previous = enteredIndexRef.current;
    if (previous === activeIndex) return;
    enteredIndexRef.current = activeIndex;
    leavingRef.current = false;
    if (reducedMotion || !canAnimate(amountRef.current)) return;

    // The exit held its last frame (`fill: forwards`); an arrival whose effect
    // is removed when it ends would hand the element back to it, invisible.
    // The first page change is where this showed: a blank amount on Bitcoin.
    clearAnimations(amountRef.current);
    clearAnimations(changeRef.current);

    const fromRight = activeIndex > previous;
    amountRef.current.animate(
      [
        {
          opacity: 0,
          transform: `translateX(${(fromRight ? 1 : -1) * LATERAL_SWAP_TRAVEL}px)`,
        },
        { opacity: 1, transform: 'translateX(0px)' },
      ],
      { duration: motionMs.drift, easing: motionEasing.settle.css, fill: 'backwards' }
    );

    // The change owes only the float, and owes it with no beat: its own sink
    // was played by the exit above. A page the block did not animate out of
    // (the parent moved the index on its own) still floats — nothing sank, so
    // it simply arrives.
    changeRef.current?.animate?.(
      [
        {
          opacity: 0,
          transform: `translateY(${SINK_FLOAT_TRAVEL}px) scale(${SINK_EXIT_SCALE})`,
        },
        { opacity: 1, transform: 'translateY(0px) scale(1)' },
      ],
      { duration: motionMs.drift, easing: motionEasing.settle.css, fill: 'backwards' }
    );
  }, [activeIndex, reducedMotion]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const last = blockchains.length - 1;
      if (last < 1) return;
      if (event.key === 'ArrowRight' && activeIndex < last) leaveFor(activeIndex + 1);
      else if (event.key === 'ArrowLeft' && activeIndex > 0) leaveFor(activeIndex - 1);
      else if (event.key === 'Home' && activeIndex !== 0) leaveFor(0);
      else if (event.key === 'End' && activeIndex !== last) leaveFor(last);
      else return;
      event.preventDefault();
    },
    [activeIndex, blockchains.length, leaveFor]
  );

  // A trackpad's two-finger swipe. Only the horizontal component is read, so a
  // vertical scroll started over the block still scrolls the panel — the same
  // rule mobile's `activeOffsetX`/`failOffsetY` pan enforces.
  const wheelTravelRef = useRef(0);
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const { deltaX, deltaY } = event;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      wheelTravelRef.current += deltaX;
      if (Math.abs(wheelTravelRef.current) < WHEEL_PAGE_THRESHOLD) return;
      const forward = wheelTravelRef.current > 0;
      wheelTravelRef.current = 0;
      const next = activeIndex + (forward ? 1 : -1);
      if (next < 0 || next > blockchains.length - 1) return;
      leaveFor(next);
    },
    [activeIndex, blockchains.length, leaveFor]
  );

  const current = blockchains[activeIndex];
  const currentNetworkId = current?.network.id ?? 'solana-mainnet';
  const currentBlockchainId = current?.network.blockchain ?? 'solana';
  const { usdTotal, nativeAmount, changePercent, changeAmount, loading = false } = current ?? {};

  // The eye's own cue that the chain under it changed — a blink, not a
  // report: `scaleY` shuts fast (`sink`) and reopens slower (`settle`), the
  // same pair the amount's own exit/arrival above use. Skipped on first
  // mount — nothing changed yet to blink at.
  const blinkedForRef = useRef(currentBlockchainId);
  useEffect(() => {
    if (blinkedForRef.current === currentBlockchainId) return;
    blinkedForRef.current = currentBlockchainId;
    if (reducedMotion || !canAnimate(eyeRef.current)) return;
    eyeRef.current.animate(
      [
        { transform: 'scaleY(1)' },
        { transform: 'scaleY(0.05)', offset: motionMs.flick / (motionMs.flick + motionMs.swell) },
        { transform: 'scaleY(1)' },
      ],
      { duration: motionMs.flick + motionMs.swell, easing: motionEasing.settle.css }
    );
  }, [currentBlockchainId, reducedMotion]);

  // Off mainnet there is no price, so there is no USD total to print and the
  // block would sit on an em-dash forever. The honest total on a test network
  // is the native quantity; a 24h change is not withheld but absent, because
  // nothing priced it.
  const isTestNetwork = !isMainnetNetworkId(currentNetworkId);
  const nativeSymbol = NETWORK_DISPLAY[currentNetworkId]?.symbol ?? '';
  const nativeTotal =
    nativeAmount === undefined ? EM_DASH : `${formatLargeNumber(nativeAmount)} ${nativeSymbol}`;
  const hasChange = changePercent !== undefined && changeAmount !== undefined;
  const changeColor = hasChange ? change[getLabelValue(changePercent)] : text.secondary;

  const balanceText = hiddenBalance
    ? hiddenValue
    : isTestNetwork
      ? nativeTotal
      : formatValue(usdTotal);
  useLayoutEffect(() => {
    const span = balanceRef.current;
    const box = amountRef.current;
    if (!span || !box) return undefined;
    const fit = () => {
      const needed = span.scrollWidth / (Number(span.dataset.fit) || 1);
      const available = box.clientWidth;
      const next =
        available > 0 && needed > available
          ? Math.max(BALANCE_MIN_FONT_SCALE, available / needed)
          : 1;
      span.dataset.fit = String(next);
      setBalanceFit(next);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [balanceText]);

  return (
    <div
      data-testid={testID}
      className={className}
      onWheel={handleWheel}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        ...style,
      }}
    >
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
        <ChainSelector
          blockchains={blockchains}
          activeIndex={activeIndex}
          onSelect={leaveFor}
          testID="balance-chain-selector"
        />

        {/* The value stays readable while it is being recalculated — the number
            breathes, it is never replaced by a placeholder. The region is the
            keyboard's grip on the pager, which is why it is focusable and
            carries the network's name. The eye sits beside it rather than
            above: a large total gives up its own width first (`balanceFit`
            below), never the toggle's. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <div
            ref={amountRef}
            data-testid="balance-amount"
            role="group"
            tabIndex={0}
            aria-label={current?.network.name}
            onKeyDown={handleKeyDown}
            style={{ outlineOffset: spacing.xxs, flexShrink: 1, minWidth: 0 }}
          >
            <PendingValue pending={loading}>
              <span
                ref={balanceRef}
                style={{
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.balance * balanceFit,
                  color: text.primary,
                  letterSpacing: letterSpacing.balance,
                  whiteSpace: 'nowrap',
                  ...tabularNums.css,
                }}
              >
                {balanceText}
              </span>
            </PendingValue>
          </div>
          <div ref={eyeRef}>
            <IconBubble
              testID="balance-eye-toggle"
              size={componentSizes.iconSizeMedium}
              tone="ghost"
              icon={hiddenBalance ? EyeSlashIcon : EyeIcon}
              iconSize={componentSizes.changeArrowIcon}
              onPress={onToggleVisibility}
              accessibilityLabel={
                hiddenBalance
                  ? t('accessibility.show_balance', 'Show balance')
                  : t('accessibility.hide_balance', 'Hide balance')
              }
            />
          </div>
        </div>

        {/* The change and the three controls share one row, mirrored: the
            change reads on the left, the controls sit on the right —
            `marginLeft: 'auto'` on the controls pins them there whether or
            not the row is otherwise empty. Off mainnet nothing priced the
            balance, so this reads as an em-dash rather than disappearing —
            the row stays, only the figure is unknown. */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div ref={changeRef} data-testid="balance-change" style={{ minWidth: 0 }}>
            <PendingValue pending={loading}>
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.bold,
                  // Same size as the Portfolio/NFTs subtabs (`UnderlineTabs`
                  // at `md`) — one reading size for the block's two
                  // lateral-choice/status lines.
                  fontSize: fontSize.bodyLg,
                  letterSpacing: letterSpacing.change,
                  color: hiddenBalance ? text.secondary : changeColor,
                  whiteSpace: 'nowrap',
                  ...tabularNums.css,
                }}
              >
                {hiddenBalance
                  ? `${hiddenValue} · ${hiddenValue}`
                  : hasChange
                    ? `${formatChange(changeAmount)} · ${showPercentage(changePercent)} ${t('home.change_period_24h', '24h')}`
                    : EM_DASH}
              </span>
            </PendingValue>
          </div>

          {/* The three controls are the same object as the wallet thumb: one
              `IconBubble`, differing only in tone, sized like
              `portfolio-order-button` (36, the secondary-control step)
              rather than a primary action's 42. Send is the block's single
              salmon fill (and carries the flesh with it); Receive and
              Activity are its outline twins. */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' }}
          >
            <IconBubble
              testID="home-activity-button"
              size={componentSizes.iconBubbleSm}
              tone="outline"
              icon={ClockIcon}
              iconSize={componentSizes.iconSizeXSmall}
              onPress={onActivityPress}
              accessibilityLabel={t('accessibility.view_activity', 'View activity')}
            />
            <IconBubble
              testID="home-send-button"
              size={componentSizes.iconBubbleSm}
              tone="accent"
              icon={ArrowUpRightIcon}
              iconWeight="bold"
              iconSize={componentSizes.iconSizeXSmall}
              onPress={onSendPress}
              disabled={sendDisabled}
              accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
            />
            <IconBubble
              testID="home-receive-button"
              size={componentSizes.iconBubbleSm}
              tone="outline"
              icon={ArrowDownLeftIcon}
              iconSize={componentSizes.iconSizeXSmall}
              onPress={onReceivePress}
              accessibilityLabel={t('accessibility.receive_tokens', 'Receive tokens')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
