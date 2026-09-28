/**
 * What a bottom sheet tells the sheets it opens.
 *
 * A sheet that rises over another one — the explorer picker over the
 * transaction detail, a Powerup's detail over the catalogue — is the same
 * drawer one level deeper, never a shorter sheet peeking over a taller one
 * (owner, 2026-09-13). Each platform's `BottomSheetContainer` measures its
 * own rendered height and provides it here; a nested sheet reads it and
 * rises to exactly that. `null` outside any sheet, or before the first
 * measurement.
 *
 * The two sheets are also sequential, never stacked (owner, 2026-09-17):
 * the parent slides down first, then the child rises; closing the child
 * runs the inverse, and the parent comes back as it was. The backdrop is
 * the parent's the whole time — the child draws none — so nothing behind
 * the pair flashes during the handoff. A tap on that backdrop while the
 * child is up closes both, and nothing returns. `SheetParentContext` is the
 * parent's side of that handshake; `null` outside any rendered sheet.
 */
import { createContext, useContext } from 'react';

import type { SheetParentHandle } from '../types/ui/sheet-turn';

export type { SheetParentHandle };

export const SheetHeightContext = createContext<number | null>(null);

/** The enclosing sheet's rendered height in pixels, or `null` outside one. */
export function useParentSheetHeight(): number | null {
  return useContext(SheetHeightContext);
}

export const SheetParentContext = createContext<SheetParentHandle | null>(null);

/** The enclosing rendered sheet's handshake, or `null` outside one. */
export function useSheetParent(): SheetParentHandle | null {
  return useContext(SheetParentContext);
}
