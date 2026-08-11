/**
 * BalanceCardCarousel - Arrow-based navigation carousel for BalanceCard
 *
 * Web version replacing mobile's swipe gesture with left/right arrow buttons.
 * Content slides out in one direction and the new card slides in from the opposite side.
 */
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { colors, spacing, borderRadius, fontSize, fontWeight, lineHeight, componentSizes, durationMs, duration, easing } from '@salmon/shared';
import { BalanceCard } from './BalanceCard';
import type { BalanceCardCarouselProps } from './types';

const SLIDE_OUT_MS = 150;
const SLIDE_IN_MS = durationMs.medium;
const CARD_SLIDE_PX = 60;

const CarouselWrapper = styled(Box)({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

const ArrowButton = styled('button')<{ $visible: boolean }>(({ $visible }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  width: componentSizes.iconSizeMButton,
  height: componentSizes.iconSizeMButton,
  borderRadius: borderRadius.full,
  border: 'none',
  padding: 0,
  backgroundColor: colors.interactive.hoverMedium,
  color: colors.text.primary,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  lineHeight: lineHeight.none,
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  opacity: $visible ? 1 : 0,
  pointerEvents: $visible ? 'auto' : 'none',
  transition: `opacity ${duration.normal} ${easing.ease}, background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
}));

const LeftArrow = styled(ArrowButton)({
  left: spacing.xs,
});

const RightArrow = styled(ArrowButton)({
  right: spacing.xs,
});

const CardContainer = styled(Box)({
  flex: 1,
  overflow: 'hidden',
  paddingBottom: spacing['3.5xl'],
  marginBottom: -spacing['3.5xl'],
});

const SlideContent = styled(Box)({
  transition: `transform ${SLIDE_IN_MS}ms ${easing.slide}, opacity ${SLIDE_IN_MS}ms ${easing.ease}`,
});

export function BalanceCardCarousel({
  blockchains,
  hiddenBalance,
  onToggleVisibility,
  onBlockchainChange,
  activeIndex: controlledIndex,
  showNetworkLabel = false,
  style,
  className,
}: BalanceCardCarouselProps) {
  const { t } = useTranslation();
  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex ?? internalIndex;
  const hasMultiple = blockchains.length > 1;

  // Animation state
  const [slideStyle, setSlideStyle] = useState({ transform: 'translateX(0)', opacity: 1 });
  const animatingRef = useRef(false);

  const goTo = useCallback(
    (newIndex: number, direction: 'left' | 'right') => {
      if (animatingRef.current) return;
      animatingRef.current = true;

      const slideOut = direction === 'right' ? -CARD_SLIDE_PX : CARD_SLIDE_PX;
      const slideIn = direction === 'right' ? CARD_SLIDE_PX : -CARD_SLIDE_PX;

      // Phase 1: slide current content out
      setSlideStyle({ transform: `translateX(${slideOut}px)`, opacity: 0 });

      setTimeout(() => {
        // Update index (swap content)
        setInternalIndex(newIndex);
        const bc = blockchains[newIndex];
        if (bc) {
          onBlockchainChange?.(bc.network.blockchain, newIndex);
        }

        // Position new content on opposite side instantly (no transition)
        setSlideStyle({ transform: `translateX(${slideIn}px)`, opacity: 0 });

        // Force reflow so the instant position applies before the transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Phase 2: slide new content in
            setSlideStyle({ transform: 'translateX(0)', opacity: 1 });
            setTimeout(() => {
              animatingRef.current = false;
            }, SLIDE_IN_MS);
          });
        });
      }, SLIDE_OUT_MS);
    },
    [blockchains, onBlockchainChange],
  );

  const goLeft = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1, 'left');
  }, [currentIndex, goTo]);

  const goRight = useCallback(() => {
    if (currentIndex < blockchains.length - 1) goTo(currentIndex + 1, 'right');
  }, [currentIndex, blockchains.length, goTo]);

  if (blockchains.length === 0) return null;

  const current = blockchains[currentIndex];
  if (!current) return null;

  // Disable transition during instant repositioning (opacity === 0 and not at center)
  const needsTransition = slideStyle.opacity === 1 || slideStyle.transform === 'translateX(0)';

  return (
    <CarouselWrapper style={style} className={className} data-testid="balance-card-carousel">
      {hasMultiple && (
        <LeftArrow
          $visible={currentIndex > 0}
          onClick={goLeft}
          aria-label={t('accessibility.previous_blockchain', 'Previous blockchain')}
          data-testid="balance-carousel-prev"
        >
          ‹
        </LeftArrow>
      )}

      <CardContainer>
        <SlideContent
          style={{
            ...slideStyle,
            transition: needsTransition
              ? undefined  // Use the CSS class transition
              : 'none',    // Instant repositioning
          }}
        >
          <BalanceCard
            network={current.network}
            blockchain={current.network.blockchain}
            usdTotal={current.usdTotal}
            changePercent={current.changePercent}
            changeAmount={current.changeAmount}
            hiddenBalance={hiddenBalance}
            onToggleVisibility={onToggleVisibility}
            loading={current.loading}
            showNetworkLabel={showNetworkLabel}
            currentIndex={currentIndex}
            totalCount={blockchains.length}
          />
        </SlideContent>
      </CardContainer>

      {hasMultiple && (
        <RightArrow
          $visible={currentIndex < blockchains.length - 1}
          onClick={goRight}
          aria-label={t('accessibility.next_blockchain', 'Next blockchain')}
          data-testid="balance-carousel-next"
        >
          ›
        </RightArrow>
      )}
    </CarouselWrapper>
  );
}

export default BalanceCardCarousel;
