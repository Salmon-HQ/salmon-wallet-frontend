// Background service worker for Salmon Wallet extension
// Handles message passing between content scripts, popup, and dApps
//
// IMPORTANT: Do NOT import from '@salmon/shared' here.
// The barrel export pulls in React, axios, crypto libs, etc. which crash
// the MV3 service worker (no DOM). Keep this file dependency-free.

import { browser } from 'wxt/browser';

// storage.session is MV3-only; fall back to storage.local for Firefox MV2
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
  trustedApps: Record<string, Record<string, boolean>> | null;
}

type ResponseHandler = (data: unknown, id?: string) => void;

export default defineBackground(() => {
  // Maps to track response handlers and stashed values
  const responseHandlers = new Map<string, ResponseHandler>();
  const stashedValues = new Map<string, unknown>();
  // requestId -> approval popup window id, so the background can close the
  // window once the request is answered.
  const approvalWindows = new Map<string, number>();

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
    sendResponse: ResponseHandler
  ): Promise<void> => {
    const searchParams = new URLSearchParams();
    searchParams.set('origin', sender.origin || '');
    searchParams.set('request', JSON.stringify(message.data));
    if (message.data.params?.network) {
      searchParams.set('network', message.data.params.network);
    }

    const focusedWindow = await browser.windows.getLastFocused();
    const popup = await browser.windows.create({
      url: 'popup.html#' + searchParams.toString(),
      type: 'popup',
      width: 380,
      height: 675,
      top: focusedWindow.top,
      left: (focusedWindow.left || 0) + (focusedWindow.width || 380) - 380,
      focused: true,
    });

    const popupId = popup?.id;
    if (popupId == null) return;
    approvalWindows.set(message.data.id, popupId);

    const listener = (windowId: number): void => {
      if (windowId === popupId) {
        approvalWindows.delete(message.data.id);
        const responseHandler = responseHandlers.get(message.data.id);
        if (responseHandler) {
          responseHandlers.delete(message.data.id);
          responseHandler({
            error: 'Operation cancelled',
            id: message.data.id,
          });
        }

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
    sendResponse: ResponseHandler
  ): void => {
    // dApp approvals always open in a dedicated popup window: it is predictable
    // (one window) and auto-closes on response. The side panel is reserved for
    // the main wallet UI — Chrome's `sidePanel.open()` cannot be reliably
    // triggered from a message relayed by the content script (the user gesture
    // does not survive the hop), which previously raced this popup window and
    // sometimes left both the panel and the window open.
    launchPopupWindow(message, sender, sendResponse);
  };

  /**
   * Get connection data if the origin is trusted
   */
  const getConnection = async (
    origin: string,
    { connection, networkId, trustedApps }: StorageData
  ): Promise<ConnectionData | null> => {
    if (connection?.blockchain !== 'solana') {
      return null;
    }
    if (!networkId || !trustedApps?.[networkId]?.[origin]) {
      return null;
    }
    return connection;
  };

  /**
   * Handle connection requests from dApps
   */
  const handleConnect = async (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: ResponseHandler
  ): Promise<void> => {
    const result = await browser.storage.local.get([
      STORAGE_KEYS.CONNECTION,
      STORAGE_KEYS.NETWORK_ID,
      STORAGE_KEYS.TRUSTED_APPS,
    ]);
    const tabId = await getActiveTabId();

    const callback: ResponseHandler = async (data, id) => {
      await sendResponse(data, id);
      await addConnectedTabId(tabId);
    };

    const data: StorageData = {
      connection: JSON.parse((result[STORAGE_KEYS.CONNECTION] as string) || 'null'),
      networkId: JSON.parse((result[STORAGE_KEYS.NETWORK_ID] as string) || 'null'),
      trustedApps: JSON.parse((result[STORAGE_KEYS.TRUSTED_APPS] as string) || 'null'),
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
    } else {
      routeApproval(message, sender, callback);
    }
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

        if (msg.data.method === 'connect') {
          handleConnect(msg, sender, sendResponse);
        } else if (msg.data.method === 'disconnect') {
          handleDisconnect(msg, sender, sendResponse);
        } else if (APPROVAL_METHODS.has(msg.data.method)) {
          routeApproval(msg, sender, sendResponse);
        } else {
          // Fixed protocol string only — never echo the method back to the
          // page (same rule as the approval pages' error responses).
          sendResponse({ error: 'Unsupported method', id: msg.data.id });
          return;
        }
        // Keep response channel open for async response
        return true;
      } else if (message.channel === 'salmon_extension_background_channel') {
        const msg = message as Message;
        if (msg.data?.id == null) {
          return;
        }
        const responseHandler = responseHandlers.get(msg.data.id);
        responseHandlers.delete(msg.data.id);
        if (responseHandler) {
          responseHandler(msg.data, msg.data.id);
        }
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
