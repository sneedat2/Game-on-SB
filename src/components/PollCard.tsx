import * as Haptics from 'expo-haptics';
import { CheckCircle2, Clock, Flame } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import type { Poll, PollCategory, PollOption } from '@/types';
import { Card, Tag } from './ui';

export const categoryLabels: Record<PollCategory, string> = {
  food: 'Food',
  drinks: 'Drinks',
  events: 'Events',
  debates: 'Fun Debates',
};

function closesIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / 3600_000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function ResultBar({ option, pct, index, mine, leading }: { option: PollOption; pct: number; index: number; mine: boolean; leading: boolean }) {
  const width = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    width.value = withDelay(index * 80, withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) }));
    // Count the label up alongside the bar (JS-side, cheap at this scale).
    const start = Date.now() + index * 80;
    const timer = setInterval(() => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / 700));
      setShown(Math.round(pct * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [pct, index, width]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      className={`h-12 justify-center overflow-hidden rounded-xl border ${mine ? 'border-brand' : 'border-ink-600'} bg-ink-700`}
      accessibilityLabel={`${option.label}, ${pct} percent${mine ? ', your vote' : ''}`}
    >
      {/* Reanimated views don't get NativeWind className interop, so colors are inline. */}
      <Animated.View
        style={[
          barStyle,
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            backgroundColor: mine ? 'rgba(251,79,20,0.45)' : leading ? 'rgba(255,199,44,0.25)' : 'rgba(58,71,87,0.7)',
          },
        ]}
      />
      <View className="flex-row items-center justify-between px-3">
        <View className="flex-1 flex-row items-center gap-2">
          {option.emoji ? <Text className="text-base">{option.emoji}</Text> : null}
          <Text className="flex-shrink font-semibold text-chalk" numberOfLines={1}>
            {option.label}
          </Text>
          {mine ? <CheckCircle2 size={16} color={colors.brand} /> : null}
        </View>
        <Text className="ml-2 font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
          {shown}%
        </Text>
      </View>
    </View>
  );
}

export function PollCard({
  poll,
  myChoice,
  onVote,
}: {
  poll: Poll;
  myChoice?: string;
  onVote: (pollId: string, optionId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<string>();
  const total = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const maxVotes = Math.max(...poll.options.map((o) => o.votes));
  const voted = Boolean(myChoice);

  // Largest-remainder rounding so the percentages always add up to 100.
  const pcts = (() => {
    if (total === 0) return poll.options.map(() => 0);
    const raw = poll.options.map((o) => (o.votes / total) * 100);
    const floored = raw.map(Math.floor);
    let remainder = 100 - floored.reduce((a, b) => a + b, 0);
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => {
        if (remainder-- > 0) floored[i] += 1;
      });
    return floored;
  })();

  const handleVote = async (optionId: string) => {
    if (voted || pending) return;
    setPending(optionId);
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onVote(poll.id, optionId);
    } finally {
      setPending(undefined);
    }
  };

  return (
    <Card className={poll.featured ? 'border-brand/60' : ''}>
      <View className="mb-2 flex-row items-center gap-2">
        <Tag label={categoryLabels[poll.category]} tone="brand" />
        {poll.featured ? (
          <View className="flex-row items-center gap-1">
            <Flame size={12} color={colors.gold} />
            <Text className="text-[11px] font-bold uppercase text-gold">Featured</Text>
          </View>
        ) : null}
        <View className="flex-1" />
        <Clock size={12} color={colors.muted} />
        <Text className="text-xs text-muted">{closesIn(poll.closesAt)}</Text>
      </View>

      <Text className="mb-3 text-lg font-extrabold leading-6 text-chalk">{poll.question}</Text>

      <View className="gap-2">
        {poll.options.map((option, index) =>
          voted ? (
            <ResultBar
              key={option.id}
              option={option}
              pct={pcts[index]}
              index={index}
              mine={option.id === myChoice}
              leading={option.votes === maxVotes}
            />
          ) : (
            <Pressable
              key={option.id}
              onPress={() => handleVote(option.id)}
              disabled={Boolean(pending)}
              accessibilityRole="button"
              accessibilityLabel={`Vote for ${option.label}`}
              className={`h-12 flex-row items-center gap-2 rounded-xl border px-3 active:bg-ink-600 ${
                pending === option.id ? 'border-brand bg-ink-600' : 'border-ink-500 bg-ink-700'
              } ${pending && pending !== option.id ? 'opacity-50' : ''}`}
            >
              {option.emoji ? <Text className="text-base">{option.emoji}</Text> : null}
              <Text className="flex-1 font-semibold text-chalk">{option.label}</Text>
              <View className={`h-5 w-5 rounded-full border-2 ${pending === option.id ? 'border-brand bg-brand' : 'border-ink-500'}`} />
            </Pressable>
          ),
        )}
      </View>

      <Text className="mt-3 text-xs text-muted">
        {total.toLocaleString()} votes{voted ? ' · Thanks for weighing in!' : ' · Tap to vote and see results'}
      </Text>
    </Card>
  );
}
