/**
 * The Powerups kill switch, as `/v1/networks` carries it (spec 029 §5.2):
 * per network, `powerups: [{ id, enabled, reason? }]`. Read here into an
 * allowlist the rest of the app can ask two things of — is this id offered,
 * and if it is switched off, why.
 *
 * Fail closed, every time: a missing field, a non-array, an entry without a
 * string id or a boolean `enabled` yields NO Powerups, never all of them. A
 * `reason` outside the three the copy knows is dropped, so the notice never
 * has to render a key that does not exist.
 */
import type { NetworkPowerupSwitch, PowerupDisabledReason } from '../types/blockchain';

export interface PowerupAllowlist {
  /** The ids the network offers right now. */
  enabled: readonly string[];
  /** The ids switched off, each with the reason its notice shows. */
  disabled: Readonly<Record<string, PowerupDisabledReason>>;
}

export const EMPTY_POWERUP_ALLOWLIST: PowerupAllowlist = Object.freeze({
  enabled: Object.freeze([]) as readonly string[],
  disabled: Object.freeze({}) as Readonly<Record<string, PowerupDisabledReason>>,
});

const REASONS: readonly PowerupDisabledReason[] = ['region', 'maintenance', 'deprecated'];

function isReason(value: unknown): value is PowerupDisabledReason {
  return typeof value === 'string' && (REASONS as readonly string[]).includes(value);
}

/** The field as the backend sent it → the switches the client trusts. */
export function parsePowerupSwitches(value: unknown): NetworkPowerupSwitch[] {
  if (!Array.isArray(value)) return [];
  const switches: NetworkPowerupSwitch[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, enabled, reason } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || id.length === 0 || typeof enabled !== 'boolean') continue;
    switches.push(!enabled && isReason(reason) ? { id, enabled, reason } : { id, enabled });
  }
  return switches;
}

export function toPowerupAllowlist(switches: readonly NetworkPowerupSwitch[]): PowerupAllowlist {
  const enabled: string[] = [];
  const disabled: Record<string, PowerupDisabledReason> = {};
  for (const item of switches) {
    if (item.enabled) enabled.push(item.id);
    else if (item.reason) disabled[item.id] = item.reason;
    // Disabled without a reason: not offered, and nothing to say about it.
  }
  return { enabled, disabled };
}
