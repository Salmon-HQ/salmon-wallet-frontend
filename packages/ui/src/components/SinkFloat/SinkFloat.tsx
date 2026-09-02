/**
 * SinkFloat — the transition verb on the DOM: what leaves sinks, what arrives
 * floats, and a beat of stillness between them lets the eye read the two
 * halves as one gesture.
 *
 * The verb and every number it spends are DESIGN.md's, §The sink and the float
 * — the transition verb; the constants themselves live once in
 * `@salmon/shared` (`motion/sinkFloat`) so this and the Reanimated expression
 * in `apps/mobile` cannot drift apart.
 *
 * **The outgoing half, which the DOM does not give away.** React unmounts the
 * previous children in the same frame the new ones arrive, so there is no
 * equivalent of Reanimated's `exiting` — which is why `FadeThrough` is
 * enter-only and says so. Enter-only is not available here: the verb is a
 * double gesture, and an enter-only version would leave a hole where the
 * outgoing content was for the whole length of the float's delay. So this
 * component holds the outgoing subtree itself: on a key change it keeps
 * rendering the previous children while they sink, waits out the beat, and
 * only then swaps to the new ones and floats them in. One child is on screen
 * at a time — no overlap, no absolute positioning, no layout jump — which
 * costs one snapshot of the outgoing nodes in state and one timer per swap,
 * and means the new children are mounted `holdMs` late.
 *
 * Reduce motion is a parallel mapping, not a hole: no travel and no depth
 * either way, no hold, no animation — and the swap still happens, immediately.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import {
  FLOAT_DELAY_MS,
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  motionEasing,
} from '@salmon/shared';

import { useReducedMotion } from '../../utils/useReducedMotion';
import type { SinkFloatProps } from './types';

/**
 * The travel distance rides a custom property so the keyframes below stay
 * static — a per-call `distance` is a style, not a new stylesheet.
 */
const TRAVEL_VAR = '--salmon-sink-float-travel';
/**
 * The depth rides a custom property for the same reason — and it is one
 * property rather than two, because the phase on screen already decides which
 * of the two mirrored depths applies.
 */
const SCALE_VAR = '--salmon-sink-float-scale';
/** Same reasoning for the two clocks: a per-call duration is a style too. */
const FLOAT_MS_VAR = '--salmon-sink-float-in';
const SINK_MS_VAR = '--salmon-sink-float-out';

/** Buoyancy running out: the rise lands on `settle`, and never overshoots. */
const floatTravel = keyframes`
  from { transform: translateY(var(${TRAVEL_VAR})) scale(var(${SCALE_VAR})); }
  to { transform: none; }
`;

/** Beer–Lambert: the light comes back slowly at first and fast at the end. */
const floatLight = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/**
 * The mirror, and the half that used to be missing: the exit animated travel
 * and light only, so the outgoing content slid away instead of receding
 * (DESIGN.md, §The verb reads as depth, not as a slide). Now it goes *away from
 * the viewer* — the recession is the gesture, the travel only tips the eye
 * which way the Z runs. One transform keyframe carries both, because two
 * animations on the same property would let the later one win; the DOM cannot
 * split translate and scale across curves the way Reanimated does, so the pair
 * lands on `settle` — the depth is where the content comes to rest, and
 * nothing in this water bounces — while the light accelerates out on `sink`.
 */
const sinkAway = keyframes`
  from { transform: none; }
  to { transform: translateY(var(${TRAVEL_VAR})) scale(var(${SCALE_VAR})); }
`;

/** The light going out with depth: accelerating, never linear. */
const sinkLight = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const Frame = styled('div', { shouldForwardProp: (prop) => prop !== '$phase' })<{
  $phase: 'float' | 'sink' | 'cut';
}>(({ $phase }) => ({
  // Transparent to whatever layout owns this slot: the wrapper carries the
  // verb and nothing else.
  minWidth: 0,
  ...($phase === 'float'
    ? {
        // Travel on `settle`, light on `sink` — one physical event, two media,
        // so they need two animations rather than one keyframe set.
        animation: [
          `${floatTravel} var(${FLOAT_MS_VAR}) ${motionEasing.settle.css} both`,
          `${floatLight} var(${FLOAT_MS_VAR}) ${motionEasing.sink.css} both`,
        ].join(', '),
      }
    : undefined),
  ...($phase === 'sink'
    ? {
        animation: [
          `${sinkAway} var(${SINK_MS_VAR}) ${motionEasing.settle.css} both`,
          `${sinkLight} var(${SINK_MS_VAR}) ${motionEasing.sink.css} both`,
        ].join(', '),
      }
    : undefined),
}));

export function SinkFloat({
  transitionKey,
  children,
  distance = SINK_FLOAT_TRAVEL,
  scale,
  floatMs = FLOAT_IN_MS,
  sinkMs = SINK_OUT_MS,
  holdMs = FLOAT_DELAY_MS,
  className,
  style,
  testID,
}: SinkFloatProps) {
  const isReduceMotionEnabled = useReducedMotion();

  // `held` is the last committed children — the subtree the DOM is about to
  // throw away — kept in state and written from an effect, never a ref read
  // during render.
  const [swap, setSwap] = useState<{ key: string; sinking: boolean; held: ReactNode }>({
    key: transitionKey,
    sinking: false,
    held: children,
  });

  useEffect(() => {
    if (swap.sinking || swap.held === children) return;
    setSwap((current) => ({ ...current, held: children }));
  }, [swap.sinking, swap.held, children]);

  if (swap.key !== transitionKey && !swap.sinking) {
    setSwap(
      isReduceMotionEnabled
        ? { key: transitionKey, sinking: false, held: children }
        : { key: swap.key, sinking: true, held: swap.held }
    );
  }

  useEffect(() => {
    if (!swap.sinking) return;
    const timer = setTimeout(
      () => setSwap((current) => ({ ...current, key: transitionKey, sinking: false })),
      holdMs
    );
    return () => clearTimeout(timer);
  }, [swap.sinking, transitionKey, holdMs]);

  const phase = isReduceMotionEnabled ? 'cut' : swap.sinking ? 'sink' : 'float';

  return (
    <Frame
      // A fresh node per shown phase is what makes CSS play the animation
      // again — the same reason FadeThrough keys its frame.
      key={`${swap.key}:${phase}`}
      $phase={phase}
      data-testid={testID}
      className={className}
      style={
        {
          [TRAVEL_VAR]: `${distance}px`,
          // The two content depths are equal by intent; the phase picks which
          // of them names this frame's, and a caller's override replaces both.
          [SCALE_VAR]: `${scale ?? (phase === 'sink' ? SINK_EXIT_SCALE : FLOAT_ENTER_SCALE)}`,
          [FLOAT_MS_VAR]: `${floatMs}ms`,
          [SINK_MS_VAR]: `${sinkMs}ms`,
          ...style,
        } as CSSProperties
      }
    >
      {swap.sinking ? swap.held : children}
    </Frame>
  );
}
