import { router } from 'expo-router';
import { View } from 'react-native';
import { BrandHeader } from '@/components/BrandHeader';
import { GamedayBanner } from '@/components/GamedayBanner';
import { HappyHourCard } from '@/components/HappyHourCard';
import { MessageCard } from '@/components/MessageCard';
import { PollCard } from '@/components/PollCard';
import { PromoCard } from '@/components/PromoCard';
import { QuickActions } from '@/components/QuickActions';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { gamedayService } from '@/services/gameday';
import { useHomeLayout } from '@/services/homeLayout';
import { pollsService } from '@/services/polls';
import type { HomeBlock } from '@/types';

export default function HomeScreen() {
  const layout = useHomeLayout();
  const games = useAsync(() => gamedayService.upcoming(4));
  const polls = useAsync(async () => {
    const { polls: list, mine } = await pollsService.load();
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

  // Order, visibility and labels come from /admin → Home Page.
  const renderBlock = (block: HomeBlock) => {
    switch (block.type) {
      case 'header':
        return <BrandHeader key={block.id} />;
      case 'happyHour':
        return <HappyHourCard key={block.id} title={block.title} />;
      case 'promos':
        return <PromoCard key={block.id} title={block.title} />;
      case 'gameday':
        return games.error ? (
          <ErrorState key={block.id} error={games.error} onRetry={games.reload} />
        ) : games.data ? (
          <GamedayBanner key={block.id} events={games.data} />
        ) : (
          <LoadingState key={block.id} label="Checking the schedule…" />
        );
      case 'quickActions':
        return <QuickActions key={block.id} buttons={block.buttons} />;
      case 'poll':
        return (
          <View key={block.id}>
            <SectionHeader title={block.title} action="All polls" onAction={() => router.push('/polls')} />
            {polls.data?.poll ? (
              <PollCard poll={polls.data.poll} myChoice={polls.data.mine[polls.data.poll.id]} onVote={vote} />
            ) : polls.error ? (
              <ErrorState error={polls.error} onRetry={polls.reload} />
            ) : (
              <LoadingState />
            )}
          </View>
        );
      case 'message':
        return <MessageCard key={block.id} title={block.title} text={block.text} style={block.style} />;
      default:
        return null;
    }
  };

  return (
    <Screen refreshing={games.loading && Boolean(games.data)} onRefresh={refresh}>
      {layout.blocks.filter((b) => b.visible).map(renderBlock)}
    </Screen>
  );
}
