/**
 * The sheet that confirms a recovery phrase (DEV-208), mounted once per app.
 * It reads `usePhraseBackupSheet` itself; the only inputs are the device's
 * biometrics, which the DOM never has.
 */
export interface PhraseBackupSheetPropsBase {
  /** Whether the device can be asked for a biometric verdict. */
  biometricAvailable?: boolean;
  /** Prompts for biometrics and answers whether it was the owner. */
  verifyBiometric?: () => Promise<boolean>;
}
