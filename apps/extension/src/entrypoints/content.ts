/**
 * Content script for Salmon Wallet
 *
 * This script runs in the context of web pages and acts as a bridge between:
 * 1. The injected provider script (runs in page context)
 * 2. The background service worker (extension context)
 *
 * It injects the provider script into pages and relays messages between
 * the page and the extension background.
 */

export default defineContentScript({
  matches: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  runAt: 'document_start',
  allFrames: false,

  main() {
    // Inject the provider script into the page context
    injectScript();

    // Set up message relay between page and background
    setupMessageRelay();
  },
});

/**
 * Injects the provider script into the page context.
 * The script is injected synchronously at document_start to ensure
 * the wallet provider is available before any page scripts run.
 */
function injectScript(): void {
  const scriptTag = document.createElement('script');
  scriptTag.setAttribute('async', 'false');
  scriptTag.setAttribute('type', 'module');
  scriptTag.src = browser.runtime.getURL('/injected.js');

  const container = document.head || document.documentElement;
  container.insertBefore(scriptTag, container.children[0]);
  container.removeChild(scriptTag);
}

/**
 * Sets up the message relay between the injected script and the background.
 * Listens for events from the page and forwards them to the background,
 * then dispatches the response back to the page.
 */
function setupMessageRelay(): void {
  window.addEventListener('salmon_injected_script_message', async (event) => {
    const customEvent = event as CustomEvent<unknown>;
    const response = await browser.runtime.sendMessage({
      channel: 'salmon_contentscript_background_channel',
      data: customEvent.detail,
    });

    // Response can be null if the window is killed or extension is unloaded
    if (!response) {
      return;
    }

    window.dispatchEvent(new CustomEvent('salmon_contentscript_message', { detail: response }));
  });
}
