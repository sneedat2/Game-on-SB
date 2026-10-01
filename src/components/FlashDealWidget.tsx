import * as Haptics from 'expo-haptics';
import { Bell, BellOff, Beer, Clock, Gift, PartyPopper } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import {
  barDateKey,
  formatClock,
  formatMinSec,
  getFlashDealState,
  nextHappyHourLabel,
  splitDuration,
  type FlashDealPhase,
} from '@/lib/time';
import { gamedayService } from '@/services/gameday';
import { flashAlertsEnabled, setFlashDealAlerts } from '@/services/notifications';
import { formatTime, happyHourLabel, useSettings } from '@/services/settings';
import type { FlashDeal } from '@/types';

const PREVIEW_ORDER: (FlashDealPhase | null)[] = [null, 'before', 'happy-hour', 'live', 'off'];

/** HH:MM:SS, with a day prefix for long waits (e.g. over the weekend). */
function formatLong(ms: number): string {
  const { days } = splitDuration(ms);
  return days > 0 ? `${days}d ${formatClock(ms - days * 86_400_000)}` : formatClock(ms);
}

function BigClock({ ms, long }: { ms: number; long?: boolean }) {
  return (
    <Text className="mt-1 text-5xl font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
      {long ? formatLong(ms) : formatClock(ms)}
    </Text>
  );
}

export function FlashDealWidget({ title = 'Happy Hour' }: { title?: string }) {
  const now = useNow();
  const settings = useSettings();
  const hhLabel = happyHourLabel(settings);
  const unlockTime = formatTime(settings.happyHour.end);
  const surpriseLength = settings.surpriseMinutes === 60 ? '1-hour' : `${settings.surpriseMinutes}-minute`;
  const [previewIndex, setPreviewIndex] = useState(0); // dev-only phase preview (long-press)
  const [deal, setDeal] = useState<FlashDeal | null>();
  const [alertsOn, setAlertsOn] = useState(false);
  const real = getFlashDealState(now, settings);
  const preview = PREVIEW_ORDER[previewIndex];
  const phase = preview ?? real.phase;
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
  const msRemaining = preview ? (phase === 'live' ? 42 * 60_000 : phase === 'off' ? 44 * 3600_000 : 2 * 3600_000) : real.msRemaining;
  const nextDayLabel = preview ? 'Monday' : nextHappyHourLabel(real.daysUntilNextHappyHour, now);
  const highlighted = phase === 'live' || phase === 'happy-hour';

  // Admin turned happy hour off entirely (no days selected).
  if (settings.happyHour.days.length === 0) return null;

  return (
    <Pressable
      onLongPress={__DEV__ ? () => setPreviewIndex((i) => (i + 1) % PREVIEW_ORDER.length) : undefined}
      className={`overflow-hidden rounded-3xl border p-5 ${highlighted ? 'border-brand bg-ink-700' : 'border-ink-600 bg-ink-800'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
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
          accessibilityLabel="Alert me when the surprise unlocks"
          className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${alertsOn ? 'bg-brand/20' : 'bg-ink-600'}`}
        >
          {alertsOn ? <Bell size={13} color={colors.brand} /> : <BellOff size={13} color={colors.muted} />}
          <Text className={`text-[11px] font-bold ${alertsOn ? 'text-brand' : 'text-muted'}`}>
            {alertsOn ? 'Alerts on' : 'Alert me'}
          </Text>
        </Pressable>
      </View>

      {phase === 'before' ? (
        <View className="mt-4 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-ink-600">
            <Clock size={26} color={colors.brand} />
          </View>
          <Text className="mt-3 text-sm text-muted">Happy hour starts in</Text>
          <BigClock ms={msRemaining} />
          <Text className="mt-2 text-center text-xs text-muted">
            {hhLabel} · then a {surpriseLength} surprise deal unlocks at {unlockTime}.
          </Text>
        </View>
      ) : null}

      {phase === 'happy-hour' ? (
        <View className="mt-4 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
            <Beer size={26} color={colors.ink900} />
          </View>
          <Text className="mt-3 text-2xl font-black text-brand">Happy Hour is ON</Text>
          <Text className="mt-1 text-sm text-muted">Tonight’s surprise unlocks in</Text>
          <BigClock ms={msRemaining} />
          <Text className="mt-2 text-center text-xs text-muted">Until {unlockTime}. Be here or be square.</Text>
        </View>
      ) : null}

      {phase === 'live' ? (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={{ marginTop: 16, alignItems: 'center' }}>
          <PartyPopper size={34} color={colors.brand} />
          {deal === undefined ? (
            <Text className="mt-3 text-muted">Unwrapping…</Text>
          ) : deal ? (
            <Animated.View entering={FadeIn.delay(150)} style={{ alignItems: 'center' }}>
              <Text className="mt-2 text-center text-3xl font-black text-brand">{deal.title}</Text>
              <Text className="mt-1 text-center text-base text-chalk">{deal.description}</Text>
              {deal.finePrint ? <Text className="mt-1 text-center text-xs text-muted">{deal.finePrint}</Text> : null}
            </Animated.View>
          ) : (
            <Text className="mt-3 text-center text-chalk">Ask your bartender about tonight’s surprise!</Text>
          )}
          <View className="mt-4 rounded-full bg-brand px-4 py-1.5">
            <Text className="font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
              Ends in {formatMinSec(msRemaining)}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {phase === 'off' ? (
        <View className="mt-4 items-center">
          <Text className="text-center text-base font-semibold text-chalk">
            Happy hour is back {nextDayLabel} at {formatTime(settings.happyHour.start)}
          </Text>
          <BigClock ms={msRemaining} long />
          <Text className="mt-2 text-center text-xs text-muted">
            {hhLabel} · surprise deal at {unlockTime}.
          </Text>
        </View>
      ) : null}

      {__DEV__ && previewIndex > 0 ? (
        <Text className="mt-3 text-center text-[10px] uppercase tracking-widest text-brand">
          Dev preview: {phase} (long-press to cycle)
        </Text>
      ) : null}
    </Pressable>
  );
}
