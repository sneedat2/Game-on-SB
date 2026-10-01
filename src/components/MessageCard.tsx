import { Megaphone } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

/** Custom announcement on the Home screen (/admin → Home Page → message card). */
export function MessageCard({ title, text, style }: { title: string; text: string; style: 'yellow' | 'dark' }) {
  const yellow = style === 'yellow';
  return (
    <View className={`flex-row gap-3 rounded-3xl border p-5 ${yellow ? 'border-brand bg-brand' : 'border-ink-600 bg-ink-800'}`}>
      <Megaphone size={22} color={yellow ? colors.onBrand : colors.brand} />
      <View className="flex-1">
        {title ? <Text className={`text-lg font-black ${yellow ? 'text-ink' : 'text-chalk'}`}>{title}</Text> : null}
        {text ? <Text className={`${title ? 'mt-1' : ''} text-base ${yellow ? 'text-ink' : 'text-muted'}`}>{text}</Text> : null}
      </View>
    </View>
  );
}
