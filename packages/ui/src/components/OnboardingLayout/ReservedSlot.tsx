/**
 * ReservedSlot — keeps a conditional control's space without keeping the
 * control.
 *
 * The worst defect the layout audit found was the recover screen's "Next"
 * appearing the moment the twelfth valid word is typed: 72px arrives inside a
 * centred column and the mark, title, description and input all jump while the
 * user is still typing. The DOM twin of the recover screen already reserved
 * with `visibility: hidden`; this is that pattern, named, so every screen can
 * use it.
 *
 * Hidden means hidden, not transparent: `visibility: hidden` takes the subtree
 * out of the accessibility tree and out of the tab order, and `inert` keeps a
 * stale focus from landing on a control that is not really there.
 */
import type { ReactNode } from 'react';

export interface ReservedSlotProps {
  /** Whether the child is really present. When false, only its space is. */
  visible: boolean;
  children: ReactNode;
}

export function ReservedSlot({ visible, children }: ReservedSlotProps): React.ReactElement {
  return (
    <div
      style={{ visibility: visible ? 'visible' : 'hidden' }}
      aria-hidden={visible ? undefined : true}
      // `inert` is what actually removes it from the tab order; `visibility`
      // alone is enough in every current browser but the attribute is the
      // guarantee rather than the side effect.
      inert={!visible}
    >
      {children}
    </div>
  );
}
