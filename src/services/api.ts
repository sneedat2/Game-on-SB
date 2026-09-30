import { Platform } from 'react-native';
import { markClosed, markOpen } from './appStatus';
import { randomId, readJSON, writeJSON } from './storage';

// Our own server (server/index.mjs on Railway): live Toast menu + admin-edited content.
// The website calls it on the same domain; the phone app needs the full address.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const apiConfigured = Platform.OS === 'web' || BASE.length > 0;
const TIMEOUT_MS = 6000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Network failure / not deployed with the server (e.g. local dev) - callers fall back to built-in data. */
export class ApiUnavailable extends Error {}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiConfigured) throw new ApiUnavailable('No API configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch {
    throw new ApiUnavailable('Network error');
  } finally {
    clearTimeout(timer);
  }
  if (!res.headers.get('content-type')?.includes('application/json')) throw new ApiUnavailable('Not our API');
  const body = await res.json();
  if (res.status === 503 && body?.error === 'maintenance') {
    markClosed(body.message);
    throw new ApiError(body.message ?? 'Closed for maintenance', 503);
  }
  markOpen(res.headers.get('x-maintenance-preview') === '1');
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

/** Anonymous per-install id - lets the server enforce one poll vote per phone. */
let deviceId: Promise<string> | null = null;
export function getDeviceId(): Promise<string> {
  deviceId ??= readJSON<string | null>('device-id', null).then(async (existing) => {
    if (existing) return existing;
    const id = `d-${randomId(20)}`;
    await writeJSON('device-id', id);
    return id;
  });
  return deviceId;
}
