/**
 * The Powerups boundary is a lint property (spec 027 §2): this test runs the
 * repo's ESLint config over fixtures addressed INSIDE `powerups/` and asserts
 * the rule fires for every door a Powerup must not open — and stays quiet
 * for the one it may use.
 *
 * The fixtures are linted as text at a `powerups/__fixtures__/` path, so no
 * violating file lives on disk for `pnpm lint` to trip over.
 */
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const FIXTURE_PATH = path.join(REPO_ROOT, 'packages/shared/src/powerups/__fixtures__/probe.ts');

async function lint(code: string, filePath = FIXTURE_PATH) {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

describe('powerups boundary', () => {
  it.each([
    ["import { signProposal } from '../core/signing';", 'no-restricted-imports'],
    ["import { signAndSendSolanaTransaction } from '../core/broadcast';", 'no-restricted-imports'],
    ["import { encrypt } from '../crypto';", 'no-restricted-imports'],
    ["import { getStorage } from '../storage';", 'no-restricted-imports'],
    [
      "import { SolanaAccount } from '../blockchain/solana/SolanaAccount';",
      'no-restricted-imports',
    ],
    ["import { partiallySignTransaction } from '@solana/kit';", 'no-restricted-imports'],
    [
      "import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';",
      'no-restricted-imports',
    ],
    [
      "import { useRequestReceivedSignature } from '../core/confirmation/received';",
      'no-restricted-imports',
    ],
    [
      "import { useSolanaPayTransactionRequest } from '../hooks/useSolanaPayTransactionRequest';",
      'no-restricted-imports',
    ],
    ["import { useSolanaPayTransactionRequest } from '../hooks';", 'no-restricted-imports'],
    ["import { useSolanaPayRequest } from '../../hooks/index';", 'no-restricted-imports'],
    ["import { useSolanaPayTransactionRequest } from '@salmon/shared';", 'no-restricted-imports'],
    ["import { useSolanaPayRequest } from '../..';", 'no-restricted-imports'],
    [
      "import { useRequestReceivedSignature } from '../core/confirmation';",
      'no-restricted-imports',
    ],
    ["import { ReceivedSignatureContext } from '../core';", 'no-restricted-imports'],
    [
      "import * as shared from '@salmon/shared';\nexport const s = shared;",
      'no-restricted-imports',
    ],
    ['export const k = (account: { signer: unknown }) => account.signer;', 'no-restricted-syntax'],
    [
      'export const k = (account: { keyPair: unknown }) => account.keyPair;',
      'no-restricted-syntax',
    ],
  ])('fails on %s', async (code, rule) => {
    const rules = await lint(code.includes('export') ? code : `${code}\nexport {};`);
    expect(rules).toContain(rule);
  });

  it('allows the one door: requestSignature from core/confirmation, and plain kit reads', async () => {
    const rules = await lint(
      [
        "import { useRequestSignature } from '../core/confirmation';",
        "import { address } from '@solana/kit';",
        'export const ok = [useRequestSignature, address];',
      ].join('\n')
    );
    expect(rules).toEqual([]);
  });

  // A Powerup's screens live outside `powerups/` (each app registers them
  // from its Powerups entry), and they hold the same boundary.
  it.each([
    [
      'apps/mobile/src/screens/SwapTab.tsx',
      "import { useSolanaPayRequest } from '@salmon/shared';",
    ],
    [
      'apps/mobile/src/screens/PaymentsTab.tsx',
      "import { SolanaPayRequest } from '../components';",
    ],
    [
      'apps/mobile/src/components/PowerupsCatalog/PowerupsCatalog.tsx',
      "import { signProposal } from '@salmon/shared/core/signing';",
    ],
    [
      'packages/ui/src/components/SwapPage/SwapPage.tsx',
      "import { SolanaPayRequest } from '../SolanaPayRequestSheet';",
    ],
    ['packages/ui/src/components/MemoPage/MemoPage.tsx', "import { SolanaPayRequest } from '..';"],
    ['packages/ui/src/powerups.ts', "import { SolanaPayRequest } from './components';"],
    [
      'apps/extension/src/pages/home/powerupBodies.tsx',
      "import { SolanaPayRequest } from '@salmon/ui';",
    ],
  ])('fails in %s on %s', async (file, code) => {
    const rules = await lint(`${code}\nexport {};`, path.join(REPO_ROOT, file));
    expect(rules).toContain('no-restricted-imports');
  });
});
