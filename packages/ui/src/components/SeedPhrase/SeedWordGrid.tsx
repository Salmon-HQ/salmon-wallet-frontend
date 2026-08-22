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
  semantic,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  componentSizes,
  tabularNums,
} from '@salmon/shared';
import type { SeedWordGridProps } from './types';

const Container = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: spacing.sm,
});

/**
 * The Bedrock Rule (DESIGN.md) governs the surface a seed phrase actually
 * rests on, and that is the cell rather than the screen behind it: the page
 * already stands on bedrock, so a translucent cell drawn over it puts a live
 * backdrop directly under the words. The cell takes the same opaque ground.
 */
const WordCard = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: semantic.surface.bedrock,
  border: `${borderWidth.thin}px solid ${colors.card.border}`,
  borderRadius: borderRadius.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  gap: spacing.xs,
});

/**
 * Seed Phrase Rule (DESIGN.md): cell numbers are `text.tertiary` at label
 * size so they are never mistaken for part of the phrase — the salmon accent
 * stays out of the numbers.
 */
const WordIndex = styled(Typography)({
  ...tabularNums.css,
  color: colors.text.tertiary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.label,
  minWidth: componentSizes.iconSizeSmall,
});

/**
 * Seed words are Geist Mono at the larger mono size, weight 500 (the Seed
 * Phrase Rule) — the most position-critical string in the app, read character
 * by character.
 */
const WordText = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
  fontSize: fontSize.monoLg,
  fontWeight: fontWeight.medium,
});

export function SeedWordGrid({ words, columns = 3 }: SeedWordGridProps) {
  const cardWidth = `calc(${100 / columns}% - ${spacing.sm}px)`;

  return (
    <Container>
      {words.map((word, index) => (
        <WordCard key={index} sx={{ width: cardWidth }} data-testid={`seed-word-cell-${index + 1}`}>
          <WordIndex>{index + 1}</WordIndex>
          <WordText>{word}</WordText>
        </WordCard>
      ))}
    </Container>
  );
}
