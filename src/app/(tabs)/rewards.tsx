import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { CouponCard } from '@/components/CouponCard';
import { RewardsLookupCard } from '@/components/RewardsLookupCard';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { rewardsService } from '@/services/rewards';

export default function RewardsScreen() {
  const coupons = useAsync(() => rewardsService.listCoupons());
  const redeemed = useAsync(() => rewardsService.redeemedIds());

  // Refresh "redeemed" state when coming back from the QR modal.
  const { reload: reloadRedeemed } = redeemed;
  useFocusEffect(
    useCallback(() => {
      void reloadRedeemed();
    }, [reloadRedeemed]),
  );

  return (
    <Screen title="Rewards" subtitle="Your points, check-ins & coupon stash">
      <RewardsLookupCard />

      <CheckinCard />

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
