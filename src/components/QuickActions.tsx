import { router } from 'expo-router';
import { Beer, ShoppingBag, Trophy, Vote, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { openOnlineOrdering } from '@/services/ordering';

const actions: { label: string; icon: LucideIcon; onPress: () => void; primary?: boolean }[] = [
  { label: 'Order Online', icon: ShoppingBag, onPress: () => void openOnlineOrdering(), primary: true },
  { label: 'View Tap List', icon: Beer, onPress: () => router.push({ pathname: '/menu', params: { view: 'bar', section: 'growlers', t: String(Date.now()) } }) },
  { label: 'Check Rewards', icon: Trophy, onPress: () => router.push('/rewards') },
  { label: "Today's Poll", icon: Vote, onPress: () => router.push('/polls') },
];

export function QuickActions() {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {actions.map(({ label, icon: Icon, onPress, primary }) => (
        <Pressable
          key={label}
          onPress={onPress}
          accessibilityRole="button"
          className={`w-[48.5%] flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-80 ${
            primary ? 'border-brand bg-brand' : 'border-ink-600 bg-ink-800'
          }`}
        >
          <View className={`h-9 w-9 items-center justify-center rounded-xl ${primary ? 'bg-white/20' : 'bg-ink-600'}`}>
            <Icon size={18} color={primary ? '#FFFFFF' : colors.brand} />
          </View>
          <Text className={`flex-1 text-sm font-bold ${primary ? 'text-white' : 'text-chalk'}`}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
