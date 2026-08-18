/**
 * Wordmark — the product's name, drawn.
 *
 * The welcome screen rendered "Salmon" as live text in the flow's title token.
 * That was wrong twice over. It made the product's name subject to whether the
 * font loaded, to OS text scaling and to a fallback face substituting itself —
 * in the one place the brand can least afford it — and it meant the only way to
 * make the name bigger was to raise the shared title token, which would have
 * enlarged every heading in the flow and broken FR-008's one-title-token rule.
 *
 * `wordmarkPaths` already exists for exactly this: generated from the interface
 * typeface by `scripts/wordmark.py`, on the same single-`fill` contract as the
 * mark. Drawing it makes the name a graphic, so it is sized independently of
 * the title token and the flow keeps one heading size.
 *
 * Default height is the two rendered title lines the `title` band reserves,
 * less one `spacing.md`. The band is bottom-anchored, so that subtraction
 * surfaces as air *above* the wordmark: measured on device, filling the band
 * exactly put the wordmark's cap height flush against the mark's lower fin at
 * a 0.0dp gap, which is tighter than a lockup reads. Giving the gap back as
 * `spacing.md` puts the mark and the name on the same rhythm the title and
 * description use everywhere else, and the wordmark still lands 1.6x the size
 * the title token drew it at.
 *
 * Every term comes from the tokens the grid derives that band from, so the two
 * cannot drift apart.
 */
import {
  fontSize,
  lineHeight,
  semantic,
  spacing,
  wordmarkAspectRatio,
  wordmarkPaths,
  wordmarkText,
  wordmarkViewBoxAttr,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import Svg, { Path } from 'react-native-svg';

/** One rendered line of the flow's title. The band reserves two. */
const TITLE_LINE = Math.round(fontSize.headline * lineHeight.tight);

/** The band, less the gap that keeps the mark off the wordmark's cap height. */
const DEFAULT_HEIGHT = 2 * TITLE_LINE - spacing.md;

export interface WordmarkProps extends Testable {
  /** Drawn height. Width follows the aspect ratio. */
  height?: number;
  /** Ink. White, like the mark it sits under. */
  color?: string;
}

export function Wordmark({
  height = DEFAULT_HEIGHT,
  color = semantic.text.primary,
  testID,
}: WordmarkProps) {
  return (
    <Svg
      testID={testID ?? 'wordmark'}
      width={height * wordmarkAspectRatio}
      height={height}
      viewBox={wordmarkViewBoxAttr}
      // It is the product's name, not decoration: a screen reader must still
      // read it, and it is the only thing naming this screen.
      accessibilityRole="header"
      accessibilityLabel={wordmarkText}
    >
      {wordmarkPaths.map((d) => (
        <Path key={d.slice(0, 24)} d={d} fill={color} />
      ))}
    </Svg>
  );
}
