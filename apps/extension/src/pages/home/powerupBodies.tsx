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
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, fontWeight, lineHeight, spacing } from '@salmon/shared';
import { getPowerup, type PowerupId } from '@salmon/shared/powerups';
import { useSemantic } from '@salmon/ui';
import { MemoPage, PaymentsPage } from '@salmon/ui/powerups';

export interface PowerupBodyContext {
  /** The active account's receive address on `networkId`; never null here. */
  publicKey: string;
  networkId: string | null;
  /** Home's way back: the portfolio the result belongs to. */
  onNavigateHome: () => void;
  /** Home's Send, for a Powerup that pays. */
  onPay?: () => void;
}

/**
 * The installed Powerup's surface, or `null` when this id draws none — a
 * build with Powerups off (every page is `null` there), or a stored tab whose
 * Powerup is gone.
 */
export function renderPowerupBody(id: string, ctx: PowerupBodyContext): React.ReactElement | null {
  const page = renderPowerupPage(id, ctx);
  if (!page) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: spacing.screenGutter,
      }}
    >
      <PowerupUsage id={id} />
      {page}
    </div>
  );
}

/**
 * How to use the Powerup, left-aligned under the sub-tabs in the header's
 * own subtitle voice; the surface starts under it (`docs/POWERUPS-UI.md` §1.1).
 */
function PowerupUsage({ id }: { id: string }) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const usageKey = getPowerup(id as PowerupId)?.usageKey;
  if (!usageKey) return null;
  return (
    <span
      data-testid={`home-powerup-usage-${id}`}
      style={{
        fontFamily: fontFamily.sans,
        fontWeight: fontWeight.medium,
        fontSize: fontSize.subtitle,
        lineHeight: `${fontSize.subtitle * lineHeight.snug}px`,
        color: semantic.text.secondary,
        padding: `0 ${spacing.headerPadding}px`,
      }}
    >
      {t(usageKey)}
    </span>
  );
}

function renderPowerupPage(id: string, ctx: PowerupBodyContext): React.ReactElement | null {
  if (id === 'memo' && MemoPage) {
    return (
      <MemoPage
        publicKey={ctx.publicKey}
        networkId={ctx.networkId}
        onNavigateHome={ctx.onNavigateHome}
      />
    );
  }
  if (id === 'payments' && PaymentsPage) {
    return (
      <PaymentsPage
        publicKey={ctx.publicKey}
        networkId={ctx.networkId}
        onNavigateHome={ctx.onNavigateHome}
        onPay={ctx.onPay}
      />
    );
  }
  return null;
}
