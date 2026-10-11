/**
 * Seed Vault access for Android (spec 037).
 *
 * Declares the standard permission, which a third-party wallet requests at
 * runtime, and strips the privileged one from the merged manifest even if a
 * dependency declares it: that permission is granted only to wallets Seed
 * Vault's maker signs, and the dApp Store flags it.
 */
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const STANDARD = 'com.solanamobile.seedvault.ACCESS_SEED_VAULT';
const PRIVILEGED = 'com.solanamobile.seedvault.ACCESS_SEED_VAULT_PRIVILEGED';

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    AndroidConfig.Permissions.ensurePermission(mod.modResults, STANDARD);
    manifest['uses-permission'] = [
      ...(manifest['uses-permission'] ?? []).filter((p) => p.$['android:name'] !== PRIVILEGED),
      { $: { 'android:name': PRIVILEGED, 'tools:node': 'remove' } },
    ];
    return mod;
  });
