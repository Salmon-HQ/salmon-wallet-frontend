# 030 — The unlock transition: audit and fixes

Owner report, 2026-09-07. Raised as three complaints about mobile unlock:

1. two identical animations run one after the other when the app unlocks;
2. the animation seems to arrive _after_ the components have already rendered;
3. the hand-off from the lock screen to the loading screen has no transition —
   one screen disappears and the other appears, which reads as a flicker.

All three are real. The audit also found a fourth defect nobody reported and a
fifth in the extension that is functional rather than visual.

## Finding 1+2 — one defect: two publishers of `surfaceKey`

Home keys its content and its header on `surfaceKey` from `TaskChromeContext`,
so a bump remounts them and replays the float. Two things bumped it:

- `LoadingScreen.finishExit()` calls `surface()` when the wait leaves;
- `app/(app)/_layout.tsx` added a second count of its own on `!isLocked`.

The second channel was added for "a surfacing no wait reports" — a biometric
unlock that flipped `locked` with nothing on screen. **That stopped being true
in `5bfd1260`**: the rebuilt biometric path recovers the password and runs the
same `runUnlock` as a typed one, so it takes the same wait. Both channels now
fire on every unlock, `FLOAT_DELAY_MS` (450 ms) apart:

| t (ms)   | event                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 0        | wait's `surface()` → Home remounts, float scheduled for 450                                            |
| 450      | `unlockHeld` released → `isLocked` false → second bump; Home remounts again, float rescheduled for 900 |
| 450      | the overlay unmounts                                                                                   |
| 900–1460 | the float the user actually sees                                                                       |

So the first float is discarded at the exact frame it would have begun, and the
visible one starts 450 ms _after_ the lock screen has already gone — which is
complaint 2, stated precisely. The regression is mine, from the biometric
rebuild; the password path had the same double publisher before it, but the
overlay was still opaque over the discarded remount.

**Fix**: one channel per surfacing. On the lock path the layout's is the
correct one — it fires when the overlay actually leaves — so the wait opts out
with `surfaces={false}` (see 3b). Every wait with no overlay over it keeps
surfacing itself.

## Finding 3a — lock → wait: animated, by design

Not a defect. The form sinks (`sinkExiting`, `SINK_OUT_MS` 360 ms), then the
wait rises after its own beat. The ~350 ms of bare water column between them is
the beat DESIGN.md §Motion prescribes, and the ground never travels, so nothing
actually blanks. Left alone.

## Finding 3b — wait → Home: the hand-off happened under the overlay

`LockOverlay` was a plain `View` that vanished on one frame, and — worse — the
float behind it had already played. The surfacing fired from the wait's exit,
`FLOAT_DELAY_MS` before the overlay's release, so Home floated up while it was
still covered and the overlay then left on content that had already arrived.

A "gate's rise" on the overlay was tried first and **rejected by the owner**
(2026-09-07): the gate is not the vocabulary this app speaks any more, and the
components already own the verb — inventing a second animation on top of the
float they already have is exactly the wrong answer.

**Fix**: move the surfacing, not the animation. The lock's `LoadingScreen` is
the one wait in the app that passes `surfaces={false}`, because it sits inside
an overlay that outlives it; `(app)/_layout.tsx` bumps the count when the
overlay is released instead. The passage is then what was asked for, and every
part of it already existed:

```
the wait sinks (LoadingScreen's own ebb)
  → FLOAT_DELAY_MS of bare water column, nothing on it
  → the overlay goes — invisible, its ground and Home's are the same water
  → Home's content and header float up together, the float they already had
```

The overlay's ground (`depth.column` + `DepthBackground` + `ScalesBackground`)
is the same water the tab shell paints, so its departure has nothing to
animate: there is no cut to hide, only a float to uncover.

## Finding 4 — every lock raised a phantom surfacing (unreported)

`LockContent` mounts `LoadingScreen` with `visible={false}` and keeps it mounted
for the whole time the wallet is locked. Mobile's visibility effect had no
guard for "was never visible", so on that first commit it fell straight into the
exit branch, spent the floor, and called `finishExit()` — one `surface()` the
shell reads as a real surfacing. **Every lock therefore remounted the entire
Home tree behind the overlay.** The DOM twin has had the guard since it was
written (`packages/ui/.../LoadingScreen.tsx`, `if (!isVisible) return undefined`).

**Fix**: the same guard on mobile.

## Finding 5 — the extension never cached its session key

`popup/App.tsx` branched on `locked` alone, so `unlockAccounts` flipping it
swapped `LockPage` out for Home in the same commit — unmounting the unlock wait
mid-wave. Two casualties: the closing wave played nowhere, and `onUnlocked`
(which fires from the wait's exit and is where `storeSessionKey` runs) **never
fired at all**.

**Fix**: the parked release the mobile shell already uses — `unlockHeld` set
before the await, the lock branch held until `LockPage` reports the wait has
left, released there.

## Also fixed here — two Android-only biometric defects

Found while verifying the DEV-41/DEV-34 rebuild against Android at code level
(no Android device was available; `expo-secure-store@55.0.13` Kotlin sources).

- **Double prompt when arming.** `AESEncryptor.createEncryptItem` calls
  `authenticateCipher` on the _write_ path, so Android already prompts. Our
  explicit `authenticateAsync` first — needed on iOS, where `SecItemAdd` never
  evaluates the ACL — made Android ask twice to turn one switch on. Now gated
  on `Platform.OS === 'ios'`.
- **"No hardware" / "nothing enrolled" shown as an error.** iOS reports these by
  resolving `null`, which `unlock()` already reads as `unavailable`. Android's
  `AuthenticationHelper.assertBiometricsSupport()` _throws_ instead, so they
  fell into `failed` and painted a red error for a device that simply has no
  enrolment. Matched on the message (the module ships no error codes) and
  reported as `unavailable`.

Everything else checked out on Android: invalidation returns `null` via
`KeyPermanentlyInvalidatedException` (so the `invalidated` branch is reached),
`android:allowBackup="false"` keeps both records off backup, and cancellation
throws with "canceled" in the message.

## Verification

Typecheck, lint and tests across `@salmon/mobile`, `@salmon/shared`,
`@salmon/ui`, `@salmon/extension`, plus `pnpm check:parity`. The transition
itself is a device check — see the owner checklist in the PR.
