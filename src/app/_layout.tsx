import '../global.css';

import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { flashAlertsEnabled, initNotifications, registerPushToken, scheduleFlashDealAlerts } from '@/services/notifications';

initNotifications();

function useNotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Keep the rolling week of 6 PM alerts topped up every launch.
    void flashAlertsEnabled().then((on) => {
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

export default function RootLayout() {
  useNotificationBootstrap();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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
