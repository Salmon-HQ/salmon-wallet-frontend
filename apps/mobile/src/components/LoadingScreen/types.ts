/**
 * LoadingScreen types
 */
import type { LoadingScreenBaseProps } from '@salmon/shared';

/**
 * Props for the LoadingScreen component (React Native)
 * Extends base props with React Native-specific options
 */
export interface LoadingScreenProps extends LoadingScreenBaseProps {
  /**
   * Space to reserve at the bottom for chrome that floats over this screen
   * (e.g. the tab bar). Shrinks the centred content box and lifts the tips
   * clear of it. Default 0 for surfaces with nothing floating over them.
   */
  bottomOffset?: number;
  /**
   * Fired once per showing, the moment the wait is actually drawing: the
   * overlay is committed and — when the front is riding — the emitter has been
   * measured, so the crests are on screen rather than waiting on a layout
   * event. Native-only, because only here does the front's render depend on a
   * JS-thread measurement; the DOM twin draws its crests unconditionally and
   * only refines their size from layout.
   *
   * A caller that is about to block the JS thread (key derivation on unlock)
   * waits for this before it starts, so the water is already running when the
   * crypto stops it — see DESIGN.md §The wait.
   */
  onReady?: () => void;
  /**
   * Present the wait in its own window, above every chrome on screen.
   *
   * A wait rendered inline only covers its own parent. Inside the settings
   * gate that leaves the panel header — chevron, title, close — sitting on top
   * of it, still inviting taps on a flow that is mid-flight. This is off by
   * default: a wait that already fills its surface does not need a window.
   */
  fullScreen?: boolean;
}
