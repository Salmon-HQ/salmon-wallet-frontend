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

async function lint(code: string) {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const [result] = await eslint.lintText(code, { filePath: FIXTURE_PATH });
  return result.messages.map((message) => message.ruleId);
}

describe('powerups boundary', () => {
  it.each([
    ["import { signProposal } from '../core/signing';", 'no-restricted-imports'],
    ["import { signAndSendSolanaTransaction } from '../core/broadcast';", 'no-restricted-imports'],
    ["import { encrypt } from '../crypto';", 'no-restricted-imports'],
    ["import { getStorage } from '../storage';", 'no-restricted-imports'],
    ["import { SolanaAccount } from '../blockchain/solana/SolanaAccount';", 'no-restricted-imports'],
    ["import { partiallySignTransaction } from '@solana/kit';", 'no-restricted-imports'],
    [
      "import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';",
      'no-restricted-imports',
    ],
    ['export const k = (account: { signer: unknown }) => account.signer;', 'no-restricted-syntax'],
    ['export const k = (account: { keyPair: unknown }) => account.keyPair;', 'no-restricted-syntax'],
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
});
