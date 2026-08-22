/**
 * Blur tint options
 */
/**
 * `systemThickMaterialDark` is the tint the degradation ladder pins for the
 * thermocline's blur rung (DESIGN.md, rung 2); the rest are the generic
 * expo-blur tints the pre-material call sites already used. Additive only —
 * three apps read this union.
 */
export type BlurTint = 'light' | 'dark' | 'default' | 'systemThickMaterialDark';

/**
 * Props for the BlurContainer component (base - platform-agnostic)
 */
export interface BlurContainerPropsBase<TStyle> {
  children: React.ReactNode;
  style?: TStyle;
  /**
   * Blur intensity
   * @default 8
   */
  blurIntensity?: number;
  /**
   * Blur tint
   * @default 'dark'
   */
  blurTint?: BlurTint;
  /**
   * Background color for the container
   * @default colors.background.tokenItem (#383F52 at 10% opacity)
   */
  backgroundColor?: string;
  /**
   * Border color for the container
   * @default colors.border.default (#404962)
   */
  borderColor?: string;
  /**
   * Border width for the container
   * @default 1
   */
  borderWidth?: number;
  /**
   * Use radial gradient border (Figma "Glassy_BORDER") instead of solid border
   * @default true
   */
  useGradientBorder?: boolean;
}
