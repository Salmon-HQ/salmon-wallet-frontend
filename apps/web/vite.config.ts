import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bufferPath = path.dirname(require.resolve('buffer/package.json'));
const processPath = path.dirname(require.resolve('process/package.json'));
const { version: appVersion } = require('./package.json');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        'react-native-fast-crypto': path.resolve(__dirname, 'src/stubs/react-native-fast-crypto.ts'),
        'react-native': path.resolve(__dirname, 'src/stubs/react-native.ts'),
        '@': path.resolve(__dirname, 'src'),
        '@salmon/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@salmon/ui': path.resolve(__dirname, '../../packages/ui/src'),
        'buffer': bufferPath,
        'process': processPath,
      },
    },
    define: {
      'global': 'globalThis',
      '__APP_VERSION__': JSON.stringify(appVersion),
      'process': JSON.stringify({ env: {} }),
      'process.env': JSON.stringify({
        VITE_SALMON_ENV: env.VITE_SALMON_ENV ?? 'local',
        VITE_API_HOST: env.VITE_API_HOST ?? '',
        VITE_API_PORT: env.VITE_API_PORT ?? '',
        VITE_API_URL: env.VITE_API_URL ?? '',
        VITE_STATIC_API_URL: env.VITE_STATIC_API_URL ?? '',
        VITE_ANALYTICS_URL: env.VITE_ANALYTICS_URL ?? '',
        VITE_ENABLE_TESTNET: env.VITE_ENABLE_TESTNET ?? 'false',
        NODE_ENV: mode === 'production' ? 'production' : (process.env.NODE_ENV ?? 'development'),
      }),
    },
    optimizeDeps: {
      include: ['buffer', 'process'],
      esbuildOptions: {
        define: { global: 'globalThis' },
        inject: [path.resolve(__dirname, 'src/buffer-shim.js')],
      },
    },
    build: {
      chunkSizeWarningLimit: 6000,
    },
  };
});
