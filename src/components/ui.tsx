import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
  onRefresh,
  refreshing = false,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16, gap: 20 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} /> : undefined
      }
    >
      {title ? (
        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-black tracking-tight text-chalk">{title}</Text>
            {subtitle ? <Text className="mt-1 text-sm text-muted">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-ink-600 bg-ink-800 p-4 ${className}`}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-lg font-extrabold text-chalk">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-sm font-semibold text-brand">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled,
  loading,
  className = '',
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const styles: Record<ButtonVariant, { box: string; text: string; icon: string }> = {
    primary: { box: 'bg-brand', text: 'text-ink', icon: colors.onBrand },
    secondary: { box: 'bg-ink-700 border border-ink-500', text: 'text-chalk', icon: colors.chalk },
    ghost: { box: 'bg-transparent', text: 'text-brand', icon: colors.brand },
  };
  const s = styles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80 ${s.box} ${
        disabled ? 'opacity-40' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={s.icon} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={s.icon} /> : null}
          <Text className={`text-base font-bold ${s.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-4 py-2 ${active ? 'border-brand bg-brand' : 'border-ink-500 bg-ink-800'}`}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-ink' : 'text-chalk'}`}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-xl bg-ink-800 p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center rounded-lg py-2.5 ${active ? 'bg-brand' : ''}`}
          >
            <Text className={`text-sm font-bold ${active ? 'text-ink' : 'text-muted'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'brand' | 'gold' | 'turf' }) {
  const tones = {
    neutral: 'bg-ink-600 text-chalk',
    brand: 'bg-brand/20 text-brand-light',
    gold: 'bg-gold/20 text-gold',
    turf: 'bg-turf/20 text-turf',
  };
  return (
    <Text className={`overflow-hidden rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {label}
    </Text>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="items-center justify-center py-10">
      <ActivityIndicator color={colors.brand} />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <Card className="items-center">
      <Text className="text-center font-semibold text-chalk">Something went wrong</Text>
      <Text className="mt-1 text-center text-sm text-muted">{error.message}</Text>
      {onRetry ? <Button label="Try again" variant="ghost" onPress={onRetry} className="mt-2" /> : null}
    </Card>
  );
}
