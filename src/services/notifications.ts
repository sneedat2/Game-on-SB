import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';
import { barDateKey, upcomingPromoStarts } from '@/lib/time';
import { config, isLive } from './config';
import { promoSchedule } from './promos';
import { formatTime } from './settings';
import { readJSON, writeJSON } from './storage';
import { ensureSession, supabase } from './supabase';

// Two layers:
//  1. Local notifications scheduled on-device for upcoming promo starts (/admin → Promos).
//     Works in Expo Go and without push setup.
//  2. Remote push via Expo push tokens stored in Supabase, so the bar can blast gameday specials
//     (see supabase/functions/flash-deal-push). Requires a development build + EAS project id.

const supported = Platform.OS !== 'web';
const CHANNEL_ID = 'flash-deals';
const PREF_KEY = 'flash-alerts-enabled'; // same key as before, so existing opt-ins carry over
const ID_PREFIX = 'promo-';
const ALERTS_AHEAD = 6; // next few promo starts, refreshed on every launch

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
      name: 'Promos & gameday deals',
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

export const promoAlertsEnabled = () => readJSON<boolean>(PREF_KEY, false);

/** Schedules (or refreshes) alerts for the next promo starts. Safe to call on every launch. */
export async function schedulePromoAlerts(): Promise<void> {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  // Promos and their times come from /admin → Promos; surprises have no details in the schedule.
  for (const { promo, at } of upcomingPromoStarts(await promoSchedule(), ALERTS_AHEAD)) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${promo.id}-${barDateKey(at)}`,
      content: promo.surprise
        ? { title: '🔓 Surprise promo is live!', body: 'Tap to see today’s surprise deal at Game On.', data: { url: '/' } }
        : { title: `🍻 ${promo.title ?? 'Promo'} is on now!`, body: promo.description || `Until ${formatTime(promo.end)} at Game On.`, data: { url: '/' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function setPromoAlerts(enabled: boolean): Promise<{ ok: boolean; reason?: string }> {
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
  await schedulePromoAlerts();
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
