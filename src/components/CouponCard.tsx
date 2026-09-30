import { Baby, Drumstick, QrCode, Salad, Utensils, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { Coupon, CouponKind } from '@/types';

const icons: Record<CouponKind, LucideIcon> = {
  'free-app': Utensils,
  'kids-meal': Baby,
  'wings-bogo': Drumstick,
  'half-apps': Salad,
};

export function CouponCard({ coupon, redeemed, onRedeem }: { coupon: Coupon; redeemed: boolean; onRedeem: () => void }) {
  const Icon = icons[coupon.kind];
  const tracker = coupon.tracker;
  const unlocked = !tracker || tracker.current >= tracker.goal;
  const expires = new Date(`${coupon.expiresOn}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View className={`flex-row overflow-hidden rounded-2xl border border-ink-600 bg-ink-800 ${redeemed ? 'opacity-50' : ''}`}>
      {/* ticket stub */}
      <View className="w-20 items-center justify-center bg-brand/15">
        <Icon size={28} color={colors.brand} />
        <View className="absolute -right-2 top-[-8px] h-4 w-4 rounded-full bg-ink" />
        <View className="absolute -right-2 bottom-[-8px] h-4 w-4 rounded-full bg-ink" />
      </View>
      <View className="flex-1 border-l border-dashed border-ink-500 p-4">
        <Text className="text-base font-extrabold text-chalk">{coupon.title}</Text>
        <Text className="mt-0.5 text-sm text-muted">{coupon.description}</Text>

        {tracker ? (
          <View className="mt-3">
            <View className="flex-row gap-1.5">
              {Array.from({ length: tracker.goal }, (_, i) => (
                <View key={i} className={`h-2 flex-1 rounded-full ${i < tracker.current ? 'bg-brand' : 'bg-ink-500'}`} />
              ))}
            </View>
            <Text className="mt-1 text-xs text-muted">
              {Math.min(tracker.current, tracker.goal)} of {tracker.goal} {tracker.unit}
            </Text>
          </View>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-xs text-muted">
            {coupon.singleUse ? 'Single use' : 'Reusable'} · Exp. {expires}
          </Text>
          {redeemed ? (
            <Text className="text-xs font-bold uppercase text-muted">Redeemed</Text>
          ) : (
            <Pressable
              onPress={onRedeem}
              disabled={!unlocked}
              accessibilityRole="button"
              accessibilityLabel={`Redeem ${coupon.title}`}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${unlocked ? 'bg-brand' : 'bg-ink-600'}`}
            >
              <QrCode size={14} color={unlocked ? '#FFFFFF' : colors.muted} />
              <Text className={`text-xs font-bold ${unlocked ? 'text-white' : 'text-muted'}`}>{unlocked ? 'Redeem' : 'Locked'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
