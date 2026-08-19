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
 * **Height is `fontSize.headline`** — the same token the `Text` it replaced set
 * its size from, so the drawn name and the flow's heading stay locked together.
 * It was briefly enlarged and then taken back down at the product owner's
 * request ("más chico quiero el Salmon en mobile, volvamos al tamaño anterior").
 *
 * One caveat worth knowing before anyone tunes this again: a `Text`'s box is its
 * *line* box and a vector's box is the *glyph* bounding box, so a wordmark drawn
 * at the token renders slightly more ink than text set at the same token — there
 * is no leading above and below it. Matching the old ink exactly would need a
 * cap-height factor, which is a magic number; one token that cannot drift is
 * worth more than a few points of exactness here.
 *
 * **It centres itself.** An `Svg` has an intrinsic width and no `textAlign`, so
 * in the `title` band — a column that pads its sides and does not centre its
 * children, because the `Text` it used to hold centred its own glyphs — it sat
 * flush against the left padding at x=24 on both platforms while the mark above
 * it was centred. Any vector dropped into a slot has this problem, so the
 * component owns the fix rather than the slot.
 *
 * **The gap over it is pinned.** The band is bottom-anchored, so `marginBottom:
 * 'auto'` lifts the wordmark to the top of it and `marginTop` sets the distance
 * from the mark explicitly — `onboardingMarkTitleGap`, the grid's own
 * fish→title air, so welcome's fish→wordmark distance is the same one success
 * has between its mark and "Congratulations!" (owner, 2026-08-18). Pinning it
 * means resizing the wordmark changes the wordmark and nothing else; leaving
 * it to the band's spare room made the gap a side-effect of the height.
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
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** The token the `Text` this replaced set its size from. */
const DEFAULT_HEIGHT = fontSize.headline;

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
      style={styles.wordmark}
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

const styles = StyleSheet.create({
  wordmark: {
    // The band pads its sides and does not centre its children; a vector has
    // no `textAlign` to centre itself with, so it says where it goes.
    alignSelf: 'center',
    // Lift to the top of a bottom-anchored band, then set the distance from
    // the mark explicitly rather than inheriting whatever room is left over.
    marginBottom: 'auto',
    marginTop: onboardingMarkTitleGap,
  },
});
