// Web fallback: stubs for expo-local-authentication
// Biometric auth is not available on web, so all checks return false/empty.

export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}

export async function hasHardwareAsync(): Promise<boolean> {
  return false;
}

export async function isEnrolledAsync(): Promise<boolean> {
  return false;
}

export async function supportedAuthenticationTypesAsync(): Promise<AuthenticationType[]> {
  return [];
}

export async function authenticateAsync(
  _options?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'not_available' };
}

const LocalAuthentication = {
  AuthenticationType,
  hasHardwareAsync,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
  authenticateAsync,
};
