/**
 * BlurContainer - A reusable blur effect component
 *
 * Web version using CSS backdrop-filter for browser extension and web app.
 * Renders a radial gradient border (Figma "Glassy_BORDER") by default
 * via an inline SVG overlay with <radialGradient> stroke.
 * When a custom borderColor is provided, the gradient uses that color.
 *
 * The blur is conditional on the fill being translucent. The default fill is
 * `colors.background.tokenItem`, which is opaque — a list row is content, and
 * DESIGN.md gives translucency only to floating chrome — so the common case
 * is now an opaque surface with a glassy edge and no backdrop filter at all.
 * Pass a translucent `backgroundColor` and the blur comes back.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { colors, isOpaqueColor } from '@salmon/shared';
import { focusRingNone, focusRingOnWrapper } from '../../theme';
import type { BlurContainerProps } from './types';

/** Radial gradient stops for glassy border effect (Figma "Glassy_BORDER") */
const GLASSY_BORDER_STOPS = [
  { offset: 0.2, opacity: 1 },
  { offset: 0.4, opacity: 0 },
  { offset: 0.6, opacity: 0 },
  { offset: 0.8, opacity: 1 },
] as const;
const GLASSY_BORDER_WIDTH = 0.75;

// sqrt(2) / 0.8 — so the 80% stop lands at the far corner (distance sqrt(2) in OBB space)
const OBB_RADIUS = Math.sqrt(2) / 0.8;

function GradientBorderOverlay({
  width,
  height,
  borderRadius,
  color,
  strokeWidth,
}: {
  width: number;
  height: number;
  borderRadius: number;
  color: string;
  strokeWidth: number;
}) {
  const gradientId = useId();
  const inset = strokeWidth / 2;

  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient
          id={gradientId}
          cx="0"
          cy="0"
          r={OBB_RADIUS}
          gradientUnits="objectBoundingBox"
        >
          {GLASSY_BORDER_STOPS.map((stop, i) => (
            <stop key={i} offset={stop.offset} stopColor={color} stopOpacity={stop.opacity} />
          ))}
        </radialGradient>
      </defs>
      <rect
        x={inset}
        y={inset}
        width={width - strokeWidth}
        height={height - strokeWidth}
        rx={borderRadius}
        ry={borderRadius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

const BlurBox = styled(Box)<{
  $blurIntensity: number;
  $backgroundColor: string;
  $borderColor: string;
  $borderWidth: number;
  $useGradientBorder: boolean;
}>(({ $blurIntensity, $backgroundColor, $borderColor, $borderWidth, $useGradientBorder }) => ({
  // A backdrop blur behind an opaque fill blurs nothing and still costs a
  // compositor layer, and DESIGN.md's degradation ladder bans `backdrop-filter`
  // on a list row in the extension outright. Now that the default fill is
  // opaque, most of these containers are rows and skip it.
  ...(isOpaqueColor($backgroundColor)
    ? {}
    : {
        backdropFilter: `blur(${$blurIntensity}px)`,
        WebkitBackdropFilter: `blur(${$blurIntensity}px)`,
      }),
  backgroundColor: $backgroundColor,
  overflow: 'hidden',
  position: 'relative',
  // When a text field inside this container takes focus, *this* is the
  // field's visible boundary — the `InputBase` in Send, Swap and the token
  // search is a bare flex child with no border, fill or radius of its own.
  // Ring the container so the ring follows the rounded blurred surface the
  // user actually sees, and stand the theme's input ring down inside it so
  // the field is never outlined twice. The ring is inset, so the
  // `overflow: hidden` above cannot clip it.
  '&:has(.MuiInputBase-root:focus-within)': {
    ...focusRingOnWrapper,
    '& .MuiInputBase-root.MuiInputBase-root': focusRingNone,
  },
  ...(!$useGradientBorder && {
    borderColor: $borderColor,
    borderWidth: $borderWidth,
    borderStyle: 'solid',
  }),
}));

export function BlurContainer({
  children,
  style,
  blurIntensity = 2,
  blurTint: _blurTint = 'dark',
  backgroundColor = colors.background.tokenItem,
  borderColor = colors.border.default,
  borderWidth = 1,
  useGradientBorder = true,
  className,
}: BlurContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!useGradientBorder || !ref.current) return;

    const el = ref.current;
    const observer = new ResizeObserver(() => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setLayout((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [useGradientBorder]);

  const borderRadius = typeof style?.borderRadius === 'number' ? style.borderRadius : 0;

  return (
    <BlurBox
      ref={ref}
      $blurIntensity={blurIntensity}
      $backgroundColor={backgroundColor}
      $borderColor={borderColor}
      $borderWidth={borderWidth}
      $useGradientBorder={useGradientBorder}
      style={style}
      className={className}
    >
      {children}
      {useGradientBorder && (
        <GradientBorderOverlay
          width={layout.width}
          height={layout.height}
          borderRadius={borderRadius}
          color={borderColor}
          strokeWidth={GLASSY_BORDER_WIDTH}
        />
      )}
    </BlurBox>
  );
}
