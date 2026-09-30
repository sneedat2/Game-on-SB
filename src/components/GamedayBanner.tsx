import { Beer, Radio, Tv } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TEAMS } from '@/constants/bar';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatKickoff, pad2, splitDuration } from '@/lib/time';
import type { GamedayEvent } from '@/types';

const LIVE_WINDOW_MS = 4 * 3600_000;

function CountdownBlock({ value, label }: { value: string; label: string }) {
  return (
    <View className="min-w-[56px] items-center rounded-xl bg-black/35 px-2 py-2">
      <Text className="text-2xl font-black text-white" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</Text>
    </View>
  );
}

export function GamedayBanner({ events }: { events: GamedayEvent[] }) {
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string>();
  if (events.length === 0) return null;

  const event = events.find((e) => e.id === selectedId) ?? events[0];
  const team = TEAMS[event.team];
  const msToKickoff = new Date(event.startsAt).getTime() - now.getTime();
  const isLive = msToKickoff <= 0 && msToKickoff > -LIVE_WINDOW_MS;
  const t = splitDuration(msToKickoff);

  return (
    <View className="overflow-hidden rounded-3xl" style={{ backgroundColor: team.color }}>
      {/* diagonal stripe accent */}
      <View
        className="absolute -right-10 -top-10 h-48 w-24 rotate-12 opacity-25"
        style={{ backgroundColor: team.accent }}
        pointerEvents="none"
      />
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-black uppercase tracking-[3px] text-white/85">
            {team.league} · Gameday at Game On
          </Text>
          {isLive ? (
            <View className="flex-row items-center gap-1 rounded-full bg-white px-2 py-0.5">
              <Radio size={12} color="#DC2626" />
              <Text className="text-[11px] font-black text-red-600">LIVE</Text>
            </View>
          ) : null}
        </View>

        <Text className="mt-2 text-2xl font-black text-white">
          {team.name} {event.homeAway === 'home' ? 'vs' : '@'} {event.opponent}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Tv size={13} color="rgba(255,255,255,0.8)" />
          <Text className="text-sm text-white/80">
            {formatKickoff(event.startsAt)}
            {event.broadcast ? ` · ${event.broadcast}` : ''}
          </Text>
        </View>

        {isLive ? (
          <Text className="mt-4 text-lg font-extrabold text-white">Game’s on - grab a seat, specials are running!</Text>
        ) : (
          <View className="mt-4 flex-row gap-2">
            <CountdownBlock value={String(t.days)} label="days" />
            <CountdownBlock value={pad2(t.hours)} label="hrs" />
            <CountdownBlock value={pad2(t.minutes)} label="min" />
            <CountdownBlock value={pad2(t.seconds)} label="sec" />
          </View>
        )}

        <View className="mt-4 gap-1.5 rounded-2xl bg-black/25 p-3">
          {event.specials.map((s) => (
            <View key={s} className="flex-row items-center gap-2">
              <Beer size={14} color={colors.gold} />
              <Text className="flex-1 text-sm font-semibold text-white">{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {events.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12, paddingTop: 0 }}>
          {events.map((e) => {
            const active = e.id === event.id;
            return (
              <Pressable
                key={e.id}
                onPress={() => setSelectedId(e.id)}
                className={`rounded-full px-3 py-1.5 ${active ? 'bg-white' : 'bg-black/30'}`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-black' : 'text-white'}`}>
                  {TEAMS[e.team].name} · {formatKickoff(e.startsAt).split(',')[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
