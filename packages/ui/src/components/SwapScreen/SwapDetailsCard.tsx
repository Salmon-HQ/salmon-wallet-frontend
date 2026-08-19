/**
 * SwapDetailsCard - the review screens' detail rows grouped into ONE card.
 *
 * DOM mirror of the mobile component. Each row used to be its own pill
 * (padding + gap per row); nine to eleven of them alone overflowed the
 * viewport, which is what kept the review scrolling. Grouped, a row costs
 * `componentSizes.swapDetailRowHeight` and a hairline. Advanced rows fold
 * behind a "Details" disclosure, collapsed by default.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  colors,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
  tabularNums,
} from '@salmon/shared';
import type { SwapDetailItem } from '@salmon/shared';
import { CaretDownIcon, iconSize } from '../../icons';
import { BlurContainer } from '../BlurContainer';
import { PendingValue } from '../PendingValue';
import type { SwapDetailsCardProps } from './types';

const rowLayout = {
  display: 'flex',
  flexDirection: 'row' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `0 ${spacing.base}px`,
  height: componentSizes.swapDetailRowHeight,
  boxSizing: 'border-box' as const,
};

const Row = styled('div')({
  ...rowLayout,
  '& + &, .swap-details-disclosure + &': {
    borderTop: `1px solid ${colors.border.subtle}`,
  },
});

const DisclosureRow = styled('button')({
  ...rowLayout,
  width: '100%',
  background: 'none',
  border: 'none',
  borderTop: `1px solid ${colors.border.subtle}`,
  cursor: 'pointer',
  font: 'inherit',
});

const Card = styled('div')({
  padding: `${spacing.xs}px 0`,
});

const Label = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.slight,
  lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
});

const Value = styled(Typography)({
  ...tabularNums.css,
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.slight,
  lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
});

function DetailRow({ label, value, pending = false }: SwapDetailItem): React.ReactElement {
  return (
    <Row>
      <Label>{label}</Label>
      <Value>
        <PendingValue pending={pending}>{value}</PendingValue>
      </Value>
    </Row>
  );
}

export function SwapDetailsCard({
  rows,
  advancedRows = [],
  style,
}: SwapDetailsCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAdvanced = advancedRows.length > 0;

  return (
    // BlurContainer takes no data-testid; the wrapper carries the hook.
    <div style={style} data-testid="swap-details-card">
      <BlurContainer style={{ borderRadius: borderRadius.md, overflow: 'hidden' }}>
        <Card>
          {rows.map((row) => (
            <DetailRow key={row.label} {...row} />
          ))}
          {hasAdvanced && (
            <>
              <DisclosureRow
                type="button"
                className="swap-details-disclosure"
                data-testid="swap-details-disclosure"
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded((expanded) => !expanded)}
              >
                <Label>{t('swap.review.details', 'Details')}</Label>
                <span
                  style={{
                    display: 'inline-flex',
                    color: colors.text.secondary,
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <CaretDownIcon size={iconSize.sm} />
                </span>
              </DisclosureRow>
              {isExpanded && advancedRows.map((row) => <DetailRow key={row.label} {...row} />)}
            </>
          )}
        </Card>
      </BlurContainer>
    </div>
  );
}
