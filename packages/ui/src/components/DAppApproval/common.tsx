import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '@salmon/shared';
import { styled } from '../../utils/styled';

export const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: '100vh',
  maxHeight: '100vh',
  boxSizing: 'border-box',
  padding: spacing.lg,
  background: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 100%)`,
  fontFamily: fontFamily.sans,
  overflow: 'hidden',
});

export const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 360,
  margin: '0 auto',
  minHeight: 0,
  boxSizing: 'border-box',
  padding: spacing.lg,
  gap: spacing.lg,
});

export const Header = styled(Box)({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: spacing.md,
  paddingTop: spacing.sm,
});

export const LogoWrap = styled(Box)({
  width: 72,
  height: 72,
  borderRadius: borderRadius.full,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(circle at top, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 52%, rgba(255, 255, 255, 0.02) 100%)',
  border: `1px solid ${colors.border.subtle}`,
  boxShadow: '0 18px 48px rgba(0, 0, 0, 0.3)',
});

/**
 * The wallet's own mark inside the approval header.
 *
 * This is a security surface: the mark is how a user tells the real wallet
 * from a page dressed up as one, so it is drawn from the vector rather than
 * fetched as a 197x183 raster and letterboxed into a square. Crispness is not
 * decoration here — a soft or wrong mark on an approval prompt is closer to a
 * phishing problem than an aesthetic one. `MARK_SIZE` is the drawn width the
 * PNG's square box produced after `objectFit: contain`, so nothing moves.
 */
export const MARK_SIZE = 38;

export const Title = styled(Typography)({
  fontSize: fontSize.title,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  textAlign: 'center',
  letterSpacing: '-0.02em',
});

export const Subtitle = styled(Typography)({
  maxWidth: 300,
  fontSize: fontSize.base,
  color: colors.text.secondary,
  textAlign: 'center',
  lineHeight: 1.5,
});

export const ScrollArea = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  paddingRight: spacing.xs,
  marginRight: -spacing.xs,
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.border.default,
    borderRadius: borderRadius.full,
  },
});

export const Card = styled(Box)({
  width: '100%',
  boxSizing: 'border-box',
  padding: spacing.xl,
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.045) 100%)',
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: borderRadius.xl,
  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.2)',
});

export const Label = styled(Typography)({
  fontSize: fontSize.xs,
  color: colors.text.secondary,
  fontWeight: fontWeight.medium,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: spacing.xs,
});

export const Value = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
});

export const AppIdentityRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  marginBottom: spacing.sm,
});

export const AppIdentityIcon = styled('img')({
  width: 40,
  height: 40,
  borderRadius: borderRadius.md,
  objectFit: 'cover',
  flexShrink: 0,
  border: `1px solid ${colors.border.subtle}`,
  backgroundColor: colors.interactive.surface,
});

export const AppIdentityText = styled(Box)({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs / 2,
});

export const AppIdentityName = styled(Typography)({
  fontSize: fontSize.bodyLg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  wordBreak: 'break-word',
});

export const MonoValue = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  fontFamily: fontFamily.mono,
  wordBreak: 'break-all',
  marginTop: spacing.sm,
});

export const ButtonsContainer = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
  flexShrink: 0,
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
  background: 'transparent',
});

export const SummaryGrid = styled(Box)({
  display: 'grid',
  width: '100%',
  // Single full-width column: each field is its own list row spanning the whole
  // parent width, which is more readable than a cramped 2-up grid for long
  // values. `minmax(0, 1fr)` (not the implicit `minmax(auto, 1fr)` of `1fr`)
  // lets the column shrink below its content, so long unbreakable values (base58
  // addresses, URIs) wrap instead of forcing the grid wider than its parent.
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: spacing.md,
});

export const SummaryItem = styled(Box)({
  minWidth: 0,
  boxSizing: 'border-box',
  overflow: 'hidden',
  padding: `${spacing.md}px ${spacing.md + spacing.xs / 2}px`,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.interactive.surface,
  border: `1px solid ${colors.border.subtle}`,
});

export const SummaryLabel = styled(Typography)({
  fontSize: fontSize.xs,
  color: colors.text.secondary,
  fontWeight: fontWeight.medium,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: spacing.xs,
});

export const SummaryValue = styled(Typography)({
  ...tabularNums.css,
  minWidth: 0,
  fontSize: fontSize.base,
  color: colors.text.primary,
  fontWeight: fontWeight.semibold,
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
});

export const Divider = styled(Box)({
  width: '100%',
  height: 1,
  backgroundColor: colors.border.subtle,
  margin: `${spacing.sm}px 0`,
});

export const FooterNote = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
});

/**
 * Icon + label header for a card section. Pairs a small line icon with the
 * uppercase {@link Label}, giving each card a scannable identity.
 */
export const SectionHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  marginBottom: spacing.md,
});

/** Shared sizing/color for the small line icons used in section headers. */
export const sectionIconSx = {
  fontSize: 18,
  color: colors.text.secondary,
  flexShrink: 0,
} as const;

/**
 * Icon + note row for a security or informational hint at the foot of a card.
 * The icon anchors the note visually without competing with it.
 */
export const HintRow = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.sm,
  marginTop: spacing.lg,
});

export const hintIconSx = {
  fontSize: 16,
  color: colors.text.secondary,
  flexShrink: 0,
  marginTop: '1px',
} as const;

/**
 * Inset, scrollable surface for verbatim content the user must read exactly as
 * it will be signed (raw SIWS text, raw sign payloads, parsed OCMS content).
 */
export const MessageSurface = styled(Box)({
  width: '100%',
  boxSizing: 'border-box',
  maxHeight: 220,
  overflowY: 'auto',
  overflowX: 'hidden',
  backgroundColor: colors.interactive.surface,
  borderRadius: borderRadius.lg,
  padding: spacing.lg,
  border: `1px solid ${colors.border.subtle}`,
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.border.default,
    borderRadius: borderRadius.full,
  },
});

export const MessageText = styled(Typography)({
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: 400,
  lineHeight: 1.55,
  color: colors.text.primary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'normal',
  overflowWrap: 'anywhere',
});

// WarningNotice was promoted to its own shared component; re-exported here so
// the approval views (and any external consumer of this module) keep working.
export { WarningNotice } from '../WarningNotice';
