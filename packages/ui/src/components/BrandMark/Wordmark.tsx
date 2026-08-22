/**
 * Wordmark — the product's name, drawn, for the DOM.
 *
 * The welcome screen rendered "Salmon" as live text in the flow's title token,
 * which made the product's name subject to font loading, fallback substitution
 * and text scaling in the one place the brand can least afford it — and meant
 * the only way to size the name was the shared title token, which every other
 * heading also reads. Drawing `wordmarkPaths` makes the name a graphic on the
 * same single-`fill` contract as the mark above it.
 *
 * The React Native twin is `apps/mobile/src/components/BrandMark/Wordmark.tsx`;
 * both read the generated outlines from `@salmon/shared` rather than either
 * owning the geometry. Two behaviours are deliberately mirrored from it:
 *
 * - **It centres itself.** The `title` band pads its sides and does not centre
 *   its children — the text it used to hold centred its own glyphs. An `<svg>`
 *   has an intrinsic width and no `textAlign`, so without `alignSelf` it sits
 *   flush against the band's left padding under a centred mark.
 * - **The gap over it is pinned.** The band is bottom-anchored, so
 *   `marginBottom: 'auto'` lifts the wordmark to the top of it and `marginTop`
 *   sets the distance from the mark explicitly — `onboardingMarkTitleGap`, the
 *   grid's own fish→title air, so welcome's fish→wordmark distance is the same
 *   one success has between its mark and "Congratulations!" (owner, 2026-08-18).
 */
import {
  fontSize,
  onboardingMarkTitleGap,
  semantic,
  wordmarkAspectRatio,
  wordmarkPaths,
  wordmarkText,
  wordmarkViewBoxAttr,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';

/** The token the `OnboardingTitle` this replaces set its size from. */
const DEFAULT_HEIGHT = fontSize.headline;

export interface WordmarkProps extends Testable {
  /** Drawn height in px. Width follows the aspect ratio. */
  height?: number;
  /** Ink. White, like the mark it sits under. */
  color?: string;
}

export function Wordmark({
  height = DEFAULT_HEIGHT,
  color = semantic.text.primary,
  testID = 'wordmark',
}: WordmarkProps): React.ReactElement {
  return (
    <svg
      data-testid={testID}
      width={height * wordmarkAspectRatio}
      height={height}
      viewBox={wordmarkViewBoxAttr}
      fill={color}
      focusable="false"
      // It is the product's name, not decoration: a screen reader must still
      // read it, and it is the only thing naming this screen.
      role="heading"
      aria-level={1}
      aria-label={wordmarkText}
      style={{
        display: 'block',
        flexShrink: 0,
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: onboardingMarkTitleGap,
      }}
    >
      {wordmarkPaths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
