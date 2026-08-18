/**
 * OnboardingLayout — the React Native half of the onboarding slot grid.
 *
 * Every screen in the create, recover and unlock flows composes on this. The
 * reserved heights come from `resolveOnboardingGrid` in `@salmon/shared`, so
 * mobile and the DOM read one table instead of each re-deriving spacing per
 * screen. Nothing here decides a number.
 *
 * ## Two families, each internally rigid
 *
 * The `variant` prop picks the table. Within a family every slot's Y is
 * identical across its screens; between families the mark and the body differ
 * on purpose. Reading the grid as one table for all sixteen screens was too
 * literal — a screen that greets or authenticates is not shaped like one that
 * shows twelve words, and forcing both onto one table left a small mark
 * floating above an enormous void.
 *
 * ## Three rules do the rest
 *
 * 1. **Every slot occupies its reserved height whether or not it is filled.**
 *    A screen with no secondary action still leaves the band. So arriving at
 *    the screen that carries "What is a derivable?" reveals the link in space
 *    that was always there, and the button does not move.
 * 2. **The stack is one fixed height, and it is centred in the viewport.** It
 *    used to be anchored to the top with the leftover space dumped below the
 *    action, which put a hole through the middle of every screen. Centring
 *    splits the same leftover above and below. Because the stack's height does
 *    not vary within a family, every slot still lands at the same Y.
 * 3. **`body` is the give.** It is the only slot that shrinks and the only one
 *    that scrolls. Whatever the viewport is short by comes out of `body`
 *    first; only when `body` has reached zero and the stack still does not fit
 *    does anything else give, and then in a fixed order — description, then
 *    mark — so the degradation is a property of the viewport, not of the
 *    screen.
 *
 * ## The keyboard moves things only when it is actually in the way
 *
 * It used to sit under a `KeyboardAvoidingView` that shifted the whole column
 * by the keyboard's full height, plus a collapse of the mark and description
 * that fired whenever the keyboard was merely open — so tapping the seed field
 * pushed the brand mark clean off the top of the screen to clear a keyboard
 * the field was never behind.
 *
 * What happens instead is that the column's usable height is reduced by the
 * *overlap* between the keyboard and the column's own bottom edge, and by
 * nothing when there is no overlap. The stack then re-centres in what is left
 * and `body` pays, exactly as it does on a short device. So:
 *
 * - The seed screens, whose grid ends well above the keyboard, do not move.
 * - The password screens, whose bottom-pinned action the keyboard genuinely
 *   covers, lift by precisely the covered amount and no more.
 * - `body` scrolls the focused field into view within its own band.
 *
 * Android reports a keyboard height of zero on purpose: the manifest declares
 * `windowSoftInputMode="adjustResize"`, so the window shrinks and `onLayout`
 * already sees the smaller height.
 */
import { resolveOnboardingGrid, spacing, contentPadding } from '@salmon/shared';
import type { OnboardingLayoutPropsBase } from '@salmon/shared';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import { BrandMark } from '../BrandMark';

export interface OnboardingLayoutProps extends OnboardingLayoutPropsBase {
  /**
   * Painted behind the whole column. The seed screens pass
   * `semantic.surface.bedrock` — the Bedrock Rule allows no motif behind a
   * recovery phrase — and everything else leaves the water column showing.
   */
  backgroundColor?: string;
  /**
   * Rendered behind the stack — the water column, on the screens that carry
   * it. Mirrors the DOM twin's `background` prop: painted absolute-fill over
   * `backgroundColor` and under every slot, and it never takes a touch.
   */
  background?: ReactNode;
}

export function OnboardingLayout({
  chrome,
  mark,
  title,
  description,
  body,
  assist,
  secondary,
  action,
  variant = 'identity',
  scrollBody = false,
  backgroundColor,
  background,
  testID,
}: OnboardingLayoutProps) {
  // Measured rather than read off `Dimensions`: the grid has to react to the
  // height the column actually gets, insets and all, and `Dimensions` is the
  // window. Undefined until first layout, which resolves to the full grid —
  // safe, because the compact grid only ever reserves less.
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();

  // How much of the column the keyboard actually covers. The keyboard is
  // measured from the bottom of the window; the column already stops short of
  // it by the bottom safe-area inset, so that much of the keyboard overlaps
  // nothing. Zero whenever the keyboard is down — and zero on Android always,
  // where `adjustResize` has already shrunk the window `onLayout` measured.
  const occlusion = Math.max(0, keyboardHeight - insets.bottom);
  const available = measured === undefined ? undefined : Math.max(0, measured - occlusion);

  // The rung is chosen from the *unoccluded* height on purpose. Which grid a
  // screen is on is a property of the device, not of whether a keyboard
  // happens to be up — resolve it from `available` and opening the keyboard
  // would drop a description line, which is a slot moving for the exact reason
  // this component exists to prevent.
  const grid = resolveOnboardingGrid(variant, measured);

  const onLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0) setMeasured(height);
  };

  // What the stack actually gets, and how much room is left to centre it in.
  const height = available === undefined ? grid.stack : Math.min(grid.stack, available);
  const slack = Math.max(0, (available ?? grid.stack) - grid.stack);

  /**
   * What the stack is short by, once the keyboard has taken its bite.
   *
   * Zero is the normal case and nothing collapses — which is the whole point of
   * measuring occlusion rather than asking whether a keyboard is open. When it
   * is not zero the description goes first and the mark second: one is
   * explanatory, the other decorative, and neither is what the person is
   * looking at while they type. `body` still pays whatever is left, so the
   * field and the button that commits it stay put.
   *
   * **Only while the keyboard is actually up.** Without that guard this deleted
   * content on a device that was merely a few points short: an iPhone 17 has
   * 781pt of layout height once the Dynamic Island and the home indicator are
   * taken out, against a 793 stack, and that 12pt shortfall removed the whole
   * description — so the welcome screen showed "Salmon" with no "Welcome"
   * under it on iOS while Android, with 876dp and no shortfall at all, showed
   * both. A 12pt difference must never cost a line of copy. Off the keyboard
   * path `body` absorbs the shortfall and then scrolls, and nothing is ever
   * removed.
   *
   * Letting `body` absorb the whole shortfall first was the earlier reading and
   * it produced the defect the product owner found on a Pixel 9 Pro: with the
   * keyboard up, `body` was squeezed to 52dp and the seed grid's fourth row —
   * cells 10 to 12 — sat under the keyboard, unreachable. Giving up 168dp of
   * decoration instead leaves `body` 220dp, which holds the whole twelve-word
   * grid.
   *
   * These are properties of the viewport and the keyboard, never of the screen,
   * so two screens on one device always degrade together and their slots stay
   * in step.
   */
  const shortfall = available === undefined ? 0 : Math.max(0, grid.stack - available);
  const dropDescription = occlusion > 0 && shortfall > 0;
  const dropMark = occlusion > 0 && shortfall > grid.description;

  const bodyContent = scrollBody ? (
    <ScrollView
      contentContainerStyle={styles.bodyScrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  return (
    // The ground is painted by this outer view, not by the SafeAreaView: an
    // absolute-fill `background` inside the SafeAreaView would be inset by the
    // safe-area padding, leaving unpainted bars at the notch and home
    // indicator. Out here it runs edge to edge, exactly like the DOM twin's.
    <View style={[styles.root, backgroundColor ? { backgroundColor } : null]} testID={testID}>
      {background != null && (
        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
          testID="onboarding-background"
        >
          {background}
        </View>
      )}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.column} onLayout={onLayout} testID="onboarding-column">
          <View style={[styles.stack, { height, marginTop: slack / 2 }]} testID="onboarding-stack">
            <View style={[styles.slot, { height: grid.chrome }]} testID="onboarding-slot-chrome">
              {chrome}
            </View>

            {/*
            Reserved empty run, never a slot. A family that needs less `body`
            than its siblings gives the difference back here rather than
            leaving it as a hole under the description — which is what drops
            the mark, title and description into the middle of the region they
            share with `body`. Zero on the families whose `body` is full.
          */}
            {grid.lead > 0 && <View style={{ height: grid.lead }} testID="onboarding-lead" />}

            {!dropMark && (
              <View style={[styles.centered, { height: grid.mark }]} testID="onboarding-slot-mark">
                {mark ?? <BrandMark size={grid.markSize} />}
              </View>
            )}

            <View
              style={[styles.padded, styles.title, { minHeight: grid.title }]}
              testID="onboarding-slot-title"
            >
              {title}
            </View>

            {!dropDescription && (
              <View
                style={[styles.padded, styles.description, { minHeight: grid.description }]}
                testID="onboarding-slot-description"
              >
                {description}
              </View>
            )}

            <View style={[styles.body, { height: grid.body }]} testID="onboarding-slot-body">
              {bodyContent}
            </View>

            <View style={[styles.padded, { height: grid.assist }]} testID="onboarding-slot-assist">
              {assist}
            </View>

            <View
              style={[styles.padded, { height: grid.secondary }]}
              testID="onboarding-slot-secondary"
            >
              {secondary}
            </View>

            <View style={[styles.action, { height: grid.action }]} testID="onboarding-slot-action">
              {action}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  /**
   * One fixed height, so centring it cannot make any slot's Y depend on what
   * the screen happens to contain.
   */
  stack: {
    width: '100%',
  },
  slot: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  /**
   * The mark sits at the *bottom* of its band, for the same reason the title
   * does: the band is the mark plus the gap under it, and centring the ink left
   * half that gap hanging above the mark where it met the title's unused second
   * line. On the welcome screen that put 48dp between the mark and the word
   * "Salmon" — the product owner's "el icono + salmon deben ir más pegados".
   *
   * Anchoring it down closes 18 of those and moves no slot: the band keeps its
   * reserved height, so everything below it is exactly where it was.
   */
  centered: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  padded: {
    flexShrink: 0,
    paddingHorizontal: contentPadding.screen,
    justifyContent: 'center',
  },
  /**
   * The title sits at the *bottom* of its band and the description at the
   * *top* of its own, so the space each reserves for a second line that did not
   * come collects outside the pair rather than between them.
   *
   * Both bands reserve two rendered lines because Spanish expands, and on the
   * welcome screen — "Salmon" over "Welcome", one line each — that left 21dp
   * hanging under the title and 24dp over the description, which met as a 45dp
   * hole with no rationale anyone could name. It was residue, not spacing.
   *
   * Anchoring the pair inward leaves exactly `spacing.md` between them, which
   * is the gap the title's own reserved height was derived from
   * (`2 * titleLine + spacing.md`). It also makes the rhythm identical whether
   * a string wraps or not: the title always ends at the same Y and the
   * description always begins at one, where centring moved both by half a line
   * every time a translation wrapped.
   */
  title: {
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  description: {
    justifyContent: 'flex-start',
  },
  /**
   * The only slot that may shrink. `minHeight: 0` is what lets it actually
   * reach zero — without it a tall child would push the stack past its own
   * height and take the action off the bottom of the screen.
   */
  body: {
    flexShrink: 1,
    minHeight: 0,
    paddingHorizontal: contentPadding.screen,
  },
  bodyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.sm,
  },
  action: {
    flexShrink: 0,
    paddingHorizontal: contentPadding.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
});
