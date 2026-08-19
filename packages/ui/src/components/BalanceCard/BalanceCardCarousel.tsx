/**
 * BalanceCardCarousel - Arrow-based navigation carousel for BalanceCard
 *
 * Web version replacing mobile's swipe gesture with left/right arrow buttons.
 *
 * The carousel no longer animates anything itself. It used to slide the *whole*
 * card out of frame at opacity 0 and slide a new one back in, which read as the
 * balance card being destroyed and rebuilt on every chain switch — background,
 * shadow and all. Pressing an arrow is a discrete state change in place, not a
 * dragged surface (that is mobile's swipe, which is direct manipulation and
 * keeps its travel), so the card stays put and `BalanceCard` crossfades its own
 * contents. All this component does is move the index.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  componentSizes,
  motionDuration,
  motionEasing,
} from '@salmon/shared';
import { BalanceCard } from './BalanceCard';
import type { BalanceCardCarouselProps } from './types';

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
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  opacity: $visible ? 1 : 0,
  pointerEvents: $visible ? 'auto' : 'none',
  transition: `opacity ${motionDuration.swell} ${motionEasing.current.css}, background-color ${motionDuration.swell} ${motionEasing.current.css}`,
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

  const goTo = useCallback(
    (newIndex: number) => {
      setInternalIndex(newIndex);
      const bc = blockchains[newIndex];
      if (bc) {
        onBlockchainChange?.(bc.network.blockchain, newIndex);
      }
    },
    [blockchains, onBlockchainChange]
  );

  const goLeft = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const goRight = useCallback(() => {
    if (currentIndex < blockchains.length - 1) goTo(currentIndex + 1);
  }, [currentIndex, blockchains.length, goTo]);

  if (blockchains.length === 0) return null;

  const current = blockchains[currentIndex];
  if (!current) return null;

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
