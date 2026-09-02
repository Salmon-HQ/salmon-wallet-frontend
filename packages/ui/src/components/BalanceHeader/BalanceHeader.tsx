/**
 * BalanceHeader — the balance block of the redesigned Home, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/BalanceHeader/BalanceHeader.tsx`
 * and the anatomy is the same, read from the same `BalanceHeaderPropsBase`
 * contract: the label row with the eye, the amount, the 24h change beside the
 * Activity pill, the cue row (prev hint · dots · next hint · environment chip),
 * and the two money circles at the right. There is no card, no gradient pane
 * and no edge light — the number sits directly on the water column.
 *
 * What differs is how a page is turned. Mobile pans the amount under the
 * finger; the side panel has no touch, so the same page change is (spec 028,
 * DOM alternatives):
 *
 * - **arrow keys** on the focusable amount region (`ArrowLeft`/`ArrowRight`,
 *   plus `Home`/`End`), which is also what assistive tech drives;
 * - **a click on a dot**;
 * - **a horizontal wheel** over the block — a trackpad's two-finger swipe.
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LATERAL_SWAP_TRAVEL,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  borderRadius,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  formatLargeNumber,
  getLabelValue,
  getNetworkLabel,
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
  type BlockchainBalance,
} from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { ArrowDownLeftIcon, ArrowUpRightIcon, ClockIcon, EyeIcon, EyeSlashIcon } from '../../icons';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { PendingValue } from '../PendingValue';
import type { BalanceHeaderProps } from './types';

/** A value the backend has not returned yet — never a fabricated 0. */
const EM_DASH = '—';

/** Dot geometry, unchanged from mobile: the active dot is a pill that travels. */
const DOT_SIZE = spacing.xs;
const DOT_ACTIVE_WIDTH = componentSizes.iconSizeXxsm;

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
  const { text, change, chain, accent } = useSemantic();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const reducedMotion = useReducedMotion();

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  const amountRef = useRef<HTMLDivElement>(null);
  const changeRef = useRef<HTMLDivElement>(null);
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
  const { usdTotal, nativeAmount, changePercent, changeAmount, loading = false } = current ?? {};

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

  // The environment chip. The active network decides, not a setting: a devnet
  // session says "Devnet" whether or not Developer Networks is on, and every
  // mainnet says nothing — which is exactly what `getNetworkLabel` returns.
  const networkLabel = getNetworkLabel(currentNetworkId);

  // The hints point where the pages actually go, arrow included, and each takes
  // its own destination chain's hue — a second channel on a cue that already
  // reads without it.
  const hintFor = (chainBalance: BlockchainBalance | undefined) =>
    chainBalance
      ? {
          symbol: NETWORK_DISPLAY[chainBalance.network.id]?.symbol,
          ink: chain.hintInk[chainBalance.network.blockchain],
        }
      : undefined;
  const previousHint = hintFor(blockchains[activeIndex - 1]);
  const nextHint = hintFor(blockchains[activeIndex + 1]);

  const hintStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.micro,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      data-testid={testID}
      className={className}
      onWheel={handleWheel}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.md,
        ...style,
      }}
    >
      <div
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: spacing.xs }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.medium,
              fontSize: fontSize.caption,
              color: text.secondary,
            }}
          >
            {t('home.total_balance', 'Total balance')}
          </span>
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

        {/* The value stays readable while it is being recalculated — the number
            breathes, it is never replaced by a placeholder. The region is the
            keyboard's grip on the pager, which is why it is focusable and
            carries the network's name. */}
        <div
          ref={amountRef}
          data-testid="balance-amount"
          role="group"
          tabIndex={0}
          aria-label={current?.network.name}
          onKeyDown={handleKeyDown}
          style={{ outlineOffset: spacing.xxs }}
        >
          <PendingValue pending={loading}>
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.balance,
                color: text.primary,
                letterSpacing: letterSpacing.balance,
                whiteSpace: 'nowrap',
                ...tabularNums.css,
              }}
            >
              {hiddenBalance ? hiddenValue : isTestNetwork ? nativeTotal : formatValue(usdTotal)}
            </span>
          </PendingValue>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.base }}>
          {/* Off mainnet nothing priced the balance, so there is no 24h change
              to report — the line is absent rather than an em-dash, which would
              promise a figure that is merely late. */}
          {!isTestNetwork && (
            <div
              ref={changeRef}
              data-testid="balance-change"
              style={{ flexShrink: 1, minWidth: 0 }}
            >
              <PendingValue pending={loading}>
                <span
                  style={{
                    fontFamily: fontFamily.sans,
                    fontWeight: fontWeight.bold,
                    fontSize: fontSize.caption,
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
          )}
          <Chip
            testID="home-activity-button"
            size="sm"
            variant="outline"
            label={t('actions.activity', 'Activity')}
            leadingIcon={<ClockIcon size={componentSizes.iconSizeXxs} color={text.secondary} />}
            onPress={onActivityPress}
            accessibilityLabel={t('accessibility.view_activity', 'View activity')}
          />
        </div>

        {/* The cue row also carries the environment chip, so it paints for a
            single-chain wallet standing off mainnet — the chip is the warning a
            test-network session gets. */}
        {(blockchains.length > 1 || !!networkLabel) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            {previousHint?.symbol && (
              <span
                data-testid="balance-prev-hint"
                style={{ ...hintStyle, color: previousHint.ink }}
              >
                {`${previousHint.symbol} ←`}
              </span>
            )}
            {blockchains.length > 1 && (
              <div
                role="tablist"
                aria-label={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                  name: current?.network.name ?? '',
                })}
                style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}
              >
                {blockchains.map((chainBalance, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={chainBalance.network.id}
                      type="button"
                      role="tab"
                      data-testid={`balance-carousel-dot-${index}`}
                      aria-selected={isActive}
                      aria-label={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                        name: chainBalance.network.name,
                      })}
                      onClick={() => leaveFor(index)}
                      style={{
                        // The hit box clears the 44px minimum without the dots
                        // themselves growing: padding around a fixed pill,
                        // taken back by the margin so the row measures the dot
                        // and nothing else — mobile's hit slop is not layout,
                        // and the Send/Receive pair sits centred on the change
                        // row and the cue row together because of it.
                        border: 'none',
                        background: 'transparent',
                        padding: `${(44 - DOT_SIZE) / 2}px 0`,
                        margin: `${-(44 - DOT_SIZE) / 2}px 0`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          width: isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE,
                          height: DOT_SIZE,
                          borderRadius: borderRadius.full,
                          backgroundColor: isActive ? accent.fill : text.disabled,
                          // Selection indicators inside one block agree: the
                          // pill widens on the same `drift` beat the sub-tab
                          // underline travels on.
                          transition: reducedMotion
                            ? undefined
                            : `width ${motionMs.drift}ms ${motionEasing.settle.css}`,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
            {nextHint?.symbol && (
              <span data-testid="balance-next-hint" style={{ ...hintStyle, color: nextHint.ink }}>
                {`→ ${nextHint.symbol}`}
              </span>
            )}
            {networkLabel && (
              <Chip
                testID="balance-network-chip"
                size="sm"
                variant="outline"
                label={networkLabel}
              />
            )}
          </div>
        )}
      </div>

      {/* The two money controls are the same object as the wallet thumb: one
          `IconBubble`, differing only in tone. Send is the block's single
          salmon fill (and carries the flesh with it); Receive is its outline
          twin. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexShrink: 0 }}>
        <IconBubble
          testID="home-send-button"
          size={componentSizes.buttonHeightCompact}
          tone="accent"
          icon={ArrowUpRightIcon}
          iconWeight="bold"
          iconSize={componentSizes.iconSizeSmall}
          onPress={onSendPress}
          disabled={sendDisabled}
          accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
        />
        <IconBubble
          testID="home-receive-button"
          size={componentSizes.buttonHeightCompact}
          tone="outline"
          icon={ArrowDownLeftIcon}
          iconSize={componentSizes.iconSizeSmall}
          onPress={onReceivePress}
          accessibilityLabel={t('accessibility.receive_tokens', 'Receive tokens')}
        />
      </div>
    </div>
  );
}
