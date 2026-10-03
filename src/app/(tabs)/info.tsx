// Lucide v1 dropped brand logos, so generic glyphs stand in for Facebook/TikTok.
import { Clock, Music2, MapPin, Navigation, Phone, ShoppingBag, Users, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Screen, SectionHeader } from '@/components/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BAR } from '@/constants/bar';
import { loadContent } from '@/services/content';
import { happyHourLabel, timeRange, useSettings } from '@/services/settings';
import { colors } from '@/constants/theme';
import { callBar, openDirections, openExternal, openOnlineOrdering } from '@/services/ordering';

function LinkRow({ icon: Icon, label, detail, onPress }: { icon: LucideIcon; label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" className="flex-row items-center gap-3 py-3 active:opacity-70">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-ink-600">
        <Icon size={18} color={colors.brand} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-chalk">{label}</Text>
        {detail ? <Text className="text-sm text-muted">{detail}</Text> : null}
      </View>
      <Text className="text-lg text-muted">›</Text>
    </Pressable>
  );
}

export default function InfoScreen() {
  const { street, city, state, zip } = BAR.address;
  const settings = useSettings();
  // Set in /admin → Hours & Happy Hour; only real tiktok.com links are opened.
  const tiktok = /^https:\/\/([\w-]+\.)*tiktok\.com\//i.test(settings.social?.tiktok ?? '') ? settings.social!.tiktok! : '';

  // Pick up admin edits to hours/happy hour when this tab is opened.
  useFocusEffect(
    useCallback(() => {
      void loadContent().catch(() => {});
    }, []),
  );
  return (
    <Screen title="Bar Info" subtitle="Come for the game, stay for the wings.">
      <Card className="gap-4">
        <View className="flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <MapPin size={22} color={colors.onBrand} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-chalk">{BAR.name}</Text>
            <Text className="text-base text-chalk">{street}</Text>
            <Text className="text-base text-muted">
              {city}, {state} {zip}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-3">
          <Button label="Call Bar" icon={Phone} variant="secondary" onPress={() => void callBar()} className="flex-1" />
          <Button label="Directions" icon={Navigation} onPress={() => void openDirections()} className="flex-1" />
        </View>
        <Text className="text-center text-sm text-muted">{BAR.phone}</Text>
      </Card>

      <Card>
        <View className="mb-2 flex-row items-center gap-2">
          <Clock size={16} color={colors.gold} />
          <Text className="text-lg font-extrabold text-chalk">Kitchen Hours</Text>
        </View>
        {settings.hours.map((h, i) => (
          <View key={`${h.days}-${i}`} className="flex-row justify-between py-1.5">
            <Text className="text-chalk">{h.days}</Text>
            <Text className="text-muted">
              {h.open} – {h.close}
            </Text>
          </View>
        ))}
        {settings.happyHour.days.length > 0 ? (
          <>
            <View className="mt-3 flex-row items-center justify-between rounded-xl bg-brand px-3 py-2.5">
              <Text className="font-black text-ink">Happy Hour</Text>
              <Text className="font-bold text-ink">{happyHourLabel(settings)}</Text>
            </View>
            {settings.happyHour.phases.map((p, i) => (
              <View key={`${p.start}-${i}`} className="flex-row justify-between py-1.5">
                <Text className="text-chalk">{timeRange(p.start, p.end)}</Text>
                <Text className="ml-3 flex-1 text-right text-muted">{p.deals.join(' · ')}</Text>
              </View>
            ))}
          </>
        ) : null}
      </Card>

      <View>
        <SectionHeader title="Stay in the Game" />
        <Card className="py-1">
          <LinkRow icon={ShoppingBag} label="Order Online" detail="Pickup via Toast" onPress={() => void openOnlineOrdering()} />
          <View className="h-px bg-ink-600" />
          <LinkRow icon={Users} label="Facebook" detail="Events, specials & game-watch parties" onPress={() => void openExternal(BAR.social.facebook)} />
          {tiktok ? (
            <>
              <View className="h-px bg-ink-600" />
              <LinkRow icon={Music2} label="TikTok" detail="Game day clips & behind the bar" onPress={() => void openExternal(tiktok)} />
            </>
          ) : null}
        </Card>
      </View>

      <Text className="text-center text-xs text-muted">Please drink responsibly. 21+ with valid ID for alcohol.</Text>
    </Screen>
  );
}
