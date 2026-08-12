/**
 * SeedWordGrid - Displays mnemonic words in a numbered grid
 *
 * Web version using MUI and @emotion/styled for browser extension.
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  componentSizes,
} from '@salmon/shared';
import type { SeedWordGridProps } from './types';

const Container = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: spacing.sm,
});

const WordCard = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.card.background,
  border: `${borderWidth.thin}px solid ${colors.card.border}`,
  borderRadius: borderRadius.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  gap: spacing.xs,
});

const WordIndex = styled(Typography)({
  color: colors.accent.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.sm,
  minWidth: componentSizes.iconSizeSmall,
});

const WordText = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.base,
});

export function SeedWordGrid({ words, columns = 3 }: SeedWordGridProps) {
  const cardWidth = `calc(${100 / columns}% - ${spacing.sm}px)`;

  return (
    <Container>
      {words.map((word, index) => (
        <WordCard key={index} sx={{ width: cardWidth }}>
          <WordIndex>{index + 1}</WordIndex>
          <WordText>{word}</WordText>
        </WordCard>
      ))}
    </Container>
  );
}
