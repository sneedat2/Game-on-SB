import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { categoryLabels, PollCard } from '@/components/PollCard';
import { ShowcaseCard } from '@/components/ShowcaseCard';
import { Chip, ErrorState, LoadingState, Screen, Segmented } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { pollsService } from '@/services/polls';
import type { PollCategory } from '@/types';

const filters: ('all' | PollCategory)[] = ['all', 'food', 'drinks', 'events', 'debates'];

export default function PollsScreen() {
  const [view, setView] = useState<'vote' | 'showcase'>('vote');
  const [filter, setFilter] = useState<'all' | PollCategory>('all');

  const polls = useAsync(async () => {
    const { polls: list, mine } = await pollsService.load();
    return { list, mine };
  });
  const showcase = useAsync(() => pollsService.showcase());

  // Fresh vote counts (and newly added polls) each time the tab is opened again.
  const { reload: reloadPolls } = polls;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reloadPolls();
    }, [reloadPolls]),
  );

  const visible = useMemo(
    () => (polls.data?.list ?? []).filter((p) => filter === 'all' || p.category === filter),
    [polls.data, filter],
  );
  const votedCount = polls.data ? Object.keys(polls.data.mine).length : 0;

  const vote = async (pollId: string, optionId: string) => {
    try {
      const updated = await pollsService.vote(pollId, optionId);
      polls.setData(
        (prev) =>
          prev && {
            list: prev.list.map((p) => (p.id === pollId ? updated : p)),
            mine: { ...prev.mine, [pollId]: optionId },
          },
      );
    } catch (e) {
      Alert.alert("Couldn't record your vote", e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <Screen
      title="Game On Wants to Know"
      subtitle="You vote. We pour it, cook it, or book it."
      refreshing={polls.loading && Boolean(polls.data)}
      onRefresh={() => {
        void polls.reload();
        void showcase.reload();
      }}
    >
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'vote', label: 'Vote Now' },
          { value: 'showcase', label: 'We Made It Happen' },
        ]}
      />

      {view === 'vote' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.map((f) => (
              <Chip key={f} label={f === 'all' ? 'All' : categoryLabels[f]} active={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>

          {polls.data && votedCount > 0 ? (
            <Text className="text-sm text-muted">
              You’ve voted in <Text className="font-bold text-brand">{votedCount}</Text> of {polls.data.list.length} active polls.
            </Text>
          ) : null}

          {polls.error ? (
            <ErrorState error={polls.error} onRetry={polls.reload} />
          ) : !polls.data ? (
            <LoadingState label="Loading polls…" />
          ) : visible.length === 0 ? (
            <Text className="py-8 text-center text-muted">No open polls in this category - check back soon.</Text>
          ) : (
            visible.map((p) => <PollCard key={p.id} poll={p} myChoice={polls.data?.mine[p.id]} onVote={vote} />)
          )}
        </>
      ) : showcase.error ? (
        <ErrorState error={showcase.error} onRetry={showcase.reload} />
      ) : !showcase.data ? (
        <LoadingState />
      ) : (
        <>
          <Text className="text-sm text-muted">Poll winners that made it off the app and into the bar.</Text>
          {showcase.data.map((item) => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </>
      )}
    </Screen>
  );
}
