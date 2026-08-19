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
 *    The hero pair (`identity`, `lock`) is the exception (owner, 2026-08-18):
 *    its fish is centred on the SCREEN — the stack fills the column, a
 *    computed lead drops the mark band's centre to half the screen height,
 *    what the screen has under the fish flows down from it, and the actions
 *    anchor at the bottom. `body` absorbs the leftover between the two.
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
import {
  contentPadding,
  identityClusterCenterOffset,
  resolveOnboardingGrid,
  spacing,
} from '@salmon/shared';
import type { OnboardingLayoutPropsBase } from '@salmon/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import { SINK_FLOAT_STAGGER_MS, floatEntering } from '../../utils/sinkAndFloat';
import { BrandMark } from '../BrandMark';

/**
 * The sink and the float, spoken between onboarding steps.
 *
 * The auth Stack keeps `animation: 'none'` — deliberately, see
 * `app/(auth)/_layout.tsx`: the navigator animating would take the chrome
 * (chevron, step dots) and the shared water ground along for the ride, which
 * is exactly what the owner rejected about `slide_from_right`. So the
 * transition lives here instead, one layer down: only the slots between
 * `chrome` and `action` travel — the furniture that is already at the same Y
 * on the next screen holds still, and the content floats up into place.
 *
 * Both directions are the same gesture (the water has no left and right), so
 * back-navigation floats too: the navigator keeps a revealed screen mounted,
 * which means `entering` alone would only ever fire on push — the region is
 * re-keyed on every non-initial focus so the float runs on the way back as
 * well.
 *
 * The sink half cannot run here: with `animation: 'none'` the outgoing screen
 * is detached the same frame the incoming one arrives, so there is no window
 * for its content to sink through. The exit is the navigator's cut — which is
 * the fade-through economy anyway (exit near-instant, entrance carries the
 * verb). Recorded in DESIGN.md §The sink and the float.
 *
 * Reduce motion: `floatEntering` returns `undefined` and the step change is
 * the instant cut it was before.
 */
/**
 * The beat before an onboarding float. The exit here is the navigator's cut
 * (see above), so there is no sink to wait out and `FLOAT_DELAY_MS` — sized
 * to cover a full sink — would read as lag. A small beat of its own still
 * separates the cut from the float so the arrival reads as a gesture, not a
 * glitch. Owner-tunable; 0 is a legal value (float starts with the cut).
 */
const FLOAT_REGION_DELAY_MS = 90;

/**
 * The slots do not arrive as one slab: they surface in bands, each band one
 * `SINK_FLOAT_STAGGER_MS` behind the last — the same 24ms step the
 * Surfacing's chrome uses (owner's band: 24–40). Four steps for six slots
 * (mark / title+description / body / assist+secondary), which keeps the
 * group inside the system's 4–5-step ceiling.
 */
function FloatRegion({ children }: { children: ReactNode }) {
  const [arrival, setArrival] = useState(0);
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // Mount already runs the slots' `entering`; re-keying on the first
      // focus would restart the float a frame in for no reason.
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setArrival((count) => count + 1);
    }, [])
  );
  // The key remounts the subtree on every non-initial focus, which is what
  // re-fires each slot's own `entering` — the staggered floats live on the
  // slots themselves (see `bandEntering` below).
  return (
    <View key={arrival} style={styles.floatRegion}>
      {children}
    </View>
  );
}

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
  /**
   * Float the content slots in on every arrival at this screen — the
   * onboarding flow's expression of the sink and the float (see `FloatRegion`
   * above). Only screens inside a navigator may pass it: it reads the focus
   * signal. `chrome` and `action` never travel.
   */
  float?: boolean;
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
  float = false,
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

  // The hero pair centres its fish on the screen (owner, 2026-08-18), so its
  // stack fills the column and the actions sit at the bottom; the other
  // families keep the fixed stack centred in the viewport.
  const centersCluster = variant === 'identity' || variant === 'lock';

  // What the stack actually gets, and how much room is left to centre it in.
  const height =
    available === undefined
      ? grid.stack
      : centersCluster
        ? available
        : Math.min(grid.stack, available);
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

  /**
   * The centring lead — an empty run between `chrome` and the mark that puts
   * the mark band's centre at half the SCREEN height on the hero pair
   * (owner, 2026-08-18: "el pez va centrado en la pantalla"). The column
   * excludes the safe areas, so the screen's centre is recovered by adding
   * them back; the grid cannot carry this number because it depends on the
   * device's height. Clamped so `body` never drops below the tallest content
   * the cluster family holds (`grid.minStack`) — when a short viewport, or
   * the keyboard's bite out of `available`, cannot hold a centred fish, the
   * fish rises just enough and both doors clamp to the same Y.
   */
  let lead = 0;
  if (centersCluster && available !== undefined && !dropMark) {
    const screenCenter = (available + insets.top + insets.bottom) / 2 - insets.top;
    lead = Math.max(
      0,
      Math.min(
        screenCenter + identityClusterCenterOffset - grid.chrome - grid.mark / 2,
        available - grid.minStack
      )
    );
  }

  // On the hero pair `body` takes whatever sits between the flowing cluster
  // and the bottom-anchored bands, so the input flows right under the title
  // and the leftover collects above `assist` instead of moving the actions.
  const bands =
    grid.chrome +
    (dropMark ? 0 : grid.mark) +
    grid.title +
    (dropDescription ? 0 : grid.description) +
    grid.assist +
    grid.secondary +
    grid.action;
  const bodyHeight = centersCluster ? Math.max(0, height - bands - lead) : grid.body;

  // Everything between `chrome` and `action` — the region that travels when
  // `float` is on. Heights are all reserved per slot, so grouping them in a
  // wrapper changes no Y.
  //
  // Each slot floats in on its band's own delay: base beat plus
  // `band × SINK_FLOAT_STAGGER_MS`. Bands, top to bottom: mark (0),
  // title + description (1), body (2), assist + secondary (3). When `float`
  // is off (or under reduce motion) `entering` is undefined and the slots
  // render exactly as before.
  const isReduceMotionEnabled = useReducedMotion();
  const bandEntering = (band: number) =>
    float
      ? floatEntering(isReduceMotionEnabled, {
          delayMs: FLOAT_REGION_DELAY_MS + band * SINK_FLOAT_STAGGER_MS,
        })
      : undefined;
  const slots = (
    <>
      {/*
        The centring lead, never a slot: the empty run that drops the
        hero fish to the middle of the screen. Zero on the families that
        do not centre their mark, and before first measurement.
      */}
      {lead > 0 && <View style={{ height: lead }} testID="onboarding-lead" />}

      {!dropMark && (
        <Animated.View
          entering={bandEntering(0)}
          style={[styles.centered, { height: grid.mark }]}
          testID="onboarding-slot-mark"
        >
          {mark ?? <BrandMark size={grid.markSize} />}
        </Animated.View>
      )}

      <Animated.View
        entering={bandEntering(1)}
        style={[styles.padded, styles.title, { minHeight: grid.title }]}
        testID="onboarding-slot-title"
      >
        {title}
      </Animated.View>

      {!dropDescription && (
        <Animated.View
          entering={bandEntering(1)}
          style={[styles.padded, styles.description, { minHeight: grid.description }]}
          testID="onboarding-slot-description"
        >
          {description}
        </Animated.View>
      )}

      <Animated.View
        entering={bandEntering(2)}
        style={[styles.body, { height: bodyHeight }]}
        testID="onboarding-slot-body"
      >
        {scrollBody ? (
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
        )}
      </Animated.View>

      <Animated.View
        entering={bandEntering(3)}
        style={[styles.padded, { height: grid.assist }]}
        testID="onboarding-slot-assist"
      >
        {assist}
      </Animated.View>

      <Animated.View
        entering={bandEntering(3)}
        style={[styles.padded, { height: grid.secondary }]}
        testID="onboarding-slot-secondary"
      >
        {secondary}
      </Animated.View>
    </>
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
          <View
            style={[styles.stack, { height, marginTop: centersCluster ? 0 : slack / 2 }]}
            testID="onboarding-stack"
          >
            <View style={[styles.slot, { height: grid.chrome }]} testID="onboarding-slot-chrome">
              {chrome}
            </View>

            {/* The travelling region: everything between the chrome above and
                the action below. When `float` is on, arriving at the screen
                floats these slots up into place; the furniture stays put. */}
            {float ? <FloatRegion>{slots}</FloatRegion> : slots}

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
  /**
   * Transparent grouping only: every child carries its own reserved height, so
   * the region auto-sizes to their sum and no slot's Y moves. `flexShrink`
   * mirrors the slots' own behaviour inside the fixed-height stack.
   */
  floatRegion: {
    flexShrink: 1,
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
  /**
   * Top-anchored, not centred (owner, 2026-08-18, with the recover → password
   * alignment): `body`'s first line lands at the band's top on every screen,
   * so two consecutive steps put their first row at the same Y by
   * construction — the seed grid's first row and the password field share a
   * Y because they share a band edge, not because two contents happen to be
   * the same height. Centring made the first line a function of how tall the
   * body content was, which is exactly the per-screen drift the grid exists
   * to prevent. Leftover collects below, like everywhere else in the stack.
   */
  bodyScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: spacing.sm,
  },
  action: {
    flexShrink: 0,
    paddingHorizontal: contentPadding.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
});
