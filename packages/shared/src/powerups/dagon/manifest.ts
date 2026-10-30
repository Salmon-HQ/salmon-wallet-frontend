/**
 * Dagon — hide, reveal and swap Dagon's mock tokens on Solana devnet, a
 * preview of Inkwell Finance's pc-token / pc-swap programs on Encrypt's
 * pre-alpha network (spec 043). Devnet only; nothing is encrypted yet.
 */
import type { PowerupManifest } from '../manifest';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';
import { ENCRYPT_PROGRAM, EXECUTOR_HOST, PC_SWAP_PROGRAM, PC_TOKEN_PROGRAM } from './constants';

export const dagonManifest = {
  id: 'dagon',
  iconName: 'Stack',
  tier: 'core',
  networks: ['solana-devnet'],
  nameKey: 'dagon.catalog.name',
  descriptionKey: 'dagon.catalog.description',
  aboutKey: 'dagon.catalog.about',
  usageKey: 'dagon.catalog.usage',
  actionKeys: [
    'dagon.catalog.actions.hide',
    'dagon.catalog.actions.reveal',
    'dagon.catalog.actions.swap',
  ],
  authorKey: 'powerups.author.salmon',
  // The address and the amounts reach Encrypt (the backend's inputs, the
  // device's read), and the read returns a balance (Q2).
  permissions: ['address', 'balances'],
  endpoints: [`https://${EXECUTOR_HOST}`, 'https://raw.githubusercontent.com'],
  programs: [
    ENCRYPT_PROGRAM,
    PC_TOKEN_PROGRAM,
    PC_SWAP_PROGRAM,
    TOKEN_PROGRAM,
    ASSOCIATED_TOKEN_PROGRAM,
    SYSTEM_PROGRAM,
    COMPUTE_BUDGET_PROGRAM,
  ],
  locales: 'dagon',
  entries: { tab: 'dagon' },
  freshSigners: true,
} as const satisfies PowerupManifest;
