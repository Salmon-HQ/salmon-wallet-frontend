/**
 * The screen slide — a screen enters from the right and leaves to the right,
 * always (owner, 2026-09-02). It is the default for every screen on every
 * platform unless a screen asks for something else; `(auth)`'s `none` is the
 * one documented exception (`apps/mobile/app/(auth)/_layout.tsx`).
 *
 * Mobile's stack draws it natively (`animation: 'slide_from_right'` in
 * `apps/mobile/app/(app)/_layout.tsx`) on the platform's own clock — expo-router
 * exposes `animationDuration` on iOS only, so the numbers below are not fed to
 * it; they are the DOM's (`packages/ui/src/motion/screenSlide.ts`), where the
 * side panel has no navigator and draws the push and the pop itself.
 */
import { motionMs } from '../theme/durations';

/** A push: the incoming screen travels in from the right edge. */
export const SCREEN_PUSH_MS = motionMs.rise;

/** A pop: the outgoing screen leaves the way it came, faster — it is an exit. */
export const SCREEN_POP_MS = motionMs.ebb;
