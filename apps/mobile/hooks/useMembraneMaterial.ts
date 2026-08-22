import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Which material a P3 membrane surface should be made of, per the degradation
 * ladder in DESIGN.md ("Elevation & Depth" → "The degradation ladder"):
 *
 * 1. `liquidGlass` — iOS 26+ where the native glass API is actually present.
 * 2. `blur`        — iOS < 26 and Android 12+; `expo-blur` plus the scrim.
 * 3. `opaque`      — rung 5. Reduce Transparency, or any platform without a
 *                    glass/blur path. A first-class look, not a fallback.
 */
export type MembraneMaterial = 'liquidGlass' | 'blur' | 'opaque';

/**
 * `isGlassEffectAPIAvailable()` guards against iOS 26 betas that ship the
 * component without the underlying API (expo/expo#40911); calling `GlassView`
 * there crashes. Both helpers memoise their own native-module lookup, so this
 * is cheap to call per render; the try/catch covers environments where the
 * module is absent entirely.
 */
function supportsLiquidGlass(): boolean {
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function useMembraneMaterial(): MembraneMaterial {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (active) setReduceTransparency(enabled);
      })
      .catch(() => {
        // Platforms without the query keep the translucent default.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  if (reduceTransparency) {
    return 'opaque';
  }

  return supportsLiquidGlass() ? 'liquidGlass' : 'blur';
}

export default useMembraneMaterial;
