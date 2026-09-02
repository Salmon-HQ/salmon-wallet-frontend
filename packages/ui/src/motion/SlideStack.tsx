/**
 * SlideStack — a screen enters from the right and leaves to the right, on the
 * DOM, where there is no navigator to do it.
 *
 * Mobile's `Stack` plays `slide_from_right` for free; the side panel swaps one
 * screen for another in state. This wrapper reads that swap as navigation: a
 * change of `screenKey` with a higher `depth` is a push — the new screen slides
 * in over the old one, which holds still under it — and a lower `depth` is a
 * pop — the old screen slides out over the new one, already in place beneath.
 * The outgoing screen is held in state for the length of the beat, then
 * dropped; one screen is interactive at a time. Reduce motion is a cut.
 */
import React, { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SCREEN_POP_MS, SCREEN_PUSH_MS } from '@salmon/shared';

import { useReducedMotion } from './useReducedMotion';
import { screenSlideAnimation, type ScreenSlidePhase } from './screenSlide';

export interface SlideStackProps {
  /** Identity of the screen on top. A change is a navigation. */
  screenKey: string;
  /** How deep the screen sits: up is a push, down is a pop. */
  depth: number;
  children: ReactNode;
  style?: CSSProperties;
  /** Stable identifier for Playwright — `data-testid`. */
  testID?: string;
}

interface Held {
  key: string;
  node: ReactNode;
  phase: ScreenSlidePhase;
}

const pane: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

export function SlideStack({ screenKey, depth, children, style, testID }: SlideStackProps) {
  const reduced = useReducedMotion();
  // What is on screen: the current key and depth, and — during a beat — the
  // outgoing screen and which way it is going.
  const [shown, setShown] = useState<{ key: string; depth: number; node: ReactNode }>({
    key: screenKey,
    depth,
    node: children,
  });
  const [held, setHeld] = useState<Held | null>(null);

  if (shown.key !== screenKey) {
    const phase: ScreenSlidePhase = depth > shown.depth ? 'push' : 'pop';
    setHeld(reduced ? null : { key: shown.key, node: shown.node, phase });
    setShown({ key: screenKey, depth, node: children });
  } else if (shown.node !== children) {
    setShown({ key: screenKey, depth, node: children });
  }

  useEffect(() => {
    if (!held) return;
    const ms = held.phase === 'push' ? SCREEN_PUSH_MS : SCREEN_POP_MS;
    const timer = setTimeout(() => setHeld(null), ms);
    return () => clearTimeout(timer);
  }, [held]);

  // On a push the incoming pane rides on top and travels; on a pop the
  // outgoing pane rides on top and travels; the other holds still beneath.
  const currentOnTop = !held || held.phase === 'push';

  return (
    <div
      data-testid={testID}
      style={{ position: 'relative', overflow: 'hidden', minHeight: 0, ...style }}
    >
      {held && (
        <div
          key={`held:${held.key}`}
          data-testid="slide-stack-held"
          aria-hidden
          style={{
            ...pane,
            zIndex: currentOnTop ? 1 : 2,
            pointerEvents: 'none',
            animation: held.phase === 'pop' ? screenSlideAnimation('pop', reduced) : undefined,
          }}
        >
          {held.node}
        </div>
      )}
      <div
        key={`shown:${shown.key}`}
        data-testid="slide-stack-current"
        style={{
          ...pane,
          zIndex: currentOnTop ? 2 : 1,
          animation:
            held && held.phase === 'push' ? screenSlideAnimation('push', reduced) : undefined,
        }}
      >
        {shown.node}
      </div>
    </div>
  );
}
