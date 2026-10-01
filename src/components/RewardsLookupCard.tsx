import { Search, Trophy, UserPlus } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { BAR } from '@/constants/bar';
import { colors } from '@/constants/theme';
import { openRewardsLookup, openRewardsSignup } from '@/services/ordering';
import { Button } from './ui';

/** Game On Rewards (Toast): opens Toast's own lookup/sign-up pages, so guests see their real points. */
export function RewardsLookupCard() {
  return (
    <View className="overflow-hidden rounded-3xl border border-brand/50 bg-ink-800 p-5">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand">
          <Trophy size={24} color={colors.onBrand} />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-black uppercase tracking-[3px] text-brand">Game On Rewards</Text>
          <Text className="mt-0.5 text-base font-bold text-chalk">{BAR.rewards.program}</Text>
        </View>
      </View>
      <Button label="Check my points" icon={Search} onPress={() => void openRewardsLookup()} className="mt-4" />
      <Button label="Join Game On Rewards" icon={UserPlus} variant="secondary" onPress={() => void openRewardsSignup()} className="mt-2" />
      <Text className="mt-3 text-center text-xs text-muted">Look up your points with the email or phone number you use at the bar.</Text>
    </View>
  );
}
