/**
 * Development builds open quietly: no dev-menu sheet at launch and no floating
 * tools button.
 *
 * The floating button renders on top of the wallet's settings gear, and the
 * launch sheet covers the first screen, so both stood in the way of every
 * end-to-end run — and a reset app (Maestro `clearState`) brings them back,
 * because they are stored as preferences. expo-dev-menu reads its defaults
 * from these three keys instead (Android manifest meta-data, iOS Info.plist),
 * which a reset does not touch. The menu is still one gesture away: shake,
 * or Ctrl/Cmd + M on an emulator or simulator.
 *
 * Release builds carry no dev menu; the keys are inert there.
 */
const { AndroidConfig, withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

const DEFAULTS = {
  EXDevMenuShowFloatingActionButton: false,
  EXDevMenuShowsAtLaunch: false,
  EXDevMenuIsOnboardingFinished: true,
};

const withQuietDevMenu = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    for (const [name, value] of Object.entries(DEFAULTS)) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, name, String(value));
    }
    return mod;
  });
  return withInfoPlist(config, (mod) => {
    Object.assign(mod.modResults, DEFAULTS);
    return mod;
  });
};

module.exports = withQuietDevMenu;
