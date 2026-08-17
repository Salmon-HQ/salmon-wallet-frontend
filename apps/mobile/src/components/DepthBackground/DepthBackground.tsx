/**
 * DepthBackground — the water column's ground: a depth ramp and marine snow.
 *
 * The React Native half of the pair; `packages/ui` draws the same field on the
 * DOM. Both read `marineSnow` / `depthFieldTile` and the `water` tokens from
 * `@salmon/shared`, so neither platform owns the drawing and the two cannot
 * drift. The rationale for the geometry lives beside the data in
 * `packages/shared/src/theme/depthField.ts`.
 *
 * Two layers, both painted once and never animated:
 *
 *  - the **ramp**, a vertical gradient darkening toward the bottom. It
 *    suggests an abyss without drawing a floor, and because it only ever
 *    darkens the shipped ground it cannot lower any text's contrast.
 *  - the **snow**, suspended flocs across the top of the ground, fading to
 *    nothing before the first data row. It is what gives the deep field's
 *    3.2× scales something to be enormous against.
 *
 * Where the DOM serialises the field into a `background-image`, this draws the
 * array directly: an image would have meant shipping a raster and picking a
 * density for it. 95 static ellipses is a single non-animated `Svg`, mounted
 * once for all tabs rather than per screen.
 *
 * Motion: none, deliberately. Real marine snow sinks at roughly 0.6 mm/s — it
 * does not visibly fall — and a drifting full-screen layer would be a
 * permanent compositor layer on every screen including low-end Android, for an
 * effect nobody would notice. It would also spend ambient motion in a system
 * whose only light event is The Surfacing. Nothing here reacts to
 * `useReducedMotion` because nothing here moves.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { depthFieldTile, marineSnow, semantic } from '@salmon/shared';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

const { water } = semantic;

export interface DepthBackgroundProps {
  /**
   * Draw the marine snow field. Turn it off on any ground that carries data
   * in its upper region — the ramp alone is a background colour and is always
   * safe, the snow is a motif and is not.
   * @default true
   */
  snow?: boolean;
  style?: ViewStyle;
}

export const DepthBackground: React.FC<DepthBackgroundProps> = ({ snow = true, style }) => (
  <View style={[styles.container, style]} pointerEvents="none">
    <LinearGradient colors={water.gradient} style={StyleSheet.absoluteFill} />
    {snow && (
      <View style={styles.field} pointerEvents="none">
        <Svg
          width={depthFieldTile.width}
          height={depthFieldTile.height}
          viewBox={`0 0 ${depthFieldTile.width} ${depthFieldTile.height}`}
        >
          {marineSnow.map(([cx, cy, rx, ry, opacity], i) => (
            <Ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={water.snow}
              fillOpacity={opacity}
            />
          ))}
        </Svg>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  /**
   * The field is authored wider than the widest column, so it is centred at
   * its natural size and allowed to overhang rather than stretched — squashing
   * it to the column width would turn round flocs into ovals and would change
   * the drawing from device to device.
   */
  field: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: depthFieldTile.height,
    alignItems: 'center',
    overflow: 'hidden',
  },
});
