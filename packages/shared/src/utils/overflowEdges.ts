/**
 * Which edges of a horizontal carousel still hide content. A fade at an edge
 * says "there is more this way", so it may only stand where that is true:
 * never at the start when the row sits at its first item, never at the end
 * once the last one is fully in view (owner, on device, 2026-09-13).
 */
export interface OverflowEdgesInput {
  /** The scroll offset, from the start. */
  offset: number;
  contentWidth: number;
  containerWidth: number;
  /** Sub-pixel slack, so a row resting at an end counts as at it. */
  tolerance?: number;
}

export interface OverflowEdges {
  leading: boolean;
  trailing: boolean;
}

export function overflowEdges({
  offset,
  contentWidth,
  containerWidth,
  tolerance = 1,
}: OverflowEdgesInput): OverflowEdges {
  const maxOffset = contentWidth - containerWidth;
  if (containerWidth <= 0 || maxOffset <= tolerance) return { leading: false, trailing: false };
  return { leading: offset > tolerance, trailing: offset < maxOffset - tolerance };
}
