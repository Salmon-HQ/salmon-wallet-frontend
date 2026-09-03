/**
 * SeedWordGrid — the recovery phrase shown in numbered cells, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SeedPhrase/SeedWordGrid.tsx`;
 * same cell, same inks, read off the live mode.
 */
import {
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  spacing,
  tabularNums,
} from '@salmon/shared';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { useSemantic } from '../../theme/ThemeProvider';
import type { SeedWordGridProps } from './types';

/**
 * The floor a word may shrink to: the mono step already reserved for
 * position-critical strings shorter than a seed word (addresses, hashes) —
 * see `fontSize.mono` / `fontSize.monoLg`. Never smaller than the token the
 * type scale already offers.
 */
const WORD_FIT_MIN_SCALE = fontSize.mono / fontSize.monoLg;

/**
 * One seed word, fit to its cell rather than clipped or wrapped — the longest
 * BIP-39 words ("tobacco", "vacant") ran past the cell border at the
 * extension side panel's narrow widths (320-400px) because the mono text
 * never shrank and the cell never grew. Same measured-fit approach as
 * `BalanceHeader`'s total: shrink only as far as the available width demands.
 */
function SeedWordCell({
  position,
  value,
  cell,
  index,
  word,
}: {
  position: number;
  value: string;
  cell: CSSProperties;
  index: CSSProperties;
  word: CSSProperties;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = spanRef.current;
    if (!box || !span) return undefined;
    const measure = () => {
      const needed = span.scrollWidth / (Number(span.dataset.fit) || 1);
      const available = box.clientWidth;
      const next =
        available > 0 && needed > available ? Math.max(WORD_FIT_MIN_SCALE, available / needed) : 1;
      span.dataset.fit = String(next);
      setFit(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div style={cell} data-testid={`seed-word-cell-${position}`}>
      <span style={index}>{position}</span>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }} ref={boxRef}>
        <span
          ref={spanRef}
          style={{
            ...word,
            fontSize: (word.fontSize as number) * fit,
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export function SeedWordGrid({ words, columns = 3 }: SeedWordGridProps) {
  const { border, surface, text } = useSemantic();
  const cardWidth = `calc(${100 / columns}% - ${spacing.sm}px)`;

  /**
   * The Bedrock Rule (DESIGN.md) governs the surface a seed phrase actually
   * rests on, and that is the cell rather than the screen behind it: the page
   * already stands on bedrock, so a translucent cell drawn over it puts a live
   * backdrop directly under the words. The cell takes the same opaque ground.
   */
  const cell: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    boxSizing: 'border-box',
    width: cardWidth,
    minWidth: 0,
    backgroundColor: surface.bedrock,
    border: `${borderWidth.thin}px solid ${border.raised}`,
    borderRadius: borderRadius.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    gap: spacing.xs,
  };

  /**
   * Seed Phrase Rule (DESIGN.md): cell numbers are `text.tertiary` at label
   * size so they are never mistaken for part of the phrase — the salmon accent
   * stays out of the numbers.
   */
  const index: CSSProperties = {
    ...tabularNums.css,
    color: text.tertiary,
    fontFamily: fontFamily.sans,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.label,
    minWidth: componentSizes.iconSizeSmall,
  };

  /**
   * Seed words are Geist Mono at the larger mono size, weight 500 (the Seed
   * Phrase Rule) — the most position-critical string in the app, read character
   * by character.
   */
  const word: CSSProperties = {
    color: text.primary,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.monoLg,
    fontWeight: fontWeight.medium,
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
      {words.map((value, position) => (
        <SeedWordCell
          key={position}
          position={position + 1}
          value={value}
          cell={cell}
          index={index}
          word={word}
        />
      ))}
    </div>
  );
}
