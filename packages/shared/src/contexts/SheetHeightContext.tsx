/**
 * The height a bottom sheet is drawn at, for the sheets it opens.
 *
 * A sheet that rises over another one — the explorer picker over the
 * transaction detail, a Powerup's detail over the catalogue — is the same
 * drawer one level deeper, never a shorter sheet peeking over a taller one
 * (owner, 2026-09-13). Each platform's `BottomSheetContainer` measures its
 * own rendered height and provides it here; a nested sheet reads it and
 * rises to exactly that. `null` outside any sheet, or before the first
 * measurement.
 */
import { createContext, useContext } from 'react';

export const SheetHeightContext = createContext<number | null>(null);

/** The enclosing sheet's rendered height in pixels, or `null` outside one. */
export function useParentSheetHeight(): number | null {
  return useContext(SheetHeightContext);
}
