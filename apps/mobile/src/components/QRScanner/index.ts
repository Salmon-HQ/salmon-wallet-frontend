/**
 * QRScanner Component
 *
 * Platform behavior:
 * - Native: scans QR codes with the rear camera (expo-camera) and validates
 *   the payload against the active chain before returning it
 * - Web: displays a message indicating QR scanning is only available on mobile
 */

export { QRScanner, QRScanner as default } from './QRScanner';
export type { QRScannerProps, QRScanResult } from './types';
