import '../global.css';

import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdminPreviewBanner, ClosedScreen } from '@/components/ClosedScreen';
import { colors } from '@/constants/theme';
import { useAppStatus } from '@/services/appStatus';
import { loadContent } from '@/services/content';
import { flashAlertsEnabled, initNotifications, registerPushToken, scheduleFlashDealAlerts } from '@/services/notifications';

initNotifications();

function useNotificationBootstrap() {
  useEffect(() => {
    // Load admin-edited settings (hours, happy hour) early so every screen starts with them.
    const contentReady = loadContent().catch(() => null);
    if (Platform.OS === 'web') return;
    // Keep the rolling week of surprise alerts topped up every launch (after settings arrive).
    void Promise.all([flashAlertsEnabled(), contentReady]).then(([on]) => {
      if (on) {
        void scheduleFlashDealAlerts();
        void registerPushToken();
      }
    });
    // Tapping a notification deep-links to the screen in its payload (defaults to Home).
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => sub.remove();
  }, []);
}

const STATUS_CHECK_MS = 60_000;

/** Re-checks open/closed every minute so an already-open app follows the admin switch. */
function useAppStatusPolling() {
  useEffect(() => {
    const timer = setInterval(() => void loadContent(true).catch(() => null), STATUS_CHECK_MS);
    return () => clearInterval(timer);
  }, []);
}

export default function RootLayout() {
  useNotificationBootstrap();
  useAppStatusPolling();
  const appStatus = useAppStatus();

  if (appStatus.closed) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ClosedScreen message={appStatus.message} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {appStatus.adminPreview ? <AdminPreviewBanner /> : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.ink900 },
          headerTintColor: colors.chalk,
          contentStyle: { backgroundColor: colors.ink900 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coupon/[id]" options={{ presentation: 'modal', title: 'Redeem' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
