import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';
import { barDateKey, getFlashDealState } from '@/lib/time';
import { config, isLive } from './config';
import { readJSON, writeJSON } from './storage';
import { ensureSession, supabase } from './supabase';

// Two layers:
//  1. Local notifications scheduled on-device for the next weekday 6 PM unlocks. Works offline,
//     in Expo Go, and without any backend.
//  2. Remote push via Expo push tokens stored in Supabase, so the bar can blast gameday specials
//     (see supabase/functions/flash-deal-push). Requires a development build + EAS project id.

const supported = Platform.OS !== 'web';
const CHANNEL_ID = 'flash-deals';
const PREF_KEY = 'flash-alerts-enabled';
const ID_PREFIX = 'flash-deal-';
const UNLOCKS_AHEAD = 5; // a work-week of weekday 6 PM alerts, refreshed on every launch

export function initNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '6 PM Surprise & gameday deals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.brand,
    });
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return next.granted;
}

export const flashAlertsEnabled = () => readJSON<boolean>(PREF_KEY, false);

/** Schedules (or refreshes) the next weekday 6 PM unlock alerts. Safe to call on every launch. */
export async function scheduleFlashDealAlerts(): Promise<void> {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  let unlockAt = getFlashDealState().nextUnlockAt;
  for (let i = 0; i < UNLOCKS_AHEAD; i++) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${barDateKey(unlockAt)}`,
      content: {
        title: '🔓 The 6 PM Surprise is live!',
        body: 'Happy hour just ended - tap to see tonight\'s 1-hour flash deal at Game On.',
        data: { url: '/' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: unlockAt,
        channelId: CHANNEL_ID,
      },
    });
    unlockAt = getFlashDealState(new Date(unlockAt.getTime() + 2 * 3600_000)).nextUnlockAt;
  }
}

export async function setFlashDealAlerts(enabled: boolean): Promise<{ ok: boolean; reason?: string }> {
  if (!supported) return { ok: false, reason: 'Notifications are available in the iOS and Android app.' };
  if (!enabled) {
    await writeJSON(PREF_KEY, false);
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    return { ok: true };
  }
  if (!(await ensurePermission())) {
    return { ok: false, reason: 'Notifications are turned off for Game On in your phone settings.' };
  }
  await writeJSON(PREF_KEY, true);
  await scheduleFlashDealAlerts();
  void registerPushToken();
  return { ok: true };
}

/** Saves this device's Expo push token so the backend can send remote pushes. Live mode only. */
export async function registerPushToken(): Promise<string | null> {
  if (!supported || !isLive || !Device.isDevice || !config.easProjectId) return null;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: config.easProjectId });
    const userId = await ensureSession();
    await supabase()
      .from('push_tokens')
      .upsert({ token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() }, { onConflict: 'token' });
    return token;
  } catch (e) {
    console.warn('[notifications] push registration failed', e);
    return null;
  }
}
