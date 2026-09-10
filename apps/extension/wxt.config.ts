import { defineConfig } from 'wxt';
import { loadEnv, type Plugin } from 'vite';
import { version as appVersion } from './package.json';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bufferPath = path.dirname(require.resolve('buffer/package.json'));
const processPath = path.dirname(require.resolve('process/package.json'));

const sharedSrc = path.resolve(__dirname, '../../packages/shared/src');
const uiSrc = path.resolve(__dirname, '../../packages/ui/src');

/**
 * The Powerups build flag (spec 027 §3). Off, every Powerups entry —
 * `@salmon/shared/powerups`, `@salmon/ui/powerups`, and the same files reached
 * by a relative import — resolves to its `.off` twin: an empty registry, no
 * pages, no locales. A bundler alias, not a runtime `if`, so the production
 * zip carries no swap code or copy.
 */
const POWERUPS_ENTRIES: Record<string, string> = {
  [path.join(sharedSrc, 'powerups/index.ts')]: path.join(sharedSrc, 'powerups/index.off.ts'),
  [path.join(uiSrc, 'powerups.ts')]: path.join(uiSrc, 'powerups.off.ts'),
};

function powerupsFlagPlugin(on: boolean): Plugin {
  return {
    name: 'salmon-powerups-flag',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (on) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const off = POWERUPS_ENTRIES[resolved.id];
      return off ? { id: off } : null;
    },
  };
}

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',

  vite: (wxtEnv) => {
    const env = loadEnv(wxtEnv.mode, __dirname, 'VITE_');
    const powerupsOn = (env.VITE_POWERUPS ?? 'on') === 'on';
    return {
      plugins: [powerupsFlagPlugin(powerupsOn)],
      define: {
        global: 'globalThis',
        __APP_VERSION__: JSON.stringify(appVersion),
        // Define process as a minimal object so typeof process !== 'undefined' guards pass
        // (process global doesn't exist in extension runtime — the npm polyfill is only
        // injected during dev pre-bundling, not in production Rollup/esbuild builds)
        process: JSON.stringify({ env: {} }),
        // Define process.env as a complete object so both static (process.env.X) and
        // dynamic (process.env[key]) access work at runtime.
        // esbuild/Rollup use the most specific match: process.env wins over process.
        'process.env': JSON.stringify({
          VITE_SALMON_ENV: env.VITE_SALMON_ENV ?? 'local',
          VITE_API_HOST: env.VITE_API_HOST ?? '',
          VITE_API_PORT: env.VITE_API_PORT ?? '',
          VITE_API_URL: env.VITE_API_URL ?? '',
          VITE_STATIC_API_URL: env.VITE_STATIC_API_URL ?? '',
          VITE_ANALYTICS_URL: env.VITE_ANALYTICS_URL ?? '',
          VITE_POWERUPS: powerupsOn ? 'on' : 'off',
          NODE_ENV: process.env.NODE_ENV ?? 'development',
        }),
      },
      resolve: {
        alias: {
          // The Powerups entries first: an alias list is matched in order and
          // the bare package aliases below would otherwise claim these paths.
          '@salmon/shared/powerups': path.join(sharedSrc, 'powerups/index.ts'),
          '@salmon/ui/powerups': path.join(uiSrc, 'powerups.ts'),
          '@salmon/shared': sharedSrc,
          '@salmon/ui': uiSrc,
          // Mock react-native modules for web extension build
          'react-native-fast-crypto': path.resolve(
            __dirname,
            'src/stubs/react-native-fast-crypto.ts'
          ),
          'react-native': path.resolve(__dirname, 'src/stubs/react-native.ts'),
          // Resolve Node.js built-ins to npm polyfills (prevents Vite from externalizing them)
          buffer: bufferPath,
          process: processPath,
        },
      },
      optimizeDeps: {
        entries: [
          path.resolve(__dirname, 'src/entrypoints/popup/index.html'),
          path.resolve(__dirname, 'src/entrypoints/sidepanel/index.html'),
        ],
        include: ['buffer', 'process'],
        esbuildOptions: {
          define: {
            global: 'globalThis',
          },
        },
      },
      build: {
        chunkSizeWarningLimit: 6000,
      },
    };
  },

  manifest: ({ browser }) => ({
    // Use i18n message placeholders for name and description
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    // Set default locale for i18n
    default_locale: 'en',
    // version is intentionally omitted: WXT derives it from package.json so the
    // manifest version stays a single source of truth (currently 0.10.0).
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    permissions: ['storage', 'alarms', 'clipboardRead'],
    host_permissions: [
      'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/*',
      'https://d1fh2pwo7kzely.cloudfront.net/*',
    ],
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html',
    },
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['<all_urls>'],
        // Prevents extension fingerprinting by generating a new ID per session
        // @see https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources
        use_dynamic_url: true,
      },
      {
        resources: ['images/*', 'fonts/*'],
        matches: ['<all_urls>'],
        use_dynamic_url: true,
      },
    ],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'wallet@salmonwallet.io',
          strict_min_version: '142.0',
          // No data collection is required. Anonymous usage analytics is
          // strictly opt-in (off by default), so it is declared as optional
          // technical/interaction data per Mozilla's data-collection policy.
          data_collection_permissions: {
            required: ['none'],
            optional: ['technicalAndInteraction'],
          },
        },
      },
    }),
  }),

  hooks: {
    // WXT synthesizes `action.default_popup` (or `browser_action.default_popup`
    // on Firefox) because the popup/ entrypoint exists — but popup.html is only
    // the dedicated dApp-approval window the background opens via
    // `windows.create('popup.html#...')`. The toolbar click must open the side
    // panel / sidebar, so the manifest must not declare a default popup; the
    // runtime `setPanelBehavior` / `setPopup('')` calls in background.ts remain
    // as a belt, but without this the first click before the service worker
    // wakes opens a 600px popup instead of the side panel.
    'build:manifestGenerated': (_wxt, manifest) => {
      delete manifest.action?.default_popup;
      delete manifest.browser_action?.default_popup;
    },
  },

  zip: {
    exclude: ['**/__MACOSX/**', '**/.*'],
  },

  modules: ['@wxt-dev/module-react'],
});
