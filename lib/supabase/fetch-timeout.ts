/**
 * fetch wrapper that aborts stalled Supabase requests.
 * Without this, a dropped connection leaves the UI wedged forever
 * (e.g. a submit button stuck in its loading state with no error).
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  ms = 30_000
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(ms) });
}
