import { CheckCircle2, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { checkIn, CheckinError, checkinSupported, getCheckinStatus } from '@/services/checkin';
import { Button, Card } from './ui';

const visitsLabel = (n: number) => `${n} visit${n === 1 ? '' : 's'}`;

/** Daily "I'm at Game On" check-in. One per day, only at the bar. */
export function CheckinCard() {
  const status = useAsync(() => getCheckinStatus());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [justNow, setJustNow] = useState<{ visits: number } | null>(null);

  // No server (local dev) or check-ins turned off in the admin: don't show the card.
  if (status.data === null || (status.data && !status.data.enabled)) return null;

  const checkedIn = Boolean(justNow) || Boolean(status.data?.checkedInToday);
  const visits = justNow?.visits ?? status.data?.visits ?? 0;

  const onCheckIn = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await checkIn();
      setJustNow({ visits: result.visits });
    } catch (e) {
      setError(e instanceof CheckinError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={checkedIn ? 'border-turf/50' : 'border-brand/60'}>
      <View className="flex-row items-center gap-3">
        <View className={`h-12 w-12 items-center justify-center rounded-2xl ${checkedIn ? 'bg-turf/20' : 'bg-brand'}`}>
          {checkedIn ? <CheckCircle2 size={24} color={colors.turf} /> : <MapPin size={24} color={colors.onBrand} />}
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-chalk">
            {checkedIn ? (justNow ? 'You’re checked in! 🍻' : 'Checked in today ✓') : 'At Game On? Check in'}
          </Text>
          <Text className="text-sm text-muted">
            {checkedIn
              ? `${visitsLabel(visits)} so far - see you next time.`
              : visits > 0
                ? `Once a day when you’re here · ${visitsLabel(visits)} so far`
                : 'Once a day when you’re at the bar. Check-in perks are coming soon!'}
          </Text>
        </View>
      </View>

      {!checkedIn && status.data ? (
        checkinSupported() ? (
          <Button label={busy ? 'Finding you…' : 'Check in'} icon={MapPin} loading={busy} onPress={() => void onCheckIn()} className="mt-4" />
        ) : (
          <Text className="mt-3 text-sm text-muted">Check-in is available on the Game On website for now - it’s coming to the phone app soon.</Text>
        )
      ) : null}

      {error ? <Text className="mt-3 text-sm text-red-400">{error}</Text> : null}
      {status.error ? <Text className="mt-3 text-sm text-red-400">{status.error.message}</Text> : null}
      {!checkedIn && !error ? (
        <Text className="mt-2 text-xs text-muted">We only use your location to confirm you’re at the bar.</Text>
      ) : null}
    </Card>
  );
}
