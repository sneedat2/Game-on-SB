import { CalendarCheck, ChefHat, Hourglass } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { ShowcaseItem } from '@/types';
import { Card, Tag } from './ui';

const statusMeta = {
  'on-menu': { label: 'On the menu', tone: 'turf' as const, icon: ChefHat, color: colors.turf },
  'event-booked': { label: 'Event booked', tone: 'gold' as const, icon: CalendarCheck, color: colors.gold },
  'coming-soon': { label: 'Coming soon', tone: 'brand' as const, icon: Hourglass, color: colors.brand },
};

export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const meta = statusMeta[item.status];
  const Icon = meta.icon;
  const launched = new Date(`${item.launchedOn}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <Card>
      <View className="flex-row gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-ink-600">
          <Icon size={24} color={meta.color} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Tag label={meta.label} tone={meta.tone} />
            <Text className="text-xs text-muted">{item.status === 'coming-soon' ? `Target ${launched}` : `Since ${launched}`}</Text>
          </View>
          <Text className="mt-1.5 text-lg font-extrabold text-chalk">{item.title}</Text>
          <Text className="mt-0.5 text-sm text-muted">{item.description}</Text>
          <View className="mt-3 rounded-xl bg-ink-700 p-3">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-muted">The poll</Text>
            <Text className="mt-0.5 text-sm text-chalk">“{item.pollQuestion}”</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-ink-500">
              <View className="h-full rounded-full bg-brand" style={{ width: `${item.winningShare}%` }} />
            </View>
            <Text className="mt-1 text-xs font-semibold text-brand-light">Won with {item.winningShare}% of the vote</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
