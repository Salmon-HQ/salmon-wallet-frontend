const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Helper to find a package in node_modules (supports both pnpm hoisted and non-hoisted)
function findPackage(packageName, subPath = '') {
  // Try hoisted (flat) structure first (node-linker=hoisted)
  const hoistedPath = path.join(monorepoRoot, 'node_modules', packageName, subPath);
  if (fs.existsSync(hoistedPath)) {
    return hoistedPath;
  }
  // Try pnpm's .pnpm structure (non-hoisted / default pnpm)
  const pnpmDir = path.join(monorepoRoot, 'node_modules/.pnpm');
  const pnpmDirName = packageName.replace('/', '+');
  try {
    const dirs = fs.readdirSync(pnpmDir);
    const pkgDir = dirs.find((d) => d.startsWith(`${pnpmDirName}@`));
    if (pkgDir) {
      return path.join(pnpmDir, pkgDir, 'node_modules', packageName, subPath);
    }
  } catch {
    // pnpm directory doesn't exist or other error
  }
  return null;
}

// Polyfills for crypto libraries (Solana, Bitcoin)
// Note: Monorepo support is automatic since Expo SDK 52
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('expo-crypto'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
};

// Disable package exports to fix "@noble/hashes/crypto.js" not listed in exports warning
// Some packages (like @noble/hashes used by Solana/Bitcoin crypto libraries) have subpaths
// that are not properly exposed in their package.json exports field
config.resolver.unstable_enablePackageExports = false;

// Support for .cjs files (some packages need this)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Custom resolver for problematic packages with conditional exports
// This handles packages that don't have React Native-compatible export conditions
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix for rpc-websockets: package only has "browser" and "node" export conditions,
  // but React Native needs explicit resolution. Use the browser build for mobile.
  // See: https://github.com/solana-labs/solana-web3.js/issues/1981
  if (moduleName === 'rpc-websockets') {
    // Find rpc-websockets in pnpm's node_modules structure (version-agnostic)
    const rpcWebsocketsBrowserPath = findPackage(
      'rpc-websockets',
      'dist/index.browser.cjs'
    );
    if (rpcWebsocketsBrowserPath && fs.existsSync(rpcWebsocketsBrowserPath)) {
      return {
        filePath: rpcWebsocketsBrowserPath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fix for @solana/kit/program-client-core: the subpath exists only in the
  // package's "exports" map, never on disk, so it is unresolvable while
  // unstable_enablePackageExports is disabled above. Every @solana-program/*
  // client (memo, system, token-2022, address-lookup-table, record) imports it.
  // Resolve to the build the package itself designates for the "react-native"
  // export condition.
  if (moduleName === '@solana/kit/program-client-core') {
    const kitProgramClientCorePath = findPackage(
      '@solana/kit',
      'dist/program-client-core.native.mjs'
    );
    if (kitProgramClientCorePath && fs.existsSync(kitProgramClientCorePath)) {
      return {
        filePath: kitProgramClientCorePath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fix for @bonfida/spl-name-service: package.json specifies main as "dist/cjs/index.cjs"
  // but the actual file is "dist/cjs/index.js". This is a bug in the package.
  // Use the CJS build which exists at the correct path.
  if (moduleName === '@bonfida/spl-name-service') {
    // Find @bonfida/spl-name-service in pnpm's node_modules structure (version-agnostic)
    const bonfidaPath = findPackage(
      '@bonfida/spl-name-service',
      'dist/cjs/index.js'
    );
    if (bonfidaPath && fs.existsSync(bonfidaPath)) {
      return {
        filePath: bonfidaPath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fix for axios: Metro resolves to the Node.js build (dist/node/axios.cjs) which imports
  // Node standard library modules like "url". Force resolution to the browser build.
  // The package has a "react-native" export condition but Metro doesn't honor it when
  // unstable_enablePackageExports is disabled.
  if (moduleName === 'axios') {
    const axiosBrowserPath = findPackage('axios', 'dist/browser/axios.cjs');
    if (axiosBrowserPath && fs.existsSync(axiosBrowserPath)) {
      return {
        filePath: axiosBrowserPath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fix for create-hmac: This is a transitive dependency of ed25519-hd-key.
  // The package has a "browser" field pointing to browser.js, but Metro resolves to index.js
  // which requires Node's native crypto module. Force resolution to the browser build
  // which uses browserify-compatible crypto polyfills.
  // See: https://github.com/crypto-browserify/createHmac
  if (moduleName === 'create-hmac') {
    const createHmacBrowserPath = findPackage('create-hmac', 'browser.js');
    if (createHmacBrowserPath && fs.existsSync(createHmacBrowserPath)) {
      return {
        filePath: createHmacBrowserPath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fix for create-hash: Same issue as create-hmac - transitive dependency that needs
  // the browser build for React Native compatibility.
  if (moduleName === 'create-hash') {
    const createHashBrowserPath = findPackage('create-hash', 'browser.js');
    if (createHashBrowserPath && fs.existsSync(createHashBrowserPath)) {
      return {
        filePath: createHashBrowserPath,
        type: 'sourceFile',
      };
    }
    // Fall through to default resolution if not found
  }

  // Fall back to the default resolver for all other modules
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
