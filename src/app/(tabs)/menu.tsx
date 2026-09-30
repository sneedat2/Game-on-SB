import { router, useLocalSearchParams } from 'expo-router';
import { Beer, ShoppingBag, UtensilsCrossed, Vote } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, ErrorState, LoadingState, Screen, Segmented, Tag } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { menuService } from '@/services/menu';
import { openOnlineOrdering } from '@/services/ordering';
import type { ComingSoonItem, MenuItem, MenuSection, MenuSectionId } from '@/types';

const money = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;
const tagTone = (t: string) => (t === 'Local' ? 'turf' : t === 'Fan Pick' || t === 'New' ? 'gold' : t === 'Spicy' ? 'brand' : 'neutral');

function MenuRow({ item, last }: { item: MenuItem; last: boolean }) {
  return (
    <View className={`flex-row gap-3 py-3 ${last ? '' : 'border-b border-ink-600'} ${item.soldOut ? 'opacity-50' : ''}`}>
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="text-base font-bold text-chalk">{item.name}</Text>
          {item.soldOut ? <Tag label="Sold Out" tone="neutral" /> : null}
          {item.tags?.map((t) => <Tag key={t} label={t} tone={tagTone(t)} />)}
        </View>
        {item.description ? <Text className="mt-0.5 text-sm text-muted">{item.description}</Text> : null}
      </View>
      {item.sizes ? (
        <View className="items-end gap-0.5">
          {item.sizes.map((p) => (
            <Text key={p.label} className="text-sm text-chalk" style={{ fontVariant: ['tabular-nums'] }}>
              <Text className="text-xs text-muted">{p.label} </Text>
              {money(p.price)}
            </Text>
          ))}
        </View>
      ) : item.price !== undefined ? (
        <Text className="text-base font-bold text-chalk">{money(item.price)}</Text>
      ) : null}
    </View>
  );
}

function ComingSoonCard({ item }: { item: ComingSoonItem }) {
  const Icon = item.kind === 'food' ? UtensilsCrossed : Beer;
  return (
    <Card>
      <View className="flex-row gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-ink-600">
          <Icon size={22} color={item.kind === 'food' ? colors.brand : colors.gold} />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Tag label={item.eta} tone="neutral" />
            {item.fromPoll ? <Tag label="Fan Pick" tone="gold" /> : null}
          </View>
          <Text className="mt-1.5 text-lg font-extrabold text-chalk">{item.title}</Text>
          <Text className="mt-0.5 text-sm text-muted">{item.description}</Text>
        </View>
      </View>
    </Card>
  );
}

type MenuView = 'food' | 'bar' | 'soon';

// Food tab carries non-alcoholic Beverages; alcohol lives on its own Bar tab.
const sectionKindsFor: Record<Exclude<MenuView, 'soon'>, MenuSection['kind'][]> = {
  food: ['food', 'beverage'],
  bar: ['alcohol'],
};

const isMenuView = (v: string | undefined): v is MenuView => v === 'food' || v === 'bar' || v === 'soon';

export default function MenuScreen() {
  const params = useLocalSearchParams<{ view?: string; section?: MenuSectionId; t?: string }>();
  const [view, setViewState] = useState<MenuView>(isMenuView(params.view) ? params.view : 'food');
  const [section, setSection] = useState<'all' | MenuSectionId>(params.section ?? 'all');
  const menu = useAsync(() => menuService.getMenu());
  const soon = useAsync(() => menuService.getComingSoon());

  const setView = (next: MenuView) => {
    setViewState(next);
    setSection('all'); // section chips differ per tab
  };

  // Deep links like "View Tap List" (?view=bar&section=draft&t=<nonce>) can arrive while this tab
  // is already mounted. Adjust state during render when the nonce changes (no effect needed).
  const [seenNonce, setSeenNonce] = useState(params.t);
  if (params.t !== seenNonce) {
    setSeenNonce(params.t);
    if (isMenuView(params.view)) {
      setViewState(params.view);
      setSection(params.section ?? 'all');
    }
  }

  const tabSections = useMemo(() => {
    if (!menu.data || view === 'soon') return [];
    const withItems = new Set(menu.data.items.map((i) => i.sectionId));
    return menu.data.sections.filter((s) => sectionKindsFor[view].includes(s.kind) && withItems.has(s.id));
  }, [menu.data, view]);

  // A deep-linked section (e.g. "draft") may be empty on this menu - show everything instead.
  const activeSection = tabSections.some((s) => s.id === section) ? section : 'all';

  const grouped = useMemo(() => {
    if (!menu.data) return [];
    return tabSections
      .filter((s) => activeSection === 'all' || s.id === activeSection)
      .map((s) => ({ section: s, items: menu.data!.items.filter((i) => i.sectionId === s.id) }))
      .filter((g) => g.items.length > 0);
  }, [menu.data, tabSections, activeSection]);

  return (
    <Screen
      title="Menu"
      subtitle="Apps, wings & cold drinks"
      refreshing={(menu.loading && Boolean(menu.data)) || (soon.loading && Boolean(soon.data))}
      onRefresh={() => {
        void menu.reload();
        void soon.reload();
      }}
    >
      <Button label="Order Online for Pickup" icon={ShoppingBag} onPress={() => void openOnlineOrdering()} />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'food', label: 'Food' },
          { value: 'bar', label: 'Bar 21+' },
          { value: 'soon', label: 'Coming Soon' },
        ]}
      />

      {view !== 'soon' ? (
        <>
          {menu.data ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="All" active={activeSection === 'all'} onPress={() => setSection('all')} />
              {tabSections.map((s) => (
                <Chip key={s.id} label={s.title} active={activeSection === s.id} onPress={() => setSection(s.id)} />
              ))}
            </ScrollView>
          ) : null}

          {menu.data?.live ? (
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-turf" />
              <Text className="text-xs text-muted">Live menu · prices & sold-out items update automatically</Text>
            </View>
          ) : null}

          {view === 'bar' ? (
            <Text className="text-xs text-muted">Must be 21+ with valid ID. Please drink responsibly.</Text>
          ) : null}

          {menu.error ? (
            <ErrorState error={menu.error} onRetry={menu.reload} />
          ) : !menu.data ? (
            <LoadingState label="Loading the menu…" />
          ) : grouped.length === 0 ? (
            <Card className="items-center py-8">
              <Beer size={28} color={colors.brand} />
              <Text className="mt-3 text-center text-lg font-extrabold text-chalk">Our drink list is on its way</Text>
              <Text className="mt-1 text-center text-sm text-muted">Ask your bartender what’s pouring today.</Text>
            </Card>
          ) : (
            grouped.map(({ section: s, items }) => (
              <Card key={s.id}>
                <Text className="mb-1 text-xl font-black text-chalk">{s.title}</Text>
                {s.blurb ? <Text className="text-sm text-brand-light">{s.blurb}</Text> : null}
                {items.map((item, i) => (
                  <MenuRow key={item.id} item={item} last={i === items.length - 1} />
                ))}
              </Card>
            ))
          )}
        </>
      ) : soon.error ? (
        <ErrorState error={soon.error} onRetry={soon.reload} />
      ) : !soon.data ? (
        <LoadingState label="Peeking in the kitchen…" />
      ) : (
        <>
          <Text className="text-sm text-muted">New food & drinks on the way to Game On.</Text>
          {soon.data.map((item) => (
            <ComingSoonCard key={item.id} item={item} />
          ))}
          <Button label="Help pick what's next" icon={Vote} variant="secondary" onPress={() => router.push('/polls')} />
        </>
      )}
    </Screen>
  );
}
