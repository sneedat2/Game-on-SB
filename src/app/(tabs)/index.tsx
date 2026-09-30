import { router } from 'expo-router';
import { View } from 'react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { FlashDealWidget } from '@/components/FlashDealWidget';
import { GamedayBanner } from '@/components/GamedayBanner';
import { PollCard } from '@/components/PollCard';
import { QuickActions } from '@/components/QuickActions';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { gamedayService } from '@/services/gameday';
import { pollsService } from '@/services/polls';

export default function HomeScreen() {
  const games = useAsync(() => gamedayService.upcoming(4));
  const polls = useAsync(async () => {
    const [list, mine] = await Promise.all([pollsService.listActive(), pollsService.myVotes()]);
    return { poll: list.find((p) => p.featured) ?? list[0], mine };
  });

  const vote = async (pollId: string, optionId: string) => {
    const updated = await pollsService.vote(pollId, optionId);
    polls.setData((prev) => prev && { poll: updated, mine: { ...prev.mine, [pollId]: optionId } });
  };

  const refresh = () => {
    void games.reload();
    void polls.reload();
  };

  return (
    <Screen refreshing={games.loading && Boolean(games.data)} onRefresh={refresh}>
      <BrandHeader />

      {games.error ? (
        <ErrorState error={games.error} onRetry={games.reload} />
      ) : games.data ? (
        <GamedayBanner events={games.data} />
      ) : (
        <LoadingState label="Checking the schedule…" />
      )}

      <FlashDealWidget />

      <QuickActions />

      <View>
        <SectionHeader title="Game On Wants to Know" action="All polls" onAction={() => router.push('/polls')} />
        {polls.data?.poll ? (
          <PollCard poll={polls.data.poll} myChoice={polls.data.mine[polls.data.poll.id]} onVote={vote} />
        ) : polls.error ? (
          <ErrorState error={polls.error} onRetry={polls.reload} />
        ) : (
          <LoadingState />
        )}
      </View>
    </Screen>
  );
}
