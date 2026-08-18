/**
 * The recovery-phrase word grid, in a real browser.
 *
 * The unit tests in `packages/ui` prove the state machine; this proves the two
 * things only a browser can: that a real paste event distributes across the
 * boxes, and that twenty-four words stay inside the `body` band the slot grid
 * reserved instead of pushing the primary action off the screen.
 *
 * **No real or realistic recovery phrase appears here.** Every word is an
 * obvious placeholder and no arrangement of them is a valid mnemonic, which is
 * fine: what is measured is layout and focus, never validation.
 */
import { expect, test, type Page } from '@playwright/test';

const placeholders = (count: number) =>
  Array.from({ length: count }, (_, i) => `placeholder${i + 1}`);

/** A real clipboard paste into a box, without granting clipboard permissions. */
async function pasteInto(page: Page, position: number, text: string) {
  await page.getByTestId(`recover-word-input-${position}`).evaluate((node, value) => {
    const data = new DataTransfer();
    data.setData('text', value);
    node.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  }, text);
}

test.use({ viewport: { width: 400, height: 956 } });

test.beforeEach(async ({ page }) => {
  await page.goto('/auth/recover');
  await page.getByTestId('recover-word-grid').waitFor({ state: 'visible' });
});

test('shows twelve boxes in three columns, not one big field', async ({ page }) => {
  await expect(page.getByTestId('recover-word-grid')).toHaveAttribute('data-columns', '3');
  await expect(page.getByTestId(/^recover-word-input-\d+$/)).toHaveCount(12);
  // The single free-text field this replaces is gone.
  await expect(page.locator('textarea')).toHaveCount(0);
});

test('space commits the word where it was typed and advances focus', async ({ page }) => {
  await page.getByTestId('recover-word-input-1').click();
  await page.keyboard.type('placeholderone ');

  await expect(page.getByTestId('recover-word-input-1')).toHaveValue('placeholderone');
  await expect(page.getByTestId('recover-word-input-2')).toBeFocused();
});

test('lowercases as it is typed, not at validation time', async ({ page }) => {
  await page.getByTestId('recover-word-input-1').click();
  await page.keyboard.type('PlaceHolder');
  await expect(page.getByTestId('recover-word-input-1')).toHaveValue('placeholder');
});

test('backspace in an empty box returns to the previous one', async ({ page }) => {
  await page.getByTestId('recover-word-input-4').click();
  await page.keyboard.press('Backspace');
  await expect(page.getByTestId('recover-word-input-3')).toBeFocused();
});

test('a paste into any box fills all twelve', async ({ page }) => {
  await pasteInto(page, 5, placeholders(12).join('\n'));

  for (const [index, word] of placeholders(12).entries()) {
    await expect(page.getByTestId(`recover-word-input-${index + 1}`)).toHaveValue(word);
  }
});

test('a wrong-length paste is kept, and the screen says what happened', async ({ page }) => {
  await pasteInto(page, 1, 'alpha bravo charlie delta echo');

  await expect(page.getByTestId('recover-word-input-1')).toHaveValue('alpha');
  await expect(page.getByTestId('recover-word-input-5')).toHaveValue('echo');
  await expect(page.getByTestId('recover-word-input-6')).toHaveValue('');
  // `wallet.recover.pastedWordCount`, which already existed in both locales.
  await expect(page.getByTestId('recover-invalid-phrase')).toContainText('5');
});

test('twenty-four words get denser, not taller, and the action does not move', async ({ page }) => {
  const actionBefore = await page.getByTestId('onboarding-slot-action').boundingBox();
  const bodyBefore = await page.getByTestId('onboarding-slot-body').boundingBox();

  await pasteInto(page, 1, placeholders(24).join(' '));

  await expect(page.getByTestId('recover-word-grid')).toHaveAttribute('data-columns', '4');
  await expect(page.getByTestId(/^recover-word-input-\d+$/)).toHaveCount(24);

  const grid = await page.getByTestId('recover-word-grid').boundingBox();
  const actionAfter = await page.getByTestId('onboarding-slot-action').boundingBox();
  const bodyAfter = await page.getByTestId('onboarding-slot-body').boundingBox();

  // The whole point: the band held, so nothing below it moved.
  expect(actionAfter).toEqual(actionBefore);
  expect(bodyAfter).toEqual(bodyBefore);
  expect(grid!.height).toBeLessThanOrEqual(bodyBefore!.height);
});

test('the index carries a salmon period that never reaches the value', async ({ page }) => {
  const index = page.getByTestId('recover-word-cell-1').getByLabel('1', { exact: true });
  await expect(index).toHaveText('1.');
  // Decoration: hidden from assistive tech, and not part of what gets typed.
  await expect(index.locator('[aria-hidden="true"]')).toHaveText('.');
  await expect(page.getByTestId('recover-word-input-1')).toHaveValue('');
});
