/**
 * A batch request (`signAllTransactions`) against a local test page and the
 * public test vector wallet ("abandon … about"). Nothing is signed or sent:
 * every request here is rejected or refused.
 *
 * - Abuse case: a batch whose first transaction looks ordinary. Every message
 *   is signed, so the approval lists every one — the outsized transaction in
 *   the middle is on screen — and shows the fee of all of them.
 * - A batch with a message the wallet cannot read cannot be approved.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

/** The public BIP39 test vector. Holds nothing and is safe to print. */
const TEST_VECTOR =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const suiteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test.use({ profileName: 'dapp-batch-approval', freshProfile: true });

let backendUp = false;
let server: http.Server;
let port = 0;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
  const page = fs.readFileSync(path.join(suiteRoot, 'scripts', 'test-dapp.html'));
  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(page);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const approvalWindow = (context: BrowserContext) =>
  context.waitForEvent('page', {
    predicate: (p) => p.url().includes('popup.html#'),
    timeout: 30_000,
  });

/** Approve the way a person does: the button arms once the pointer comes onto it. */
async function approve(window: Page): Promise<void> {
  const button = window.getByTestId('dapp-approve-button');
  await expect(async () => {
    await window.mouse.move(100, 200);
    await window.mouse.move(140, 260);
    await button.hover();
    await expect(button).toBeEnabled({ timeout: 250 });
  }).toPass({ timeout: 30_000 });
  await button.click();
}

/** Onboard, open the test page, connect it, and return the page and the wallet's address. */
async function connectedDapp(popup: Page, context: BrowserContext) {
  await unlockOrRecover(popup, { seed: TEST_VECTOR });
  await waitHome(popup);

  const dapp = await context.newPage();
  await dapp.goto(`http://localhost:${port}/`);
  await dapp.waitForFunction(() => 'salmon' in window);

  const opened = approvalWindow(context);
  const connecting = dapp.evaluate(async () => {
    const provider = (
      window as unknown as { salmon: { connect: () => Promise<{ publicKey: unknown }> } }
    ).salmon;
    return String((await provider.connect()).publicKey);
  });
  const window = await opened;
  await expect(window.getByTestId('dapp-connect-approval')).toBeVisible({ timeout: 30_000 });
  await approve(window);
  return { dapp, address: await connecting };
}

/** A legacy message of `transfers` one-lamport transfers to self, as bytes. */
function selfTransfers(address: string, transfers: number, blockhash: string): number[] {
  const payer = new PublicKey(address);
  const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash });
  for (let i = 0; i < transfers; i += 1) {
    tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: payer, lamports: 1 }));
  }
  return [...tx.serializeMessage()];
}

/** Ask the wallet to sign `messages` as one batch; the outcome lands in `window.__batch`. */
function requestBatch(dapp: Page, messages: number[][]): Promise<void> {
  return dapp.evaluate((batch) => {
    const provider = (
      window as unknown as { salmon: { signAllTransactions: (txs: unknown[]) => Promise<unknown> } }
    ).salmon;
    const transactions = batch.map((bytes) => ({
      serializeMessage: () => new Uint8Array(bytes),
    }));
    (window as unknown as { __batch: Promise<string> }).__batch = provider
      .signAllTransactions(transactions)
      .then(
        () => 'signed',
        (error: unknown) => `refused: ${String((error as Error)?.message ?? error)}`
      );
  }, messages);
}

/**
 * The window a signing request opens. Approving the connect closed its own
 * window, and a wallet popup that closes locks the wallet, so this one opens
 * on the lock screen: unlock it the way the user would.
 */
async function signingWindow(opened: Promise<Page>): Promise<Page> {
  const window = await opened;
  expect(await unlockOrRecover(window)).toBe('unlocked');
  return window;
}

const batchOutcome = (dapp: Page): Promise<string> =>
  dapp.evaluate(() => (window as unknown as { __batch: Promise<string> }).__batch);

/**
 * A recent mainnet blockhash, so the fee rows carry real fees; any 32 bytes
 * when the public RPC does not answer, and the fees then read "-". The fees
 * are not asserted on either way.
 */
async function recentBlockhash(): Promise<string> {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash' }),
      signal: AbortSignal.timeout(5_000),
    });
    return (await response.json()).result.value.blockhash;
  } catch {
    return '11111111111111111111111111111111';
  }
}

test.describe('dApp batch approval', () => {
  test.beforeEach(() => {
    test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  });

  test('abuse: the outsized transaction of a batch is listed, not hidden behind the first', async ({
    popup,
    context,
  }) => {
    const { dapp, address } = await connectedDapp(popup, context);

    const blockhash = await recentBlockhash();
    const opened = approvalWindow(context);
    await requestBatch(dapp, [
      selfTransfers(address, 1, blockhash),
      selfTransfers(address, 14, blockhash),
      selfTransfers(address, 2, blockhash),
    ]);
    const window = await signingWindow(opened);

    await expect(window.getByTestId('dapp-transaction-approval')).toBeVisible({ timeout: 30_000 });
    await expect(window.getByTestId('batch-size')).toContainText('3');
    await expect(window.getByTestId('batch-item-0')).toContainText('1 instruction');
    await expect(window.getByTestId('batch-item-1')).toContainText('14 instructions');
    await expect(window.getByTestId('batch-item-2')).toContainText('2 instructions');

    // The overview sits below the fold of the approval's own scroll area.
    await window.getByTestId('batch-item-2').scrollIntoViewIfNeeded();
    await window.screenshot({
      path: path.join(suiteRoot, 'screenshots', 'dapp-batch-approval.png'),
    });

    await window.getByTestId('dapp-reject-button').click();
    expect(await batchOutcome(dapp)).toContain('refused');
  });

  test('a batch with a message the wallet cannot read cannot be approved', async ({
    popup,
    context,
  }) => {
    const { dapp, address } = await connectedDapp(popup, context);

    const opened = approvalWindow(context);
    await requestBatch(dapp, [selfTransfers(address, 1, await recentBlockhash()), [1, 2, 3, 4, 5]]);
    const window = await signingWindow(opened);

    await expect(window.getByTestId('decode-error')).toBeVisible({ timeout: 30_000 });
    await expect(window.getByTestId('batch-item-0')).toHaveCount(0);

    await window.getByTestId('dapp-reject-button').click();
    expect(await batchOutcome(dapp)).toContain('refused');
  });
});
