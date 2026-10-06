/**
 * The Powerups kill switch, as the availability route carries it (spec 018,
 * the same shape `/v1/networks.powerups` had): `[{ id, enabled, reason?,
 * provider? }]`. Read here into an allowlist the rest of the app can ask
 * three things of — is this id offered, if it is switched off, why, and
 * which provider routes it.
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
  /** The routing provider per enabled id, for the ones that have one. */
  providers: Readonly<Record<string, string>>;
}

export const EMPTY_POWERUP_ALLOWLIST: PowerupAllowlist = Object.freeze({
  enabled: Object.freeze([]) as readonly string[],
  disabled: Object.freeze({}) as Readonly<Record<string, PowerupDisabledReason>>,
  providers: Object.freeze({}) as Readonly<Record<string, string>>,
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
    const { id, enabled, reason, provider } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || id.length === 0 || typeof enabled !== 'boolean') continue;
    if (!enabled) {
      switches.push(isReason(reason) ? { id, enabled, reason } : { id, enabled });
    } else if (typeof provider === 'string' && provider.length > 0) {
      switches.push({ id, enabled, provider });
    } else {
      switches.push({ id, enabled });
    }
  }
  return switches;
}

export function toPowerupAllowlist(switches: readonly NetworkPowerupSwitch[]): PowerupAllowlist {
  const enabled: string[] = [];
  const disabled: Record<string, PowerupDisabledReason> = {};
  const providers: Record<string, string> = {};
  for (const item of switches) {
    if (item.enabled) {
      enabled.push(item.id);
      if (item.provider) providers[item.id] = item.provider;
    } else if (item.reason) disabled[item.id] = item.reason;
    // Disabled without a reason: not offered, and nothing to say about it.
  }
  return { enabled, disabled, providers };
}
