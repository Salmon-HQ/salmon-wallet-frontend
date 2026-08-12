import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { DAppApprovalGate } from './components/DAppApprovalGate';
import { AuthFlowProvider } from './pages/auth/AuthFlowContext';
import { RootRedirect } from './components/RootRedirect';

// ---------------------------------------------------------------------------
// Auth pages (wrapped in AuthFlowProvider for shared mnemonic state)
// ---------------------------------------------------------------------------
function AuthLayout() {
  return (
    <AuthFlowProvider>
      <Outlet />
    </AuthFlowProvider>
  );
}

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------
export const router = createBrowserRouter([
  {
    // Root layout — provides HydrateFallback for all lazy routes (React Router v7 requirement)
    HydrateFallback: () => null,
    children: [
      // Root redirect — decides based on wallet state
      {
        path: '/',
        element: <RootRedirect />,
      },

      // Auth flow — no guard (unauthenticated users)
      {
        path: '/auth',
        element: <AuthLayout />,
        children: [
          {
            path: 'select',
            lazy: () =>
              import('./pages/auth/SelectPage').then((m) => ({ Component: m.SelectPage })),
          },
          {
            path: 'create',
            lazy: () =>
              import('./pages/auth/CreatePage').then((m) => ({ Component: m.CreatePage })),
          },
          {
            path: 'recover',
            lazy: () =>
              import('./pages/auth/RecoverPage').then((m) => ({ Component: m.RecoverPage })),
          },
          {
            path: 'password',
            lazy: () =>
              import('./pages/auth/PasswordPage').then((m) => ({ Component: m.PasswordPage })),
          },
          {
            path: 'analytics-consent',
            lazy: () =>
              import('./pages/auth/AnalyticsConsentPage').then((m) => ({
                Component: m.AnalyticsConsentPage,
              })),
          },
          {
            path: 'success',
            lazy: () =>
              import('./pages/auth/SuccessPage').then((m) => ({ Component: m.SuccessPage })),
          },
          {
            path: 'derived',
            lazy: () =>
              import('./pages/auth/DerivedAccountsPage').then((m) => ({
                Component: m.DerivedAccountsPage,
              })),
          },
        ],
      },

      // Lock screen
      {
        path: '/lock',
        lazy: () => import('./pages/lock/LockPage').then((m) => ({ Component: m.LockPage })),
      },

      // dApp approval popups — opened as standalone popups. No AuthGuard (they
      // must be reachable without the main app shell), but wrapped in
      // DAppApprovalGate: a fresh popup window starts locked (in-memory stash is
      // per-window), so the gate prompts for unlock in place before rendering
      // the approval route.
      {
        element: <DAppApprovalGate />,
        children: [
          {
            path: '/dapp/connect',
            lazy: () =>
              import('./pages/dapp/ConnectApprovalPage').then((m) => ({
                Component: m.ConnectApprovalPage,
              })),
          },
          {
            path: '/dapp/sign-message',
            lazy: () =>
              import('./pages/dapp/SignMessageApprovalPage').then((m) => ({
                Component: m.SignMessageApprovalPage,
              })),
          },
          {
            path: '/dapp/sign-in',
            lazy: () =>
              import('./pages/dapp/SignInApprovalPage').then((m) => ({
                Component: m.SignInApprovalPage,
              })),
          },
          {
            path: '/dapp/sign-transaction',
            lazy: () =>
              import('./pages/dapp/SignTransactionApprovalPage').then((m) => ({
                Component: m.SignTransactionApprovalPage,
              })),
          },
        ],
      },

      // Protected routes — require unlocked wallet
      {
        element: <AuthGuard />,
        children: [
          // Home (tabs: home / collectibles / swap)
          {
            path: '/home',
            lazy: () => import('./pages/home/HomePage').then((m) => ({ Component: m.HomePage })),
          },

          // Token detail
          {
            path: '/token/:id',
            lazy: () =>
              import('./pages/home/TokenDetailRoute').then((m) => ({
                Component: m.TokenDetailRoute,
              })),
          },

          // NFT routes
          {
            path: '/nft/:mint',
            lazy: () =>
              import('./pages/home/NftDetailRoute').then((m) => ({ Component: m.NftDetailRoute })),
          },
          {
            path: '/nft/all',
            lazy: () =>
              import('./pages/home/NftSeeAllRoute').then((m) => ({ Component: m.NftSeeAllRoute })),
          },

          // Activity
          {
            path: '/activity',
            lazy: () =>
              import('./pages/home/ActivityRoute').then((m) => ({ Component: m.ActivityRoute })),
          },

          // Send
          {
            path: '/send',
            lazy: () => import('./pages/home/SendRoute').then((m) => ({ Component: m.SendRoute })),
          },

          // Settings (redirects to /home and opens SettingsPanelStack drawer)
          {
            path: '/settings',
            lazy: () =>
              import('./pages/settings/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
          },
          { path: '/settings/*', element: <Navigate to="/settings" replace /> },
        ],
      },
    ],
  },
]);
