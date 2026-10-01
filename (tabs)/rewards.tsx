import { router, useFocusEffect } from 'expo-router';
import { Award, Phone, Search, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { CouponCard } from '@/components/CouponCard';
import { Button, Card, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { colors } from '@/constants/theme';
import { DEMO_PHONE } from '@/data/mock/rewards';
import { useAsync } from '@/hooks/useAsync';
import { isLive } from '@/services/config';
import { rewardsService } from '@/services/rewards';
import { readJSON, writeJSON } from '@/services/storage';
import type { LoyaltyAccount } from '@/types';

const PHONE_KEY = 'loyalty-phone';

function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function LoyaltyCard({ account, onSignOut }: { account: LoyaltyAccount; onSignOut: () => void }) {
  const progress = account.nextTier ? account.points / (account.points + account.nextTier.pointsNeeded) : 1;
  return (
    <View className="overflow-hidden rounded-3xl border border-gold/40 bg-ink-700 p-5">
      <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10" />
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-black uppercase tracking-[3px] text-gold">Game On Rewards</Text>
        <Text onPress={onSignOut} className="text-xs font-semibold text-muted">
          Not you?
        </Text>
      </View>
      <Text className="mt-2 text-lg text-chalk">
        Hey {account.firstName} <Text className="text-muted">· ••{account.phoneLast4}</Text>
      </Text>
      <View className="mt-3 flex-row items-end gap-2">
        <Text className="text-5xl font-black text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
          {account.points.toLocaleString()}
        </Text>
        <Text className="mb-2 text-base font-semibold text-muted">points</Text>
      </View>
      <View className="mt-2 flex-row items-center gap-2">
        <Award size={16} color={colors.gold} />
        <Text className="font-bold text-gold">{account.tier}</Text>
      </View>
      <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-500">
        <View className="h-full rounded-full bg-gold" style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>
      <Text className="mt-1.5 text-xs text-muted">
        {account.nextTier ? `${account.nextTier.pointsNeeded} points to ${account.nextTier.name}` : 'Top tier - legend status.'}
      </Text>

      {account.availableRewards.length > 0 ? (
        <View className="mt-4 gap-2">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-muted">Ready to redeem at the register</Text>
          {account.availableRewards.map((r) => (
            <View key={r.id} className="flex-row items-center justify-between rounded-xl bg-ink-800 px-3 py-2.5">
              <View className="flex-row items-center gap-2">
                <Star size={14} color={colors.gold} />
                <Text className="font-semibold text-chalk">{r.name}</Text>
              </View>
              <Text className="text-xs font-bold text-muted">{r.pointsCost} pts</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function RewardsScreen() {
  const [phone, setPhone] = useState('');
  const [account, setAccount] = useState<LoyaltyAccount | null>();
  const [lookupError, setLookupError] = useState<string>();
  const [searching, setSearching] = useState(false);
  const coupons = useAsync(() => rewardsService.listCoupons());
  const redeemed = useAsync(() => rewardsService.redeemedIds());

  const lookup = useCallback(async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 10) {
      setLookupError('Enter the 10-digit phone number you use at the bar.');
      return;
    }
    setLookupError(undefined);
    setSearching(true);
    try {
      const result = await rewardsService.lookupByPhone(digits);
      setAccount(result);
      if (result) await writeJSON(PHONE_KEY, digits);
      else setLookupError("We couldn't find rewards for that number. Ask your server to enroll you on your next visit!");
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Lookup failed.');
    } finally {
      setSearching(false);
    }
  }, []);

  // Returning guests: auto-load the last number used on this device.
  useEffect(() => {
    void readJSON<string | null>(PHONE_KEY, null).then((saved) => {
      if (saved) {
        setPhone(formatPhone(saved));
        void lookup(saved);
      }
    });
  }, [lookup]);

  // Refresh "redeemed" state when coming back from the QR modal.
  const { reload: reloadRedeemed } = redeemed;
  useFocusEffect(
    useCallback(() => {
      void reloadRedeemed();
    }, [reloadRedeemed]),
  );

  const signOut = () => {
    setAccount(undefined);
    setPhone('');
    void writeJSON(PHONE_KEY, null);
  };

  return (
    <Screen title="Rewards" subtitle="Points, perks & your digital coupon stash">
      {account ? (
        <LoyaltyCard account={account} onSignOut={signOut} />
      ) : (
        <Card>
          <Text className="text-lg font-extrabold text-chalk">Check your points</Text>
          <Text className="mt-0.5 text-sm text-muted">Use the phone number linked to your Toast rewards account.</Text>
          <View className="mt-3 h-12 flex-row items-center gap-2 rounded-xl border border-ink-500 bg-ink-700 px-3">
            <Phone size={16} color={colors.muted} />
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(formatPhone(t))}
              placeholder="(513) 555-0142"
              placeholderTextColor={colors.ink500}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              returnKeyType="search"
              onSubmitEditing={() => void lookup(phone)}
              className="flex-1 text-base text-chalk"
              accessibilityLabel="Phone number"
            />
          </View>
          {lookupError ? <Text className="mt-2 text-sm text-red-400">{lookupError}</Text> : null}
          <Button label="Look up rewards" icon={Search} loading={searching} onPress={() => void lookup(phone)} className="mt-3" />
          {!isLive ? (
            <Text className="mt-2 text-center text-xs text-muted">
              Demo mode: try {formatPhone(DEMO_PHONE)} or any 10-digit number.
            </Text>
          ) : null}
        </Card>
      )}

      <View>
        <SectionHeader title="Coupon Stash" />
        {coupons.error ? (
          <ErrorState error={coupons.error} onRetry={coupons.reload} />
        ) : !coupons.data ? (
          <LoadingState />
        ) : (
          <View className="gap-3">
            {coupons.data.map((c) => (
              <CouponCard
                key={c.id}
                coupon={c}
                redeemed={redeemed.data?.includes(c.id) ?? false}
                onRedeem={() => router.push({ pathname: '/coupon/[id]', params: { id: c.id } })}
              />
            ))}
          </View>
        )}
        <Text className="mt-3 text-center text-xs text-muted">
          Show the QR to your server or bartender. Codes expire 10 minutes after you tap Redeem.
        </Text>
      </View>
    </Screen>
  );
}
