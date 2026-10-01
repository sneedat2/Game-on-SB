import { Beer, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatClock, getHappyHourState, nextHappyHourLabel, splitDuration, type HappyHourState } from '@/lib/time';
import { formatTime, happyHourLabel, timeRange, useSettings, type HappyHourPhase } from '@/services/settings';

/** HH:MM:SS, with a day prefix for long waits (e.g. over the weekend). */
function formatLong(ms: number): string {
  const { days } = splitDuration(ms);
  return days > 0 ? `${days}d ${formatClock(ms - days * 86_400_000)}` : formatClock(ms);
}

function BigClock({ ms }: { ms: number }) {
  return (
    <Text className="mt-1 text-5xl font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
      {formatLong(ms)}
    </Text>
  );
}

/** All tiers, with the current one highlighted and past ones dimmed. */
function TierList({ phases, current, past }: { phases: HappyHourPhase[]; current?: number; past?: number }) {
  return (
    <View className="mt-4 gap-1.5">
      {phases.map((p, i) => {
        const isNow = i === current;
        const done = past !== undefined && i < past;
        return (
          <View
            key={`${p.start}-${i}`}
            className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 ${isNow ? 'bg-brand' : 'bg-ink-700'} ${done ? 'opacity-40' : ''}`}
          >
            <Text className={`font-bold ${isNow ? 'text-ink' : 'text-chalk'}`}>{timeRange(p.start, p.end)}</Text>
            <Text className={`ml-3 flex-1 text-right font-semibold ${isNow ? 'text-ink' : 'text-muted'}`}>{p.deals.join(' · ')}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Dev-only: long-press the card to preview each stage without waiting for the clock.
const PREVIEWS: (Partial<HappyHourState> | null)[] = [
  null,
  { stage: 'before', msRemaining: 2 * 3600_000 },
  { stage: 'on', phaseIndex: 0, waiting: false, msRemaining: 42 * 60_000 },
  { stage: 'on', phaseIndex: 1, waiting: false, msRemaining: 42 * 60_000 },
  { stage: 'on', phaseIndex: 2, waiting: false, msRemaining: 42 * 60_000 },
  { stage: 'off', msRemaining: 44 * 3600_000, daysUntilNext: 3 },
];

export function HappyHourCard({ title = 'Happy Hour' }: { title?: string }) {
  const now = useNow();
  const settings = useSettings();
  const [previewIndex, setPreviewIndex] = useState(0);
  const { phases, days } = settings.happyHour;
  if (days.length === 0 || phases.length === 0) return null;

  const state: HappyHourState = { ...getHappyHourState(now, settings), ...(PREVIEWS[previewIndex] ?? {}) };
  const phase = phases[Math.min(state.phaseIndex, phases.length - 1)];
  const isLastTier = state.phaseIndex >= phases.length - 1;
  const on = state.stage === 'on';

  return (
    <Pressable
      onLongPress={__DEV__ ? () => setPreviewIndex((i) => (i + 1) % PREVIEWS.length) : undefined}
      className={`overflow-hidden rounded-3xl border p-5 ${on ? 'border-brand bg-ink-700' : 'border-ink-600 bg-ink-800'}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Beer size={18} color={colors.brand} />
          <Text className="flex-shrink text-xs font-black uppercase tracking-[3px] text-chalk" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text className="text-xs font-bold text-muted">{happyHourLabel(settings)}</Text>
      </View>

      {state.stage === 'before' ? (
        <View className="mt-4 items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-ink-600">
            <Clock size={26} color={colors.brand} />
          </View>
          <Text className="mt-3 text-sm text-muted">Happy hour starts in</Text>
          <BigClock ms={state.msRemaining} />
        </View>
      ) : null}

      {on ? (
        <View className="mt-4 items-center">
          <Text className="text-2xl font-black text-brand">{state.waiting ? 'Happy Hour - back soon' : 'Happy Hour is ON'}</Text>
          <Text className="mt-2 text-center text-3xl font-black text-chalk">{phase.deals.join(' · ') || 'Deals all hour'}</Text>
          <Text className="mt-1 text-sm text-muted">
            {state.waiting ? `Starting at ${formatTime(phase.start)}` : `Until ${formatTime(phase.end)}`}
          </Text>
          <View className="mt-3 rounded-full bg-brand px-4 py-1.5">
            <Text className="font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
              {state.waiting ? 'Back in' : isLastTier ? 'Ends in' : 'Prices go up in'} {formatClock(state.msRemaining)}
            </Text>
          </View>
        </View>
      ) : null}

      {state.stage === 'off' ? (
        <View className="mt-4 items-center">
          <Text className="text-center text-base font-semibold text-chalk">
            Happy hour is back {PREVIEWS[previewIndex] ? 'Monday' : nextHappyHourLabel(state.daysUntilNext, now)} at {formatTime(settings.happyHour.start)}
          </Text>
          <BigClock ms={state.msRemaining} />
        </View>
      ) : null}

      <TierList phases={phases} current={on && !state.waiting ? state.phaseIndex : undefined} past={on ? state.phaseIndex : undefined} />

      {__DEV__ && previewIndex > 0 ? (
        <Text className="mt-3 text-center text-[10px] uppercase tracking-widest text-brand">
          Dev preview (long-press to cycle)
        </Text>
      ) : null}
    </Pressable>
  );
}
