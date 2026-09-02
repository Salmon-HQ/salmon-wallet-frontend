/**
 * One `<style>` element per named keyframe set, injected once per document.
 *
 * The kit is styled from inline style objects built out of `useSemantic()`,
 * which covers everything except the two things inline styles cannot express:
 * `@keyframes` and pseudo-selectors. A shimmer's band travel is a keyframe, so
 * it gets a rule — written once, keyed by name, and never rewritten (the
 * colours in it come from `--sw-*` custom properties, which follow the mode on
 * their own).
 */
const injected = new Set<string>();

/**
 * @param name Unique rule name — also the animation-name to reference.
 * @param css The full rule text, e.g. `@keyframes ${name} { ... }`.
 */
export function injectKeyframes(name: string, css: string): void {
  if (typeof document === 'undefined' || injected.has(name)) return;
  injected.add(name);
  const style = document.createElement('style');
  style.dataset.swKeyframes = name;
  style.textContent = css;
  document.head.appendChild(style);
}
