import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'gameon:';

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Non-critical: mock-mode persistence only.
  }
}

/** Simulated network latency so loading states are exercised in mock mode. */
export const mockDelay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export function randomId(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I - easy to read aloud to a bartender
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
