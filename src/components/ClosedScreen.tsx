import { Phone, Users } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAR } from '@/constants/bar';
import { callBar, openExternal } from '@/services/ordering';
import { BrandHeader } from './BrandHeader';
import { Button } from './ui';

/** Shown instead of the app while it's closed in /admin → App Status (matches the server's page). */
export function ClosedScreen({ message }: { message?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 justify-center bg-ink px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      accessibilityLiveRegion="polite"
    >
      <BrandHeader />
      <Text className="mt-8 text-center text-2xl font-black text-chalk">Be right back 🍻</Text>
      <Text className="mt-2 text-center text-base text-muted">
        {message || 'We’re making some upgrades. Be right back!'}
      </Text>
      <View className="mt-6 flex-row gap-3">
        <Button label="Call the bar" icon={Phone} onPress={() => void callBar()} className="flex-1" />
        <Button label="Facebook" icon={Users} variant="secondary" onPress={() => void openExternal(BAR.social.facebook)} className="flex-1" />
      </View>
    </View>
  );
}

/** Thin strip for a signed-in admin while guests see the closed page. */
export function AdminPreviewBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-red-600 px-4 pb-1.5" style={{ paddingTop: insets.top + 6 }}>
      <Text className="text-center text-xs font-bold text-white">
        Closed to guests - you’re seeing the app because you’re signed in as admin.
      </Text>
    </View>
  );
}
