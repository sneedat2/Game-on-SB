import { TimerOff } from 'lucide-react-native';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatMinSec } from '@/lib/time';
import type { RedemptionCode } from '@/types';

/** Timed QR: server-issued code, encoded for staff to scan; the short code is the fallback. */
export function RedemptionQR({ redemption }: { redemption: RedemptionCode }) {
  const now = useNow();
  const expiresAt = new Date(redemption.expiresAt).getTime();
  const issuedAt = new Date(redemption.issuedAt).getTime();
  const msLeft = expiresAt - now.getTime();
  const expired = msLeft <= 0;
  const progress = Math.max(0, Math.min(1, msLeft / (expiresAt - issuedAt)));

  return (
    <View className="items-center">
      <View className="rounded-3xl bg-white p-5">
        {expired ? (
          <View className="h-[220px] w-[220px] items-center justify-center">
            <TimerOff size={48} color={colors.ink500} />
            <Text className="mt-3 text-center font-bold text-ink-700">Code expired</Text>
          </View>
        ) : (
          <QRCode value={redemption.payload} size={220} color="#0B0F14" backgroundColor="#FFFFFF" ecl="M" />
        )}
      </View>

      <Text className="mt-5 text-xs font-bold uppercase tracking-[3px] text-muted">Or give your server this code</Text>
      <Text
        selectable
        className={`mt-1 text-4xl font-black tracking-[4px] ${expired ? 'text-muted line-through' : 'text-chalk'}`}
      >
        {redemption.code}
      </Text>

      <View className="mt-5 h-2 w-64 overflow-hidden rounded-full bg-ink-600">
        <View className={`h-full rounded-full ${progress < 0.2 ? 'bg-red-500' : 'bg-turf'}`} style={{ width: `${progress * 100}%` }} />
      </View>
      <Text className="mt-2 text-sm text-muted" style={{ fontVariant: ['tabular-nums'] }}>
        {expired ? 'This code can no longer be used.' : `Valid for ${formatMinSec(msLeft)}`}
      </Text>
    </View>
  );
}
