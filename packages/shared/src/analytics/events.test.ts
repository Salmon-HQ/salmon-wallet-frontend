/**
 * Catalog tests. The backend mirrors these lists (`src/analytics/event-schema.js`);
 * a name or key that changes here without changing there is rejected at ingest.
 */

import { describe, it, expect } from 'vitest';
import { ANALYTICS_EVENTS, ALLOWED_PROP_KEYS, POWERUP_IDS } from './events';
import { POWERUPS } from '../powerups/registry';

/** The catalog before v2. Renaming or reordering one breaks history in Google Analytics. */
const V1_EVENTS = [
  'wallet_created',
  'wallet_recovered',
  'first_send_completed',
  'send_completed',
  'nft_viewed',
  'nft_sent',
  'network_switched',
  'wallet_switched',
  'address_book_used',
];

const V2_EVENTS = [
  'app_opened',
  'powerup_installed',
  'powerup_uninstalled',
  'swap_completed',
  'first_swap_completed',
  'memo_sent',
  'payment_request_created',
  'payment_request_paid',
  'dapp_connected',
  'dapp_message_signed',
  'dapp_transaction_signed',
];

describe('analytics catalog', () => {
  it('holds the 20 events, the 9 existing ones first and unchanged', () => {
    expect(ANALYTICS_EVENTS).toEqual([...V1_EVENTS, ...V2_EVENTS]);
  });

  it('allows exactly the 5 prop keys', () => {
    expect([...ALLOWED_PROP_KEYS].sort()).toEqual(
      ['chain', 'from_chain', 'powerup', 'success', 'to_chain'].sort()
    );
  });

  it('lists the Powerup ids the powerup prop may hold', () => {
    expect(POWERUP_IDS).toEqual(['swap', 'payments', 'memo', 'skr']);
  });

  // A new Powerup that forgets this list would throw in development and be
  // dropped in production on its first install event.
  it('covers every Powerup in the registry', () => {
    for (const entry of POWERUPS) {
      expect(POWERUP_IDS).toContain(entry.id);
    }
  });
});
