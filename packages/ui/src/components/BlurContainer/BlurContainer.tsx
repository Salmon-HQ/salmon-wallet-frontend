/**
 * BlurContainer - A reusable blur effect component
 *
 * DOM version using CSS backdrop-filter. Renders a radial gradient border
 * (Figma "Glassy_BORDER") by default via an inline SVG overlay with
 * <radialGradient> stroke. When a custom borderColor is provided, the
 * gradient uses that color.
 *
 * The blur is conditional on the fill being translucent. The default fill is
 * `surface.raised`, which is opaque — a list row is content, and DESIGN.md
 * gives translucency only to floating chrome — so the common case is an
 * opaque surface with a glassy edge and no backdrop filter at all. Pass a
 * translucent `backgroundColor` and the blur comes back. The mobile twin
 * (`apps/mobile/.../BlurContainer`) makes the same call on the same tokens.
 */
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { isOpaqueColor } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
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

export function BlurContainer({
  children,
  style,
  blurIntensity = 2,
  blurTint: _blurTint = 'dark',
  backgroundColor,
  borderColor,
  borderWidth = 1,
  useGradientBorder = true,
  className,
}: BlurContainerProps) {
  const { surface, border } = useSemantic();
  const fill = backgroundColor ?? surface.raised;
  const edge = borderColor ?? border.default;
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

  const boxStyle: CSSProperties = {
    // A backdrop blur behind an opaque fill blurs nothing and still costs a
    // compositor layer, and DESIGN.md's degradation ladder bans
    // `backdrop-filter` on a list row in the extension outright. Now that the
    // default fill is opaque, most of these containers are rows and skip it.
    ...(isOpaqueColor(fill)
      ? {}
      : {
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        }),
    backgroundColor: fill,
    overflow: 'hidden',
    position: 'relative',
    ...(useGradientBorder ? {} : { border: `${borderWidth}px solid ${edge}` }),
    ...style,
  };

  return (
    <div ref={ref} style={boxStyle} className={className}>
      {children}
      {useGradientBorder && (
        <GradientBorderOverlay
          width={layout.width}
          height={layout.height}
          borderRadius={borderRadius}
          color={edge}
          strokeWidth={GLASSY_BORDER_WIDTH}
        />
      )}
    </div>
  );
}
