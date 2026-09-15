/**
 * The extension's Powerup mount point — the one file that knows which surface
 * an installed Powerup id draws.
 *
 * Mobile has `apps/mobile/src/powerups/index.ts` → `getPowerupTab(id)`; this
 * is its DOM counterpart, and it exists for the same reason: a Powerup's
 * registration is a named place, not a conditional buried inside Home. Home
 * decides WHETHER a Powerup is mounted — the tab is offered, the backend has
 * not switched it off, an account exists — and this decides WHICH.
 *
 * The props differ per Powerup because the pages do, and they come from what
 * Home already holds. A page reading them for itself would repeat Home's own
 * queries, so they arrive as `PowerupBodyContext` instead.
 */
import React from 'react';
import { MemoPage } from '@salmon/ui/powerups';

export interface PowerupBodyContext {
  /** The active account's receive address on `networkId`; never null here. */
  publicKey: string;
  networkId: string | null;
  /** Home's way back: the portfolio the result belongs to. */
  onNavigateHome: () => void;
}

/**
 * The installed Powerup's surface, or `null` when this id draws none — a
 * build with Powerups off (every page is `null` there), or a stored tab whose
 * Powerup is gone.
 */
export function renderPowerupBody(id: string, ctx: PowerupBodyContext): React.ReactElement | null {
  if (id === 'memo' && MemoPage) {
    return (
      <MemoPage
        publicKey={ctx.publicKey}
        networkId={ctx.networkId}
        onNavigateHome={ctx.onNavigateHome}
      />
    );
  }
  return null;
}
