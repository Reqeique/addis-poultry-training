import { Capacitor } from '@capacitor/core';

/**
 * Resolves a relative API path to a fully qualified URL when running on native platforms (Capacitor).
 *
 *  - Native (Android/iOS): Prefixes with NEXT_PUBLIC_APP_URL from environment (or default emulator IP).
 *  - Web (Browser): Keeps it relative (resolves to current host origin).
 */
export function resolveApiUrl(path: string): string {
  if (Capacitor.isNativePlatform()) {
    // Read the configured remote app URL (e.g. https://my-chicken-addis.vercel.app or local emulator IP)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://10.0.2.2:3000';
    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const trimmedPath = path.startsWith('/') ? path : `/${path}`;
    return `${trimmedBase}${trimmedPath}`;
  }
  return path;
}
