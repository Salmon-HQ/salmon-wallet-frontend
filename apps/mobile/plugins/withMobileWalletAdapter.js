/**
 * Android answers `solana-wallet:` intents, so dApps can pick Salmon through
 * Mobile Wallet Adapter (spec 036).
 *
 * The walletlib bridge reads the association URI from the current activity's
 * intent, so requests get their own activity instead of going through
 * MainActivity: expo-router's stack stays untouched and the approval renders
 * over the dApp. Filters and launch mode follow the official React Native
 * example wallet; the theme is translucent so the RN sheet draws its own scrim.
 */
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  withDangerousMod,
} = require('expo/config-plugins');

const ACTIVITY = 'MwaActivity';
const COMPONENT = 'MobileWalletAdapterEntrypoint';
const THEME = 'Theme.App.Mwa';

const intentFilter = (order, categories, action) => ({
  $: { 'android:order': String(order) },
  ...(action ? { action: [{ $: { 'android:name': action } }] } : {}),
  category: categories.map((name) => ({ $: { 'android:name': name } })),
  data: [{ $: { 'android:scheme': 'solana-wallet' } }],
});

const withMwaManifest = (config) =>
  withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.activity = (app.activity ?? []).filter((a) => a.$['android:name'] !== `.${ACTIVITY}`);
    app.activity.push({
      $: {
        'android:name': `.${ACTIVITY}`,
        'android:exported': 'true',
        'android:launchMode': 'singleTask',
        'android:theme': `@style/${THEME}`,
        'android:screenOrientation': 'portrait',
        'android:windowSoftInputMode': 'adjustResize',
        'android:configChanges':
          'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize',
      },
      'intent-filter': [
        intentFilter(
          1,
          ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE'],
          'android.intent.action.VIEW'
        ),
        intentFilter(0, ['android.intent.category.DEFAULT']),
      ],
    });
    return mod;
  });

const withMwaTheme = (config) =>
  withAndroidStyles(config, (mod) => {
    const styles = mod.modResults.resources;
    styles.style = (styles.style ?? []).filter((s) => s.$.name !== THEME);
    styles.style.push({
      $: { name: THEME, parent: 'AppTheme' },
      item: [
        { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
        { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
      ],
    });
    return mod;
  });

const activitySource = (pkg) => `package ${pkg}

import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class ${ACTIVITY} : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "${COMPONENT}"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }
}
`;

const withMwaActivitySource = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const pkg = config.android?.package;
      if (!pkg) throw new Error('withMobileWalletAdapter: android.package is required');
      const dir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/java',
        ...pkg.split('.')
      );
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, `${ACTIVITY}.kt`), activitySource(pkg));
      return mod;
    },
  ]);

module.exports = (config) => withMwaActivitySource(withMwaTheme(withMwaManifest(config)));
