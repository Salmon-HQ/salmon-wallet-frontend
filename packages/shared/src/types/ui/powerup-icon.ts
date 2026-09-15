/**
 * The glyphs a Powerup may wear.
 *
 * A Powerup ships no art (spec 029 §2.1 and `docs/POWERUPS-UI.md` §1.2): its
 * manifest names one of these, and each twin resolves the name against its own
 * Phosphor renderer — `packages/ui/src/icons.ts` on the DOM,
 * `apps/mobile/src/icons.ts` on mobile, both as an exhaustive
 * `Record<PowerupIconName, IconComponent>`, so a name added here fails to
 * compile until both twins draw it.
 *
 * The union is the allow-list: a manifest cannot name an arbitrary component,
 * and the catalogue no longer keeps a table of Powerup ids.
 */
export type PowerupIconName =
  | 'ArrowsLeftRight'
  | 'ChartPie'
  | 'Image'
  | 'Lightning'
  | 'PencilSimple'
  | 'QrCode'
  | 'ShieldCheck'
  | 'Stack'
  | 'TrendUp';
