// Shared voice-recording helper with iOS Safari support.
// iOS Safari does NOT support audio/webm — it needs audio/mp4 (m4a).
// Pick the first MediaRecorder mimeType the browser supports.

export const AUDIO_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
];

export function pickSupportedAudioMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  for (const mime of AUDIO_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      continue;
    }
  }
  return undefined;
}

export function audioExtensionForMime(mime: string | undefined): string {
  if (!mime) return 'm4a';
  if (mime.includes('mp4') || mime.includes('aac') || mime.includes('mpeg')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

export async function requestMicrophone(): Promise<MediaStream> {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) {
    throw new Error('Microphone not supported on this browser. Please use Safari or Chrome over HTTPS.');
  }
  return md.getUserMedia({ audio: true });
}

export function micErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Microphone blocked. Allow mic access in Safari settings and try again.';
    if (err.name === 'NotFoundError') return 'No microphone found on this device.';
    if (err.name === 'NotSupportedError') return 'Voice recording is not supported on this browser.';
  }
  return 'Could not access microphone';
}
