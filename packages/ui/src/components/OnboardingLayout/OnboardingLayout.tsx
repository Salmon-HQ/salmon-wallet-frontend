/**
 * OnboardingLayout — the DOM half of the onboarding slot grid.
 *
 * Every screen in the create, recover and unlock flows on web and extension
 * composes on this. The reserved heights come from `resolveOnboardingGrid` in
 * `@salmon/shared`, so the DOM and React Native read one table instead of each
 * re-deriving spacing per screen. Nothing here decides a number.
 *
 * The React Native twin is `apps/mobile/src/components/OnboardingLayout`, and
 * the two carry the same slot `testID`s (`onboarding-slot-*`) so a mobile and a
 * DOM screen can be compared like for like.
 *
 * ## Two families, each internally rigid
 *
 * The `variant` prop picks the table. Within a family every slot's Y is
 * identical across its screens; between families the mark and the body differ
 * on purpose — a screen that greets or authenticates is not shaped like one
 * that shows twelve words.
 *
 * ## Three rules do the rest
 *
 * 1. **Every slot occupies its reserved height whether or not it is filled.**
 *    A screen that shares its family with one carrying a secondary action
 *    still leaves the band, so arriving at the screen with "What is a
 *    derivable?" reveals the link in space that was always there and the
 *    button does not move. The one band a screen genuinely never shares is
 *    the exception: a screen that passes no secondary at all hands that height
 *    to `body` and lets `assist` sit directly over the action — see
 *    `resolveOnboardingBands`. The stack is unchanged, so `action` is not.
 *    **The assist band collapses on the same terms**: reserving it protects no
 *    sibling, because giving its height back to `body` moves nothing, and an
 *    empty band is what pushes a short screen's body past its floor and into a
 *    scroll.
 * 2. **The stack is one fixed height, and it is centred in the viewport.**
 *    Because the stack's height does not vary within a family, every slot
 *    lands at the same Y on every screen of that family.
 *    The hero pair (`identity`, `lock`) is the exception (owner, 2026-08-18):
 *    its fish is centred on the SCREEN — the stack fills the column, a
 *    computed lead drops the mark band's centre to half the surface height,
 *    what the screen has under the fish flows down from it, and the actions
 *    anchor at the bottom. `body` absorbs the leftover between the two.
 * 3. **`body` is the give.** It is the only slot that shrinks and the only one
 *    that scrolls. Whatever the viewport is short by comes out of `body`
 *    first; only when `body` has reached zero does anything else give, and
 *    then in a fixed order — description, then mark — so the degradation is a
 *    property of the viewport, not of the screen.
 *
 * Rule 3 is what makes the action reachable on the extension's action popup,
 * where the surface is ~360x600 with `overflow: hidden` and content past the
 * fold is clipped rather than scrollable. The popup is a degraded first-click
 * state, not a target surface (spec 013, decision 3): the stack fills whatever
 * height it is given, `body` scrolls inside it, and the bands below `body`
 * stay pinned — so the primary action is on screen at 600px as it is at 956.
 *
 * ## Measuring the viewport rather than assuming `100vh`
 *
 * The column is measured with a `ResizeObserver`, and the soft keyboard is
 * measured from `window.visualViewport` — the audit found no `dvh`, no `svh`
 * and no `visualViewport` listener anywhere in this flow, with the containers
 * at `100vh` inside an `overflow: hidden` parent, so a soft keyboard hid the
 * action with no way to scroll to it. Only the *overlap* between the keyboard
 * and the column counts, so a keyboard that covers nothing moves nothing.
 */
import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';
import {
  colors,
  contentPadding,
  identityClusterCenterOffset,
  motionEasing,
  reducedMotion,
  resolveOnboardingBands,
  resolveOnboardingGrid,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  spacing,
  type OnboardingLayoutPropsBase,
} from '@salmon/shared';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { styled } from '../../utils/styled';
import { BrandMark } from '../BrandMark';
import { waterColumnHost } from '../WaterColumn';

export interface OnboardingLayoutProps extends OnboardingLayoutPropsBase {
  /** Painted behind the whole column. Defaults to the app ground. */
  backgroundColor?: string;
  /** Rendered behind the stack — the water column, on the screens that carry it. */
  background?: React.ReactNode;
  /**
   * The content has given way to a wait, and sinks (DESIGN.md §The sink and
   * the float — the transition verb). Only the column travels: the ground
   * passed as `background` is a sibling of it and stays where it is, because
   * the water is the ground and the ground never travels (§Motion, "The wait
   * owns its passage, end to end"). Transform and opacity, so no slot's
   * reserved height and no slot's Y changes while it goes down.
   */
  sunk?: boolean;
}

/**
 * How much of the column the soft keyboard covers.
 *
 * `visualViewport.height` shrinks when the keyboard opens; the difference
 * against the layout viewport is the keyboard. Zero on a desktop browser, and
 * zero whenever the keyboard is down.
 */
function useKeyboardOcclusion(): number {
  const [occlusion, setOcclusion] = useState(0);

  useEffect(() => {
    const vv = typeof window === 'undefined' ? undefined : window.visualViewport;
    if (!vv) return undefined;

    const measure = () => {
      setOcclusion(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    measure();
    vv.addEventListener('resize', measure);
    vv.addEventListener('scroll', measure);
    return () => {
      vv.removeEventListener('resize', measure);
      vv.removeEventListener('scroll', measure);
    };
  }, []);

  return occlusion;
}

/** The column's own height, remeasured whenever the surface resizes. */
function useMeasuredHeight(ref: React.RefObject<HTMLElement | null>): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const measure = () => {
      const next = node.getBoundingClientRect().height;
      if (next > 0) setHeight(next);
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}

const Root = styled(Box)({
  // A stacking context, so a `<WaterColumn />` passed as `background` paints
  // above this element's own fill and below every slot.
  ...waterColumnHost,
  display: 'flex',
  backgroundColor: colors.background.primary,
  flexDirection: 'column',
  width: '100%',
  // `100dvh` rather than `100vh`: the audit found neither here, and on a
  // mobile browser the difference is the URL bar hiding the primary action.
  height: '100dvh',
  minHeight: '100dvh',
  overflow: 'hidden',
});

/**
 * The column leaving under a wait. It stays mounted while it goes down — the
 * wait's overlay covers it — so a failure puts it back exactly where it was,
 * and a success keeps it down: what the departing wave uncovers is the water
 * alone, never the content that already left.
 */
const sinkAwayKeyframes = keyframes`
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(${SINK_FLOAT_TRAVEL}px); }
`;

const Column = styled(Box)<{ $sunk: boolean }>(({ $sunk }) => ({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  animation: $sunk ? `${sinkAwayKeyframes} ${SINK_OUT_MS}ms ${motionEasing.sink.css} both` : 'none',
  // Reduce motion is the same decision with no travel, never a hole.
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
    opacity: $sunk ? 0 : 1,
  },
}));

const Stack = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

const Slot = styled(Box)({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

const Padded = styled(Slot)({
  paddingLeft: contentPadding.screen,
  paddingRight: contentPadding.screen,
});

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
  sunk = false,
  testID,
}: OnboardingLayoutProps): React.ReactElement {
  const columnRef = useRef<HTMLDivElement>(null);
  const measured = useMeasuredHeight(columnRef);
  const occlusion = useKeyboardOcclusion();

  const available = measured === undefined ? undefined : Math.max(0, measured - occlusion);

  // The rung is chosen from the *unoccluded* height on purpose: which grid a
  // screen is on is a property of the surface, not of whether a keyboard
  // happens to be up. Resolving it from `available` would drop a description
  // line when the keyboard opened, which is a slot moving for the exact reason
  // this component exists to prevent.
  // The screen's own table: a screen that passes no secondary hands that band
  // to `body` and drops its assist onto the action, per
  // `resolveOnboardingBands`. The stack is the same either way, so `action`
  // does not move.
  const grid = resolveOnboardingBands(
    resolveOnboardingGrid(variant, measured),
    secondary != null,
    assist != null
  );

  // The hero pair centres its fish on the screen (owner, 2026-08-18), so its
  // stack fills the column and the actions sit at the bottom; the other
  // families keep the fixed stack centred in the viewport.
  const centersCluster = variant === 'identity' || variant === 'lock';

  const height =
    available === undefined
      ? grid.stack
      : centersCluster
        ? available
        : Math.min(grid.stack, available);
  const slack = Math.max(0, (available ?? grid.stack) - grid.stack);

  // What the stack is short by. Zero is the normal case and nothing collapses.
  // When it is not zero, things go in a fixed order: the description first,
  // then the mark — explanation, then decoration, and never the field or the
  // button that commits it.
  const shortfall = available === undefined ? 0 : Math.max(0, grid.stack - available);
  const dropDescription = shortfall > 0;
  const dropMark = shortfall > grid.description;

  // The centring lead — the empty run between `chrome` and the mark that puts
  // the mark band's centre at half the surface height on the hero pair
  // (owner, 2026-08-18: "el pez va centrado en la pantalla"). The column is
  // the full surface here, so its half IS the screen's centre. The grid
  // cannot carry the number — it depends on the surface's height. Clamped so
  // `body` never drops below the tallest content the cluster family holds
  // (`grid.minStack`): when a short surface cannot hold a centred fish, it
  // rises just enough, and both doors clamp to the same Y.
  let lead = 0;
  if (centersCluster && available !== undefined && !dropMark) {
    lead = Math.max(
      0,
      Math.min(
        available / 2 + identityClusterCenterOffset - grid.chrome - grid.mark / 2,
        available - grid.minStack
      )
    );
  }

  // `body` is computed rather than left to flex-shrink, and that is what keeps
  // the families in step. Dropping a slot frees a fixed amount that rarely
  // matches the shortfall exactly, so the leftover has to land somewhere; if
  // it lands as unused space at the bottom of the stack it lands *differently*
  // per family, and the control bands drift apart at short viewports — which
  // is exactly the defect this component exists to prevent. Giving the
  // leftover back to `body` makes the stack fill its height precisely, so
  // `assist`, `secondary` and `action` are at `height` minus their own sum on
  // every screen, in every family, at every viewport.
  const reservedAbove =
    grid.chrome +
    lead +
    (dropMark ? 0 : grid.mark) +
    grid.title +
    (dropDescription ? 0 : grid.description);
  const reservedBelow = grid.assist + grid.secondary + grid.action;
  const bodyHeight = Math.max(0, height - reservedAbove - reservedBelow);

  return (
    <Root data-testid={testID} sx={backgroundColor ? { backgroundColor } : undefined}>
      {background}
      <Column ref={columnRef} $sunk={sunk} data-testid="onboarding-column">
        <Stack
          style={{ height, marginTop: centersCluster ? 0 : slack / 2 }}
          data-testid="onboarding-stack"
        >
          <Slot style={{ height: grid.chrome }} data-testid="onboarding-slot-chrome">
            {chrome}
          </Slot>

          {/*
            The centring lead, never a slot: the empty run that drops the hero
            fish to the middle of the surface. Zero on the families that do
            not centre their mark, and before first measurement.
          */}
          {lead > 0 && (
            <Box
              style={{ height: lead, flexShrink: 0 }}
              data-testid="onboarding-lead"
              aria-hidden
            />
          )}

          {!dropMark && (
            <Slot
              style={{ height: grid.mark, alignItems: 'center' }}
              data-testid="onboarding-slot-mark"
            >
              {mark ?? <BrandMark size={grid.markSize} />}
            </Slot>
          )}

          {/*
            The title sits at the bottom of its band and the description at the
            top of its own, so the space each reserves for a second line that
            did not come collects outside the pair rather than between them.
          */}
          <Padded
            style={{ minHeight: grid.title, justifyContent: 'flex-end', paddingBottom: spacing.md }}
            data-testid="onboarding-slot-title"
          >
            {title}
          </Padded>

          {!dropDescription && (
            <Padded
              style={{ minHeight: grid.description, justifyContent: 'flex-start' }}
              data-testid="onboarding-slot-description"
            >
              {description}
            </Padded>
          )}

          <Box
            style={{
              height: bodyHeight,
              flexShrink: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              // Top-anchored everywhere (owner, 2026-08-18, with the
              // recover → password alignment): the body's first line lands at
              // the band's top on every screen, so consecutive steps share a
              // first-row Y by sharing a band edge — the mobile twin's
              // `bodyScrollContent` rule. On the hero pair this is also what
              // puts the lock's field right under the collapsed description
              // (title→input = fish→title). Leftover collects below.
              justifyContent: 'flex-start',
              paddingLeft: contentPadding.screen,
              paddingRight: contentPadding.screen,
              overflowY: scrollBody ? 'auto' : 'visible',
            }}
            data-testid="onboarding-slot-body"
          >
            {body}
          </Box>

          <Padded style={{ height: grid.assist }} data-testid="onboarding-slot-assist">
            {assist}
          </Padded>

          <Padded style={{ height: grid.secondary }} data-testid="onboarding-slot-secondary">
            {secondary}
          </Padded>

          <Padded
            style={{
              height: grid.action,
              justifyContent: 'flex-start',
              paddingTop: spacing.lg,
              paddingBottom: spacing['2xl'],
            }}
            data-testid="onboarding-slot-action"
          >
            {action}
          </Padded>
        </Stack>
      </Column>
    </Root>
  );
}
