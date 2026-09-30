import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { RedemptionQR } from '@/components/RedemptionQR';
import { Button, ErrorState, LoadingState } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { rewardsService } from '@/services/rewards';
import type { RedemptionCode } from '@/types';

export default function CouponRedeemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const coupons = useAsync(() => rewardsService.listCoupons());
  const coupon = coupons.data?.find((c) => c.id === id);
  const [redemption, setRedemption] = useState<RedemptionCode>();
  const [error, setError] = useState<Error>();

  // Issue the code only after the guest confirms, so browsing the wallet never burns a coupon.
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!confirmed || !id) return;
    rewardsService
      .issueRedemption(id)
      .then(setRedemption)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, [confirmed, id]);

  if (coupons.error) return <ErrorState error={coupons.error} onRetry={coupons.reload} />;
  if (!coupons.data) return <LoadingState />;
  if (!coupon) {
    return (
      <View className="flex-1 items-center justify-center bg-ink p-6">
        <Text className="text-chalk">That coupon isn’t available anymore.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ink" contentContainerStyle={{ padding: 24, alignItems: 'center', gap: 16 }}>
      <Text className="text-center text-2xl font-black text-chalk">{coupon.title}</Text>
      <Text className="text-center text-sm text-muted">{coupon.description}</Text>

      {!confirmed ? (
        <View className="w-full gap-3 rounded-2xl border border-ink-600 bg-ink-800 p-5">
          <Text className="text-center text-base font-semibold text-chalk">Ready to use it?</Text>
          <Text className="text-center text-sm text-muted">
            Tap below when you’re with your server. You’ll get a QR code that’s valid for 10 minutes
            {coupon.singleUse ? ' and can only be used once' : ''}.
          </Text>
          <Button label="Show my code" onPress={() => setConfirmed(true)} />
          <Button label="Not yet" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : error ? (
        <ErrorState error={error} />
      ) : !redemption ? (
        <LoadingState label="Generating your code…" />
      ) : (
        <RedemptionQR redemption={redemption} />
      )}

      <Text className="mt-2 text-center text-xs text-muted">{coupon.finePrint}</Text>
    </ScrollView>
  );
}
