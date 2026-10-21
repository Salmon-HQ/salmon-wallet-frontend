// Background service worker for Salmon Wallet extension
// Handles message passing between content scripts, popup, and dApps
//
// IMPORTANT: Do NOT import from '@salmon/shared' here.
// The barrel export pulls in React, axios, crypto libs, etc. which crash
// the MV3 service worker (no DOM). Keep this file dependency-free.

import { browser } from 'wxt/browser';

import { USER_REJECTED_ERROR } from '../utils/types';

// Chrome MV3 and Firefox 115+ (MV2 included) have storage.session; the
// storage.local fallback only serves older browsers the manifest excludes.
const sessionArea = browser.storage.session ?? browser.storage.local;

const STORAGE_KEYS = {
  CONNECTION: 'salmon_connection',
  NETWORK_ID: 'salmon_active_network_id',
  TRUSTED_APPS: 'salmon_trusted_apps',
} as const;

const STASH_KEYS = {
  PASSWORD: 'password',
  DERIVED_KEY: 'derived_key_cache',
  LAST_ACTIVITY: 'salmon_last_activity',
} as const;

const SESSION_KEY_STORAGE_KEY = 'salmon_session_key';

// Type definitions
interface MessageData {
  id: string;
  method: string;
  /** Set on an approval page's answer that refuses the request. */
  error?: unknown;
  params?: {
    network?: string;
    [key: string]: unknown;
  };
}

interface Message {
  channel: string;
  data: MessageData;
}

interface StashMessage {
  channel: string;
  data: {
    method: 'get' | 'set' | 'delete' | 'clear';
    key?: string;
    value?: unknown;
  };
}

interface ConnectionData {
  blockchain: string;
  address: string;
}

interface StorageData {
  connection: ConnectionData | null;
  networkId: string | null;
  /** Per network, per origin: the grant, with the address it was approved for. */
  trustedApps: Record<string, Record<string, { address?: string }>> | null;
}

type ResponseHandler = (data: unknown, id?: string) => void;

/**
 * How long a site, and the tab it asked from, are refused after the user
 * rejects or closes its approval window. Without it a page asks again the
 * moment the window closes and keeps the single approval slot for as long as
 * its tab stays open, so no other site can be served.
 *
 * Best effort: a page that opens another tab on another subdomain is a new
 * origin and a new tab, and a service-worker restart forgets every entry.
 */
export const DECLINE_COOLDOWN_MS = 30_000;

export default defineBackground(() => {
  // storage.local holds the encrypted vault and the trusted-apps list, and
  // Chrome lets content scripts read and write it by default. A compromised
  // renderer could then copy the vault or mark its own origin trusted and
  // connect without approval. No content script here uses storage, so only
  // the extension's own pages keep access. Firefox has no access levels.
  const localArea = browser.storage.local as typeof browser.storage.local & {
    setAccessLevel?: (options: { accessLevel: 'TRUSTED_CONTEXTS' }) => Promise<void>;
  };
  void Promise.resolve()
    .then(() => localArea.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' }))
    .catch(() => undefined);

  // Maps to track response handlers and stashed values
  const responseHandlers = new Map<string, ResponseHandler>();
  const stashedValues = new Map<string, unknown>();
  // requestId -> approval popup window id, so the background can close the
  // window once the request is answered.
  const approvalWindows = new Map<string, number>();
  /**
   * The origin whose approval window is open, and that window's id (`null`
   * while it is still being created). At most one entry: see launchPopupWindow.
   */
  const approvalWindowOrigins = new Map<string, number | null>();
  /** An origin, or `tab:<id>` -> the time until which its requests are refused. */
  const declinedUntil = new Map<string, number>();
  /** requestId -> the origin and tab it came from, while its window is open. */
  const requestSources = new Map<string, { origin: string; tabId?: number }>();

  /** Whether `key` is cooling down; an expired entry is dropped on the way. */
  const isCoolingDown = (key: string): boolean => {
    const until = declinedUntil.get(key);
    if (until === undefined) return false;
    if (until > Date.now()) return true;
    declinedUntil.delete(key);
    return false;
  };

  /** Starts the cool-down of the origin and tab a request came from. */
  const startCoolDown = (requestId: string): void => {
    const source = requestSources.get(requestId);
    if (!source) return;
    const until = Date.now() + DECLINE_COOLDOWN_MS;
    declinedUntil.set(source.origin, until);
    if (source.tabId !== undefined) declinedUntil.set(`tab:${source.tabId}`, until);
  };

  // Accept the side panel's persistent port. No messages flow over it now; the
  // open connection just keeps the service worker alive while the side panel is
  // open (MV3 keep-alive).
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'salmon_sidepanel') {
      port.onDisconnect.addListener(() => {
        /* no-op */
      });
    }
  });

  /**
   * Get the active tab ID from the current window
   */
  const getActiveTabId = async (): Promise<number | undefined> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs?.[0]?.id;
  };

  /**
   * Get the list of connected tab IDs from storage
   */
  const getConnectedTabsIds = async (): Promise<number[]> => {
    const result = await browser.storage.local.get('connectedTabsIds');
    return JSON.parse((result.connectedTabsIds as string) || 'null') || [];
  };

  /**
   * Add a tab ID to the connected tabs list
   */
  const addConnectedTabId = async (tabId: number | undefined): Promise<void> => {
    if (tabId) {
      const tabsIds = await getConnectedTabsIds();
      if (!tabsIds.includes(tabId)) {
        await browser.storage.local.set({
          connectedTabsIds: JSON.stringify([...tabsIds, tabId]),
        });
      }
    }
  };

  /**
   * Remove a tab ID from the connected tabs list
   */
  const removeConnectedTabId = async (tabId: number): Promise<void> => {
    const tabsIds = await getConnectedTabsIds();
    if (tabsIds.includes(tabId)) {
      await browser.storage.local.set({
        connectedTabsIds: JSON.stringify(tabsIds.filter((id) => id !== tabId)),
      });
    }
  };

  /**
   * Clean up connected tabs list by removing closed tabs
   */
  const cleanConnectedTabs = async (): Promise<void> => {
    const allTabs = await browser.tabs.query({});
    const allTabsIds = allTabs.map((tab) => tab?.id).filter((id): id is number => id !== undefined);
    const connectedTabsIds = await getConnectedTabsIds();

    const tabsIds = connectedTabsIds.filter((tabId) => allTabsIds.includes(tabId));
    await browser.storage.local.set({
      connectedTabsIds: JSON.stringify(tabsIds),
    });
  };

  /**
   * Launch a dedicated popup window for a dApp approval request.
   */
  const launchPopupWindow = async (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler,
    boundAddress?: string
  ): Promise<void> => {
    const origin = sender.origin || '';
    const tabId = sender.tab?.id;

    if (isCoolingDown(origin) || (tabId !== undefined && isCoolingDown(`tab:${tabId}`))) {
      sendResponse({ error: 'Declined moments ago, try again later', id: message.data.id });
      return;
    }

    // One approval window at a time, across all origins. Without this a page
    // can call a method in a loop, or navigate itself through subdomains, and
    // each call opens another focused OS-level window the user cannot get out
    // from under. Any other request is refused with no window action: bringing
    // the open window forward on each refusal let a page pull it to the front
    // at will.
    if (approvalWindowOrigins.size > 0) {
      sendResponse({ error: 'Another approval is already open', id: message.data.id });
      return;
    }
    // Claim the origin before the first await: requests fired in one loop
    // all reach this point before any window exists, so a claim taken after
    // `windows.create` resolves lets every one of them through.
    approvalWindowOrigins.set(origin, null);

    const searchParams = new URLSearchParams();
    searchParams.set('origin', origin);
    searchParams.set('request', JSON.stringify(message.data));
    if (message.data.params?.network) {
      searchParams.set('network', message.data.params.network);
    }
    // The account the site's grant was checked against. The window signs with
    // whatever account is active when it loads, and refuses if that differs.
    if (boundAddress) {
      searchParams.set('address', boundAddress);
    }

    const windowOptions = {
      url: 'popup.html#' + searchParams.toString(),
      type: 'popup' as const,
      width: 380,
      height: 675,
      focused: true,
    };
    let popupId: number | undefined;
    try {
      // Beside the right edge of the focused window. Chrome refuses bounds
      // less than half on a visible screen — a window straddling two monitors
      // or dragged off an edge — so that case falls back to Chrome's own
      // placement instead of refusing the request.
      const focusedWindow = await browser.windows.getLastFocused();
      const popup = await browser.windows
        .create({
          ...windowOptions,
          top: focusedWindow.top,
          left: (focusedWindow.left || 0) + (focusedWindow.width || 380) - 380,
        })
        .catch(() => browser.windows.create(windowOptions));
      popupId = popup?.id;
    } catch {
      // Falls through: popupId stays undefined and the request is refused below.
    }
    if (popupId == null) {
      approvalWindowOrigins.delete(origin);
      sendResponse({ error: 'Operation cancelled', id: message.data.id });
      return;
    }
    approvalWindows.set(message.data.id, popupId);
    approvalWindowOrigins.set(origin, popupId);
    requestSources.set(message.data.id, { origin, tabId });

    const listener = (windowId: number): void => {
      if (windowId === popupId) {
        approvalWindows.delete(message.data.id);
        if (approvalWindowOrigins.get(origin) === popupId) {
          approvalWindowOrigins.delete(origin);
        }
        const responseHandler = responseHandlers.get(message.data.id);
        if (responseHandler) {
          // Closed without an answer: the user turned the site down.
          startCoolDown(message.data.id);
          responseHandlers.delete(message.data.id);
          responseHandler({
            error: 'Operation cancelled',
            id: message.data.id,
          });
        }
        requestSources.delete(message.data.id);

        browser.windows.onRemoved.removeListener(listener);
      }
    };

    browser.windows.onRemoved.addListener(listener);

    responseHandlers.set(message.data.id, sendResponse);
  };

  /**
   * Route an approval request to the side panel (via storage) or fall back to a popup window.
   * If the side panel is open (port connected), writes to storage only — no popup.
   * If the side panel is closed, falls back to the popup window.
   */
  const routeApproval = (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler,
    boundAddress?: string
  ): void => {
    // dApp approvals always open in a dedicated popup window: it is predictable
    // (one window) and auto-closes on response. The side panel is reserved for
    // the main wallet UI — Chrome's `sidePanel.open()` cannot be reliably
    // triggered from a message relayed by the content script (the user gesture
    // does not survive the hop), which previously raced this popup window and
    // sometimes left both the panel and the window open.
    launchPopupWindow(message, sender, sendResponse, boundAddress);
  };

  /**
   * Get connection data if the origin is trusted
   */
  const getConnection = async (
    origin: string,
    { connection, networkId, trustedApps }: StorageData
  ): Promise<ConnectionData | null> => {
    // The wallet writes this field upper-cased. Comparing it against the
    // lower-case spelling made the whole trusted-apps gate inert: no origin
    // ever matched, so every connect opened an approval window and no signing
    // request could be told apart from one the user had never approved.
    if (connection?.blockchain?.toLowerCase() !== 'solana') {
      return null;
    }
    // A grant covers the address the user saw on the connect screen. After an
    // account switch the site is not connected until it asks again; a grant
    // written before addresses were recorded asks again once.
    const grant = networkId ? trustedApps?.[networkId]?.[origin] : undefined;
    if (!grant?.address || grant.address !== connection.address) {
      return null;
    }
    return connection;
  };

  /**
   * Did the user approve this origin for the account that is active now?
   *
   * Any network counts, unlike `getConnection`, which answers for the network
   * in use: switching networks after connecting does not un-approve the site.
   * Switching accounts does. A signature comes from the active account, so a
   * grant for another one would show the site an account it was never given.
   */
  const isApprovedForActiveAccount = (
    origin: string,
    { connection, trustedApps }: StorageData
  ): boolean =>
    !!origin &&
    connection?.blockchain?.toLowerCase() === 'solana' &&
    !!connection.address &&
    Object.values(trustedApps ?? {}).some(
      (perNetwork) => perNetwork?.[origin]?.address === connection.address
    );

  /** A concrete web origin — not "null", not an extension page, not empty. */
  const isWebOrigin = (origin: string | undefined): origin is string =>
    typeof origin === 'string' && /^https?:\/\/[^/]+$/.test(origin);

  /** The three storage values every trust decision reads. */
  const readStorageData = async (): Promise<StorageData> => {
    const result = await browser.storage.local.get([
      STORAGE_KEYS.CONNECTION,
      STORAGE_KEYS.NETWORK_ID,
      STORAGE_KEYS.TRUSTED_APPS,
    ]);
    return {
      connection: JSON.parse((result[STORAGE_KEYS.CONNECTION] as string) || 'null'),
      networkId: JSON.parse((result[STORAGE_KEYS.NETWORK_ID] as string) || 'null'),
      trustedApps: JSON.parse((result[STORAGE_KEYS.TRUSTED_APPS] as string) || 'null'),
    };
  };

  /**
   * Handle connection requests from dApps
   */
  const handleConnect = async (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler
  ): Promise<void> => {
    const data = await readStorageData();
    const tabId = await getActiveTabId();

    const callback: ResponseHandler = async (data, id) => {
      await sendResponse(data, id);
      await addConnectedTabId(tabId);
    };

    const connection = await getConnection(sender.origin || '', data);
    if (connection) {
      await callback({
        method: 'connected',
        params: {
          publicKey: connection.address,
        },
        id: message.data.id,
      });
      return;
    }

    // `onlyIfTrusted` is how a page asks "am I still connected?" on load. It is
    // defined to fail silently, so answering it with a window turns every page
    // the user visits into one that can open wallet UI without being asked.
    const options = message.data.params?.options as { onlyIfTrusted?: boolean } | undefined;
    if (options?.onlyIfTrusted) {
      await sendResponse({ error: 'Not connected', id: message.data.id });
      return;
    }

    routeApproval(message, sender, callback);
  };

  /**
   * Handle disconnect requests from dApps
   */
  const handleDisconnect = async (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler
  ): Promise<void> => {
    await sendResponse({ method: 'disconnected', id: message.data.id });

    const tabId = await getActiveTabId();
    if (tabId !== undefined) {
      await removeConnectedTabId(tabId);
    }
  };

  /**
   * Handle stash operations (password storage, session management)
   */
  const handleStashOperation = (
    message: StashMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean | void => {
    if (message.data.method === 'get') {
      sendResponse(stashedValues.get(message.data.key || ''));
    } else if (message.data.method === 'set') {
      if (message.data.key) {
        stashedValues.set(message.data.key, message.data.value);
        if (
          message.data.key === STASH_KEYS.DERIVED_KEY ||
          message.data.key === STASH_KEYS.LAST_ACTIVITY
        ) {
          browser.alarms.create('salmon_lock_alarm', { delayInMinutes: 5 });
        }
      }
      sendResponse(undefined);
    } else if (message.data.method === 'delete') {
      if (message.data.key) {
        stashedValues.delete(message.data.key);
      }
      sendResponse(undefined);
    } else if (message.data.method === 'clear') {
      stashedValues.clear();
      sendResponse(undefined);
    }
    return true;
  };

  // Every dApp method that may open an approval UI. Anything else on the
  // contentscript channel is answered with a protocol error instead of
  // reaching routeApproval — rejection of unknown methods must not depend
  // on the approval page.
  const APPROVAL_METHODS = new Set([
    'sign',
    'signOffchain',
    'signIn',
    'signTransaction',
    'signAllTransactions',
    'signAndSendTransaction',
  ]);

  /**
   * `signIn` is the one approval method an origin may ask for before it is
   * approved: connecting is part of what it does. Every other one signs with
   * the active account, so it belongs to a site the user has already let in.
   */
  const CONNECTIONLESS_METHODS = new Set(['signIn']);

  /**
   * A signing request from an origin the user never approved, whose approval
   * they revoked, or that was approved for another account than the active
   * one is refused before any window opens. As with connect after an account
   * switch, the site has to connect again.
   */
  const handleApprovalMethod = async (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler
  ): Promise<void> => {
    if (CONNECTIONLESS_METHODS.has(message.data.method)) {
      routeApproval(message, sender, sendResponse);
      return;
    }
    const data = await readStorageData();
    if (!isApprovedForActiveAccount(sender.origin || '', data)) {
      await sendResponse({ error: 'Not connected', id: message.data.id });
      return;
    }
    routeApproval(message, sender, sendResponse, data.connection?.address);
  };

  // Main message listener
  browser.runtime.onMessage.addListener(
    (
      message: Message | StashMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean | void => {
      // Only handle messages from our own extension
      if (sender.id !== browser.runtime.id) {
        return;
      }
      // A malformed message must never throw inside the listener: an
      // exception here kills the response channel and the dApp hangs.
      if (message == null || typeof message.channel !== 'string') {
        return;
      }

      if (message.channel === 'salmon_contentscript_background_channel') {
        const msg = message as Message;
        if (typeof msg.data?.method !== 'string' || msg.data.id == null) {
          return;
        }
        // A sandboxed page has an opaque origin, which arrives as the string
        // "null". Used as a trust-store key it is an ordinary string, so every
        // sandboxed page in every tab shared one entry: approve one iframe and
        // the next unrelated one is connected. An origin that is not a concrete
        // web origin cannot be told apart from another, so it is not answered.
        if (!isWebOrigin(sender.origin)) {
          return;
        }

        if (msg.data.method === 'connect') {
          handleConnect(msg, sender, sendResponse);
        } else if (msg.data.method === 'disconnect') {
          handleDisconnect(msg, sender, sendResponse);
        } else if (APPROVAL_METHODS.has(msg.data.method)) {
          handleApprovalMethod(msg, sender, sendResponse);
        } else {
          // Fixed protocol string only — never echo the method back to the
          // page (same rule as the approval pages' error responses).
          sendResponse({ error: 'Unsupported method', id: msg.data.id });
          return;
        }
        // Keep response channel open for async response
        return true;
      }

      // The approval answers and the stash (which holds the vault key while
      // unlocked) belong to the extension's own pages. Content scripts share
      // the extension id, so the id alone would let a content-script context
      // read the key or answer an approval; a page's URL is what tells them apart.
      if (!sender.url?.startsWith(browser.runtime.getURL('/'))) {
        return;
      }

      if (message.channel === 'salmon_extension_background_channel') {
        const msg = message as Message;
        if (msg.data?.id == null) {
          return;
        }
        const responseHandler = responseHandlers.get(msg.data.id);
        responseHandlers.delete(msg.data.id);
        if (responseHandler) {
          responseHandler(msg.data, msg.data.id);
          // Only the user's own rejection cools the site down: a failed
          // signature or a request the screen could not take is not that.
          if (msg.data.error === USER_REJECTED_ERROR) startCoolDown(msg.data.id);
        }
        requestSources.delete(msg.data.id);
        // Request answered — close its approval popup window. The onRemoved
        // listener is now a no-op (the response handler is already deleted), so
        // closing here does not emit a spurious cancellation.
        const approvalWindowId = approvalWindows.get(msg.data.id);
        if (approvalWindowId != null) {
          approvalWindows.delete(msg.data.id);
          browser.windows.remove(approvalWindowId).catch(() => {
            /* already closed */
          });
        }
      } else if (message.channel === 'salmon_extension_stash_channel') {
        return handleStashOperation(message as StashMessage, sender, sendResponse);
      }
    }
  );

  // Alarm listener for session timeout (auto-lock after 5 minutes of inactivity)
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'salmon_lock_alarm') {
      stashedValues.delete(STASH_KEYS.DERIVED_KEY);
      sessionArea.remove(SESSION_KEY_STORAGE_KEY).catch(() => {
        /* ignore */
      });
    }
  });

  // Tab removal listener to clean up connected tabs
  browser.tabs.onRemoved.addListener((tabId) => {
    removeConnectedTabId(tabId);
  });

  // Open side panel / sidebar when clicking the extension icon
  if (import.meta.env.CHROME) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else if (import.meta.env.FIREFOX) {
    // Clear default popup so browserAction.onClicked fires, then toggle sidebar
    browser.browserAction.setPopup({ popup: '' });
    browser.browserAction.onClicked.addListener(() => {
      // sidebarAction is a Firefox-only API, not present in WXT's Chrome-based types
      const fx = browser as typeof browser & { sidebarAction: { toggle(): void } };
      fx.sidebarAction.toggle();
    });
  }

  // Clean up connected tabs on startup
  cleanConnectedTabs();
});
