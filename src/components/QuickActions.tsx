import { router } from 'expo-router';
import { Beer, MapPin, ShoppingBag, Vote, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { openOnlineOrdering } from '@/services/ordering';
import type { QuickActionKey } from '@/types';

// What each button does. Labels and which ones show come from /admin → Home Page.
const ACTIONS: Record<QuickActionKey, { icon: LucideIcon; onPress: () => void; primary?: boolean }> = {
  order: { icon: ShoppingBag, onPress: () => void openOnlineOrdering(), primary: true },
  taps: { icon: Beer, onPress: () => router.push({ pathname: '/menu', params: { view: 'bar', section: 'draft', t: String(Date.now()) } }) },
  checkin: { icon: MapPin, onPress: () => router.push('/rewards') },
  poll: { icon: Vote, onPress: () => router.push('/polls') },
};

export function QuickActions({ buttons }: { buttons: { key: QuickActionKey; label: string; visible: boolean }[] }) {
  const shown = buttons.filter((b) => b.visible && ACTIONS[b.key]);
  if (shown.length === 0) return null;
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {shown.map(({ key, label }) => {
        const { icon: Icon, onPress, primary } = ACTIONS[key];
        return (
          <Pressable
            key={key}
            onPress={onPress}
            accessibilityRole="button"
            className={`${shown.length === 1 ? 'w-full' : 'w-[48.5%]'} flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-80 ${
              primary ? 'border-brand bg-brand' : 'border-ink-600 bg-ink-800'
            }`}
          >
            <View className={`h-9 w-9 items-center justify-center rounded-xl ${primary ? 'bg-black/10' : 'bg-ink-600'}`}>
              <Icon size={18} color={primary ? colors.onBrand : colors.brand} />
            </View>
            <Text className={`flex-1 text-sm font-bold ${primary ? 'text-ink' : 'text-chalk'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
