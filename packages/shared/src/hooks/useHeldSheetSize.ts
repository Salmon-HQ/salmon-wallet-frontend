/**
 * The ceiling a sheet opens with is the ceiling it keeps (owner,
 * 2026-09-16): whatever the app under it does while it is up — Home leaving
 * focus mode, a balance block floating back — the sheet does not follow.
 * The caller's `height` / `maxHeight` are read once, on the render that
 * shows the sheet, and released once it has left (`release`), so the next
 * opening measures afresh. Render-time setState, the same pattern the shell
 * uses: refs cannot be read during render. Shared by both
 * `BottomSheetContainer`s.
 */
import { useCallback, useState } from 'react';

export function useHeldSheetSize(visible: boolean, height?: number, maxHeight?: number) {
  const [held, setHeld] = useState<{ height?: number; maxHeight?: number } | null>(null);
  if (visible && held === null) setHeld({ height, maxHeight });
  const release = useCallback(() => setHeld(null), []);
  return {
    sheetHeight: held ? held.height : height,
    sheetMaxHeight: held ? held.maxHeight : maxHeight,
    release,
  };
}
