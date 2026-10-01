import * as Haptics from 'expo-haptics';
import { Bell, BellOff, Gift, Lock, PartyPopper } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useNow } from '@/hooks/useNow';
import { formatClock, nextHappyHourLabel, nextPromoStart, promoTiming } from '@/lib/time';
import { promoAlertsEnabled, setPromoAlerts } from '@/services/notifications';
import { promoSchedule, todaysPromos } from '@/services/promos';
import { formatTime, timeRange } from '@/services/settings';
import type { Promo } from '@/types';

function PromoRow({ promo, now }: { promo: Promo; now: Date }) {
  const timing = promoTiming(promo, now);
  const locked = promo.surprise && !promo.title; // details arrive once it starts
  const live = timing.state === 'live';

  return (
    <View className={`rounded-2xl p-4 ${live ? 'bg-brand' : 'bg-ink-700'}`}>
      {locked ? (
        <View className="flex-row items-center gap-3">
          <Lock size={22} color={colors.muted} />
          <View className="flex-1">
            <Text className="text-lg font-black text-chalk">Surprise promo</Text>
            <Text className="text-sm text-muted">Unlocks at {formatTime(promo.start)} - be here or be square.</Text>
          </View>
        </View>
      ) : (
        <Animated.View entering={FadeIn}>
          <View className="flex-row items-center gap-2">
            {live ? <PartyPopper size={18} color={colors.onBrand} /> : null}
            <Text className={`flex-1 text-xl font-black ${live ? 'text-ink' : 'text-chalk'}`}>{promo.title}</Text>
          </View>
          {promo.description ? <Text className={`mt-1 text-base ${live ? 'text-ink' : 'text-chalk'}`}>{promo.description}</Text> : null}
          <Text className={`mt-1 text-xs font-bold uppercase tracking-wide ${live ? 'text-ink/70' : 'text-muted'}`}>
            {timeRange(promo.start, promo.end)}
          </Text>
          {promo.finePrint ? <Text className={`mt-1 text-xs ${live ? 'text-ink/70' : 'text-muted'}`}>{promo.finePrint}</Text> : null}
        </Animated.View>
      )}
      <View className={`mt-3 self-start rounded-full px-3 py-1 ${live ? 'bg-ink' : 'bg-ink-600'}`}>
        <Text className={`text-xs font-bold ${live ? 'text-brand' : 'text-chalk'}`} style={{ fontVariant: ['tabular-nums'] }}>
          {live ? `Ends in ${formatClock(timing.msRemaining)}` : `Starts in ${formatClock(timing.msRemaining)}`}
        </Text>
      </View>
    </View>
  );
}

/** Today's promos (/admin → Promos), or a teaser for the next one. Hidden if there are none at all. */
export function PromoCard({ title = 'Today’s Promos' }: { title?: string }) {
  const now = useNow();
  const today = useAsync(() => todaysPromos());
  const schedule = useAsync(() => promoSchedule());
  const [alertsOn, setAlertsOn] = useState(false);

  useEffect(() => {
    void promoAlertsEnabled().then(setAlertsOn);
  }, []);

  // When a surprise unlocks (or the day rolls over), fetch again to get its details.
  const showing = (today.data ?? []).filter((p) => promoTiming(p, now).state !== 'ended');
  const needsReveal = showing.some((p) => p.surprise && !p.title && promoTiming(p, now).state === 'live');
  const { reload } = today;
  const revealed = useRef(false);
  useEffect(() => {
    if (!needsReveal) return;
    void reload();
    if (!revealed.current && Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    revealed.current = true;
  }, [needsReveal, reload]);

  const toggleAlerts = async () => {
    const result = await setPromoAlerts(!alertsOn);
    if (result.ok) setAlertsOn(!alertsOn);
    else if (result.reason) Alert.alert('Heads up', result.reason);
  };

  const all = schedule.data ?? [];
  if (!today.data || (showing.length === 0 && all.length === 0)) return null;
  const next = showing.length === 0 ? nextPromoStart(all, now) : null;

  return (
    <View className="overflow-hidden rounded-3xl border border-ink-600 bg-ink-800 p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Gift size={18} color={colors.brand} />
          <Text className="flex-shrink text-xs font-black uppercase tracking-[3px] text-chalk" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Pressable
          onPress={toggleAlerts}
          hitSlop={10}
          accessibilityRole="switch"
          accessibilityState={{ checked: alertsOn }}
          accessibilityLabel="Alert me when promos start"
          className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${alertsOn ? 'bg-brand/20' : 'bg-ink-600'}`}
        >
          {alertsOn ? <Bell size={13} color={colors.brand} /> : <BellOff size={13} color={colors.muted} />}
          <Text className={`text-[11px] font-bold ${alertsOn ? 'text-brand' : 'text-muted'}`}>{alertsOn ? 'Alerts on' : 'Alert me'}</Text>
        </Pressable>
      </View>

      {showing.length > 0 ? (
        <View className="gap-3">
          {showing.map((p) => (
            <PromoRow key={p.id} promo={p} now={now} />
          ))}
        </View>
      ) : next ? (
        <View className="items-center py-2">
          <Text className="text-sm text-muted">No promos right now. Next up:</Text>
          <Text className="mt-1 text-center text-xl font-black text-chalk">
            {next.promo.surprise ? 'A surprise promo' : next.promo.title}
          </Text>
          <Text className="mt-1 text-sm font-bold text-brand">
            {nextHappyHourLabel(next.daysAhead, now).replace(/^./, (c) => c.toUpperCase())} at {formatTime(next.promo.start)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
