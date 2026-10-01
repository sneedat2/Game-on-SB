import { apiFetch, ApiError, ApiUnavailable, getDeviceId } from './api';

// Daily location check-in (Rewards tab). The server decides whether the phone is at the bar and
// allows one check-in per day. Points come later; for now it counts visits.

export interface CheckinStatus {
  enabled: boolean;
  checkedInToday: boolean;
  visits: number;
}

export interface CheckinResult {
  alreadyCheckedIn: boolean;
  visits: number;
}

/** Thrown with a guest-friendly message for every way a check-in can fail. */
export class CheckinError extends Error {}

type Geo = { getCurrentPosition: (ok: (p: GeolocationLike) => void, err: (e: { code: number }) => void, o?: object) => void };
type GeolocationLike = { coords: { latitude: number; longitude: number; accuracy: number } };

// Browser location (the website). The phone app will use expo-location once it's added.
const geolocation = (): Geo | undefined => (globalThis as { navigator?: { geolocation?: Geo } }).navigator?.geolocation;
export const checkinSupported = () => Boolean(geolocation());

function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  const geo = geolocation();
  if (!geo) return Promise.reject(new CheckinError('Check-in isn’t available on this device yet.'));
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          new CheckinError(
            e.code === 1
              ? 'Location is blocked. Allow location for this site in your browser settings, then try again.'
              : e.code === 3
                ? 'Finding your location took too long. Step near a window or turn on Wi-Fi and try again.'
                : 'We couldn’t get your location. Make sure location services are on and try again.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export async function getCheckinStatus(): Promise<CheckinStatus | null> {
  try {
    return await apiFetch<CheckinStatus>(`/api/checkin?device=${encodeURIComponent(await getDeviceId())}`);
  } catch (e) {
    if (e instanceof ApiUnavailable) return null; // no server (local dev) - hide the card
    throw e;
  }
}

export async function checkIn(): Promise<CheckinResult> {
  const position = await currentPosition();
  try {
    return await apiFetch<CheckinResult>('/api/checkin', {
      method: 'POST',
      body: JSON.stringify({ deviceId: await getDeviceId(), ...position }),
    });
  } catch (e) {
    if (e instanceof ApiError) throw new CheckinError(e.message);
    throw new CheckinError('Couldn’t reach Game On - check your connection and try again.');
  }
}
