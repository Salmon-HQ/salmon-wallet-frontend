/**
 * The dApp surface's security rules, against a local test page and the public
 * test vector wallet ("abandon … about") — never the suite's own wallets, and
 * nothing is signed or sent.
 *
 * - One approval window at a time, across every origin, and a refused request
 *   does not raise another window.
 * - A lock in one wallet window locks the others; closing an approval window
 *   does not lock the side panel.
 * - Trust is per account: a site connected with account A is not connected for
 *   account B.
 * - The privileged channels answer only the extension's own pages: a content
 *   script asking for the vault key gets nothing, and cannot read or write
 *   storage.local.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

/** The public BIP39 test vector. Holds nothing and is safe to print. */
const TEST_VECTOR =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test.use({ profileName: 'dapp-security', freshProfile: true });

let backendUp = false;
let server: http.Server;
let port = 0;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
  const page = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'test-dapp.html')
  );
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

type ProviderResult = { ok: true } | { ok: false; error: string };

/** Open the local test page on `host` and wait for the injected provider. */
async function openDapp(context: BrowserContext, host: 'localhost' | '127.0.0.1'): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://${host}:${port}/`);
  await page.waitForFunction(() => 'salmon' in window);
  return page;
}

/** Start `salmon.connect(options)` without waiting for it; settle it with `connectResult`. */
function startConnect(page: Page, options?: { onlyIfTrusted: boolean }): Promise<void> {
  return page.evaluate((opts) => {
    const provider = (
      window as unknown as { salmon: { connect: (o?: unknown) => Promise<unknown> } }
    ).salmon;
    (window as unknown as { __connect: Promise<ProviderResult> }).__connect = provider
      .connect(opts ?? undefined)
      .then(
        () => ({ ok: true }) as const,
        (error: unknown) =>
          ({ ok: false, error: String((error as Error)?.message ?? error) }) as const
      );
  }, options);
}

const connectResult = (page: Page): Promise<ProviderResult> =>
  page.evaluate(() => (window as unknown as { __connect: Promise<ProviderResult> }).__connect);

const approvalWindow = (context: BrowserContext) =>
  context.waitForEvent('page', {
    predicate: (p) => p.url().includes('popup.html#'),
    timeout: 30_000,
  });

const approvalWindows = (context: BrowserContext) =>
  context.pages().filter((p) => p.url().includes('popup.html#'));

/** Unlock the fresh profile with the test vector and land on Home. */
async function onboard(popup: Page): Promise<void> {
  await unlockOrRecover(popup, { seed: TEST_VECTOR });
  await waitHome(popup);
}

test.describe('dApp security', () => {
  test.beforeEach(() => {
    test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  });

  test('one approval window across origins; a refused request opens none', async ({
    popup,
    context,
  }) => {
    await onboard(popup);
    const first = await openDapp(context, 'localhost');
    const opened = approvalWindow(context);
    await startConnect(first);
    const window = await opened;
    await expect(window.getByTestId('dapp-connect-approval')).toBeVisible({ timeout: 30_000 });

    // A second origin asks while the first window is open: refused outright.
    const second = await openDapp(context, '127.0.0.1');
    await startConnect(second);
    expect(await connectResult(second)).toEqual({
      ok: false,
      error: expect.stringContaining('Another approval is already open'),
    });
    expect(approvalWindows(context)).toHaveLength(1);

    await window.getByTestId('dapp-reject-button').click();
    expect((await connectResult(first)).ok).toBe(false);
  });

  test('a lock in one window locks the others; closing an approval window does not', async ({
    popup,
    context,
    extensionId,
  }) => {
    await onboard(popup);
    const sidePanel = await context.newPage();
    await sidePanel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await waitHome(sidePanel);

    // Locking the side panel locks an open approval window.
    const dapp = await openDapp(context, 'localhost');
    let opened = approvalWindow(context);
    await startConnect(dapp);
    let window = await opened;
    await expect(window.getByTestId('dapp-connect-approval')).toBeVisible({ timeout: 30_000 });
    await sidePanel.getByTestId('wallet-header-settings-button').click();
    await sidePanel.getByTestId('settings-item-security').click();
    await sidePanel.getByTestId('security-lock-now-button').click();
    await expect(sidePanel.getByTestId('lock-password-input')).toBeVisible({ timeout: 15_000 });
    await expect(window.getByTestId('lock-password-input')).toBeVisible({ timeout: 15_000 });
    await expect(window.getByTestId('dapp-approve-button')).toHaveCount(0);
    await window.close();
    await connectResult(dapp);

    // Closing an approval window leaves the side panel unlocked.
    expect(await unlockOrRecover(sidePanel)).toBe('unlocked');
    await waitHome(sidePanel);
    opened = approvalWindow(context);
    await startConnect(dapp);
    window = await opened;
    await expect(window.getByTestId('dapp-connect-approval')).toBeVisible({ timeout: 30_000 });
    await window.close();
    await connectResult(dapp);
    await expect(sidePanel.getByTestId('home-screen')).toBeVisible();
    await expect(sidePanel.getByTestId('lock-password-input')).toHaveCount(0);
  });

  test('trust is per account: connected with A is not connected with B', async ({
    popup,
    context,
  }) => {
    test.setTimeout(6 * 60_000); // deriving a second account scans every network
    await onboard(popup);

    const dapp = await openDapp(context, 'localhost');
    let opened = approvalWindow(context);
    await startConnect(dapp);
    let window = await opened;
    await window.getByTestId('dapp-approve-button').click();
    expect(await connectResult(dapp)).toEqual({ ok: true });

    // Silent connect answers for the account that approved.
    await startConnect(dapp, { onlyIfTrusted: true });
    expect(await connectResult(dapp)).toEqual({ ok: true });

    // Derive a second account; adding it makes it active.
    await popup.getByTestId('wallet-header-settings-button').click();
    await popup.getByTestId('settings-item-accounts').click();
    await popup.getByTestId('account-add-button').click();
    await popup.getByTestId('account-add-method-derive').click();
    const derived = popup.locator('[data-testid^="account-add-derived-"]').first();
    await expect(derived).toBeVisible({ timeout: 120_000 });
    await derived.click();
    await popup.getByTestId('account-add-derive-continue-button').click();
    await popup.getByTestId('account-add-confirm-button').click();
    // The approval window's close cleared the session key, so adding the
    // account asks for the password again.
    const reauth = popup.getByTestId('account-add-reauth-password');
    await expect(reauth.or(popup.getByTestId('home-screen'))).toBeVisible({ timeout: 60_000 });
    if (await reauth.isVisible()) {
      await reauth.fill(process.env.SALMON_TEST_PASSWORD ?? '');
      await popup.getByTestId('account-add-reauth-confirm-button').click();
    }
    await expect(popup.getByTestId('settings-screen')).toHaveCount(0, { timeout: 60_000 });
    await waitHome(popup);

    // For account B the site is not connected: silent connect is refused and
    // a normal connect asks for approval again.
    await startConnect(dapp, { onlyIfTrusted: true });
    expect(await connectResult(dapp)).toEqual({
      ok: false,
      error: expect.stringContaining('Not connected'),
    });
    opened = approvalWindow(context);
    await startConnect(dapp);
    window = await opened;
    await expect(window.getByTestId('dapp-connect-approval')).toBeVisible({ timeout: 30_000 });
    await window.getByTestId('dapp-reject-button').click();
    await connectResult(dapp);
  });

  test('a content script asking the privileged channels for the vault key gets nothing', async ({
    popup,
    context,
  }) => {
    await onboard(popup); // the derived key is in the stash while unlocked
    const dapp = await openDapp(context, 'localhost');

    // Reach the Salmon content script's isolated world through CDP.
    const cdp = await context.newCDPSession(dapp);
    const contexts: { id: number; name: string; auxData?: { type?: string } }[] = [];
    cdp.on('Runtime.executionContextCreated', ({ context: c }) => contexts.push(c));
    await cdp.send('Runtime.enable');
    await expect
      .poll(() => contexts.find((c) => c.auxData?.type === 'isolated')?.id, { timeout: 10_000 })
      .toBeDefined();
    const isolated = contexts.find((c) => c.auxData?.type === 'isolated')!;

    // Only whether a value came back leaves the page — never the value.
    const { result } = await cdp.send('Runtime.evaluate', {
      contextId: isolated.id,
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const ask = (channel, data) => new Promise((resolve) => {
          try { chrome.runtime.sendMessage({ channel, data }, (r) => resolve(r !== undefined && r !== null)); }
          catch { resolve(false); }
        });
        return {
          key: await ask('salmon_extension_stash_channel', { method: 'get', key: 'derived_key_cache' }),
          activity: await ask('salmon_extension_stash_channel', { method: 'get', key: 'salmon_last_activity' }),
        };
      })()`,
    });
    expect(result.value).toEqual({ key: false, activity: false });

    // storage.local (the encrypted vault, the trusted apps) is closed to it too.
    const storage = await cdp.send('Runtime.evaluate', {
      contextId: isolated.id,
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const out = {};
        try { const v = await chrome.storage.local.get('salmon_mnemonics'); out.read = !!v.salmon_mnemonics; }
        catch { out.read = false; }
        try { await chrome.storage.local.set({ salmon_probe: 1 }); out.write = true; }
        catch { out.write = false; }
        return out;
      })()`,
    });
    expect(storage.result.value).toEqual({ read: false, write: false });
  });
});
