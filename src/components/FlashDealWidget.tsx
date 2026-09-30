import * as Haptics from 'expo-haptics';
import { Bell, BellOff, Gift, Lock, PartyPopper } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { FLASH_DEAL } from '@/constants/bar';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { barDateKey, formatClock, formatMinSec, getFlashDealState, type FlashDealPhase } from '@/lib/time';
import { gamedayService } from '@/services/gameday';
import { flashAlertsEnabled, setFlashDealAlerts } from '@/services/notifications';
import type { FlashDeal } from '@/types';

const hourLabel = `${FLASH_DEAL.unlockHour % 12 || 12} PM`;
const PREVIEW_ORDER: (FlashDealPhase | null)[] = [null, 'live', 'ended', 'counting-down'];

export function FlashDealWidget() {
  const now = useNow();
  const [previewIndex, setPreviewIndex] = useState(0); // dev-only phase preview (long-press)
  const [deal, setDeal] = useState<FlashDeal | null>();
  const [alertsOn, setAlertsOn] = useState(false);
  const real = getFlashDealState(now);
  const phase = PREVIEW_ORDER[previewIndex] ?? real.phase;
  const prevPhase = useRef(phase);
  const dateKey = barDateKey(now);

  useEffect(() => {
    void flashAlertsEnabled().then(setAlertsOn);
  }, []);

  // Only fetch the deal once it's unlocked - the reveal is the point.
  useEffect(() => {
    if (phase !== 'live') return;
    let cancelled = false;
    gamedayService
      .flashDeal(dateKey)
      .then((d) => !cancelled && setDeal(d))
      .catch(() => !cancelled && setDeal(null));
    return () => {
      cancelled = true;
    };
  }, [phase, dateKey]);

  useEffect(() => {
    if (prevPhase.current !== 'live' && phase === 'live' && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevPhase.current = phase;
  }, [phase]);

  const toggleAlerts = async () => {
    const result = await setFlashDealAlerts(!alertsOn);
    if (result.ok) setAlertsOn(!alertsOn);
    else if (result.reason) Alert.alert('Heads up', result.reason);
  };

  // In preview mode, fake a plausible remaining time so the clock still renders.
  const msRemaining = PREVIEW_ORDER[previewIndex] ? (phase === 'live' ? 42 * 60_000 : 3 * 3600_000) : real.msRemaining;

  return (
    <Pressable
      onLongPress={__DEV__ ? () => setPreviewIndex((i) => (i + 1) % PREVIEW_ORDER.length) : undefined}
      className={`overflow-hidden rounded-3xl border p-5 ${phase === 'live' ? 'border-gold bg-ink-700' : 'border-ink-600 bg-ink-800'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Gift size={18} color={phase === 'live' ? colors.gold : colors.brand} />
          <Text className="text-xs font-black uppercase tracking-[3px] text-chalk">The {hourLabel} Surprise</Text>
        </View>
        <Pressable
          onPress={toggleAlerts}
          hitSlop={10}
          accessibilityRole="switch"
          accessibilityState={{ checked: alertsOn }}
          accessibilityLabel="Alert me when the surprise unlocks"
          className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${alertsOn ? 'bg-brand/20' : 'bg-ink-600'}`}
        >
          {alertsOn ? <Bell size={13} color={colors.brand} /> : <BellOff size={13} color={colors.muted} />}
          <Text className={`text-[11px] font-bold ${alertsOn ? 'text-brand' : 'text-muted'}`}>
            {alertsOn ? 'Alerts on' : 'Alert me'}
          </Text>
        </Pressable>
      </View>

      {phase === 'counting-down' ? (
        <View className="mt-4 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-ink-600">
            <Lock size={26} color={colors.muted} />
          </View>
          <Text className="mt-3 text-sm text-muted">Happy hour ends & tonight’s surprise unlocks in</Text>
          <Text className="mt-1 text-5xl font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(msRemaining)}
          </Text>
          <Text className="mt-2 text-center text-xs text-muted">
            One hour only, {hourLabel}–{(FLASH_DEAL.unlockHour + 1) % 12 || 12} PM. Be here or be square.
          </Text>
        </View>
      ) : null}

      {phase === 'live' ? (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ marginTop: 16, alignItems: 'center' }}>
          <PartyPopper size={34} color={colors.gold} />
          {deal === undefined ? (
            <Text className="mt-3 text-muted">Unwrapping…</Text>
          ) : deal ? (
            <Animated.View entering={FadeIn.delay(150)} style={{ alignItems: 'center' }}>
              <Text className="mt-2 text-center text-3xl font-black text-gold">{deal.title}</Text>
              <Text className="mt-1 text-center text-base text-chalk">{deal.description}</Text>
              {deal.finePrint ? <Text className="mt-1 text-center text-xs text-muted">{deal.finePrint}</Text> : null}
            </Animated.View>
          ) : (
            <Text className="mt-3 text-center text-chalk">Ask your bartender about tonight’s surprise!</Text>
          )}
          <View className="mt-4 rounded-full bg-brand px-4 py-1.5">
            <Text className="font-bold text-white" style={{ fontVariant: ['tabular-nums'] }}>
              Ends in {formatMinSec(msRemaining)}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {phase === 'ended' ? (
        <View className="mt-4 items-center">
          <Text className="text-center text-base font-semibold text-chalk">Tonight’s surprise has wrapped up.</Text>
          <Text className="mt-1 text-sm text-muted">Next unlock in</Text>
          <Text className="mt-1 text-3xl font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(msRemaining)}
          </Text>
        </View>
      ) : null}

      {__DEV__ && previewIndex > 0 ? (
        <Text className="mt-3 text-center text-[10px] uppercase tracking-widest text-gold">
          Dev preview: {phase} (long-press to cycle)
        </Text>
      ) : null}
    </Pressable>
  );
}
