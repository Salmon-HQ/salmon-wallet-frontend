# 031 — The wait's passage: one entry, one exit, from one place

Status: implementing. Owner-directed, 2026-09-07.

Supersedes the transition half of [030](../030-unlock-transition-audit/report.md);
030's biometric findings stand as shipped.

## Why this exists

The owner has now reported the same defect three times, and two fixes have
shipped without closing it:

> "los componentes aparecen luego de que la loading screen se va y luego corren
> una animación de flotar, lo que hace que quede raro porque parece que corre
> dos veces. […] Mismo cuando pasa el face id, la loading screen titila un par
> de veces hasta que se arregla y corre bien."

Both previous attempts treated a symptom. The first added a gate animation over
a float that was already playing under an overlay; the second moved which
channel published the surfacing but left it publishing from a passive effect,
one painted frame late. Neither touched why the wait's own entry stutters.

This spec fixes the ordering, and only the ordering.

## Non-goals

**The motion vocabulary does not change.** No duration, no curve, no easing, no
travel distance, no new animation. `DESIGN.md` §Motion and §The wait are the
contract these changes exist to _deliver_, not to amend. `packages/shared/src/motion/`
and `packages/shared/src/theme/durations.ts` are untouched, and so is
`packages/shared/src/types/ui.ts` — no prop moves.

**Behaviours that already work are not to be disturbed.** In particular the
5000 ms `waitFloor`, the calm-water exit, the `onExited` watchdog, the
`onReady`/`waitForWait` handshake that keeps the wave running before PBKDF2
takes the thread, and `surfaces={false}` on the lock's wait (030) all stay
exactly as they are. Every change below is a dependency shape or a commit
boundary.

## The two defects

### D1 — the wave is restarted by layout, not by the caller

`geometry.origin` is dependency #3 of the mobile wait's visibility effect, and
`measureOrigin` rebuilds it on every `onLayout` — it is the only one of the
three `measure*` callbacks without an equality guard. Each layout pass
therefore re-enters the `if (visible)` branch and runs `sink.value = 0;
ring.value = 0`, which does not pause a `withRepeat` but **restarts it from
zero**, then re-delays both loops by `CONTENT_LANDS_MS` (1010 ms). A crest
mid-crossing disappears and the screen is bare for a full second.

Face ID is the worst case, and the reason it looks specific to Face ID is
timing, not biometrics: `runUnlock` calls `Keyboard.dismiss()` and the system
sheet dismisses, both forcing relayout — but `onLayout` is a JS-thread callback
and PBKDF2 owns that thread for longer than 1010 ms, so those events land
_after_ the loops are running and kill them.

The origin is a **drawing** input, not a **lifecycle** input. It is read by the
exit only, to decide whether a front is riding.

### D2 — the surfacing lands one painted frame after the overlay leaves

`(app)/_layout.tsx` bumps `surfaceKey` from a passive effect on `[isLocked]`.
That effect runs _after_ the commit that unmounted `LockOverlay`, so one frame
paints with Home fully assembled and at rest; the key then changes and the
float plays on content the user has already watched arrive. Arrival, then
arrival again — which is the "corre dos veces".

The removed instance also plays `exiting={sinkExiting}` against the incoming
one. That overlap is real but reads as a soft cross-fade of identical content,
not as a second run; it is recorded here as a watch item, not fixed.

## The rule this establishes

> **A wait's entry and exit are decided by its caller's commits, never by a
> measurement.** A layout pass may change what is drawn; it may never change
> what is running. And the frame that removes a cover is the frame that mounts
> what floats up through it — never the frame before.

Everything below follows from that sentence, and it is why the fixes are
ordering-only.

## Changes

| #   | Change                                                                                              | File                                                 | Twin                                               |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| 1   | `geometry.origin` leaves the visibility effect's dependencies; the exit reads it from a ref         | `apps/mobile/.../LoadingScreen.tsx`                  | asymmetric — the DOM holds no measurement in state |
| 2   | The surfacing is bumped in the same callback that releases the overlay; the passive effect goes     | `apps/mobile/app/(app)/_layout.tsx`                  | symmetric-optional, see 7                          |
| 3   | `measureOrigin` gets the equality guard its two siblings have                                       | `apps/mobile/.../LoadingScreen.tsx`                  | asymmetric — same reason as 1                      |
| 4   | A failed send/swap lets the wait _leave_ instead of cutting it                                      | `send/_layout.tsx`, `SwapScreen.tsx`, `SendPage.tsx` | symmetric                                          |
| 5   | `isVisible` is set in the render phase, so the overlay is committed by the render that asked for it | both `LoadingScreen.tsx`                             | symmetric                                          |
| 6   | The DOM twin gets mobile's `exitArmedRef`, so an exit is planned once                               | `packages/ui/.../LoadingScreen.tsx`                  | asymmetric — mobile already has it                 |
| 7   | The extension bumps the surfacing on release too                                                    | `popup/App.tsx`                                      | states an invariant it currently inherits by luck  |

### On 4 — the one change that is not about the unlock

`{showWait && <LoadingScreen visible={isCommitted} …/>}` collapses in the same
render on a failure, so `visible={false}` is never committed: the exit effect
never runs, the front is cut mid-crossing, and `onExited` never fires — leaving
`useWaitExit`'s `gone` false for the life of the flow, so a retry enters with a
stuck `held`. `held` already means "committed, or still leaving", so the render
condition is `isWaveHeld` and the failure surface renders over the ebb.

### On 7 — why the extension does not show D2

`HomePage` mounts fresh on the lock→home swap (it is not rendered behind the
lock the way mobile's Home is), and `SinkFloat`'s first phase carries
`from { opacity: 0 }` as a fill state, so the float plays once in the same
commit with no at-rest frame. Nothing bumps `surfaceKey` there at all. That is
correct **by accident**: it holds only while `HomePage` stays below the lock
branch. Bumping on release costs nothing today and makes the invariant explicit.

## Deliberately not done

- **The ghost sink** (`home-content` carries `exiting` for a task hand-back and
  cannot tell that role apart from a surfacing at a key change). Splitting the
  two roles into two wrappers is a larger change than the report warrants, and
  change 2 may make it moot. Watch item: after change 2, look for a soft double
  image on the rise.
- **The extension's storage-gated release** — `LockPage` awaits `getStashItem`
  and `storeSessionKey` before releasing, so the popup shows bare water for a
  `chrome.storage.session` round trip. Firing the release first would risk
  losing the cache if the popup closed in that window. The trade-off is the
  owner's; flagged, not changed.
- Two DOM-only notes with no user-visible effect: the tip rotation's inner
  `setTimeout` is never cleared on unmount, and `--wave-ring` can be measured
  against a pre-webfont-swap line box.

## Verification

Typecheck, lint and tests across all four packages, plus `pnpm check:parity`
(strict, 78 pairs). No existing assertion is relaxed by any change here — one
(`send-screens.test.tsx`) is _strengthened_, because its `useWaitExit` stub
collapses `held` to `isCommitted` and would hide change 4.

New coverage: a moved emitter must not restart a wave in flight (the test that
would have caught D1); the overlay must be committed by the render that asks
for it; the surfacing must have incremented in the same flush that removed the
overlay (D2); a failed send must let the wait leave.

Device checks remain the owner's, and they are the only thing that can settle
whether `visible` itself oscillates on hardware — no amount of source reading
rules that out.
