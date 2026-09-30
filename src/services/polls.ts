import type { Poll, ShowcaseItem } from '@/types';
import { seedPolls, showcase as mockShowcase } from '@/data/mock/polls';
import { isLive } from './config';
import { mockDelay, readJSON, writeJSON } from './storage';
import { ensureSession, supabase } from './supabase';

/** pollId -> optionId the current guest picked. */
export type MyVotes = Record<string, string>;

export interface PollsService {
  listActive(): Promise<Poll[]>;
  myVotes(): Promise<MyVotes>;
  /** Casts a vote and returns the updated poll (with fresh counts). */
  vote(pollId: string, optionId: string): Promise<Poll>;
  showcase(): Promise<ShowcaseItem[]>;
  /** Live vote-count updates. Returns an unsubscribe function. */
  subscribe(onChange: (pollId: string) => void): () => void;
}

// ---------------- Mock ----------------

const VOTES_KEY = 'poll-votes';

const mockPolls: PollsService = {
  async listActive() {
    await mockDelay();
    const mine = await readJSON<MyVotes>(VOTES_KEY, {});
    // Fold the guest's own votes into the seed counts so percentages reflect them.
    return seedPolls.map((p) => ({
      ...p,
      options: p.options.map((o) => ({ ...o, votes: o.votes + (mine[p.id] === o.id ? 1 : 0) })),
    }));
  },
  myVotes: () => readJSON<MyVotes>(VOTES_KEY, {}),
  async vote(pollId, optionId) {
    await mockDelay(250);
    const mine = await readJSON<MyVotes>(VOTES_KEY, {});
    if (mine[pollId]) throw new Error('You already voted in this poll.');
    mine[pollId] = optionId;
    await writeJSON(VOTES_KEY, mine);
    const poll = seedPolls.find((p) => p.id === pollId);
    if (!poll) throw new Error('Poll not found');
    return {
      ...poll,
      options: poll.options.map((o) => ({ ...o, votes: o.votes + (o.id === optionId ? 1 : 0) })),
    };
  },
  async showcase() {
    await mockDelay();
    return mockShowcase;
  },
  subscribe() {
    return () => {};
  },
};

// ---------------- Live (Supabase) ----------------
// Tables/RPC defined in supabase/migrations/0001_init.sql. poll_options.votes is a counter kept in
// sync by a trigger on poll_votes; individual votes stay private under RLS.

interface PollRow {
  id: string;
  category: Poll['category'];
  question: string;
  closes_at: string;
  featured: boolean;
  poll_options: { id: string; label: string; emoji: string | null; votes: number; sort_order: number }[];
}

const toPoll = (r: PollRow): Poll => ({
  id: r.id,
  category: r.category,
  question: r.question,
  closesAt: r.closes_at,
  featured: r.featured,
  options: [...r.poll_options]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({ id: o.id, label: o.label, emoji: o.emoji ?? undefined, votes: o.votes })),
});

const POLL_SELECT = 'id, category, question, closes_at, featured, poll_options(id, label, emoji, votes, sort_order)';

const livePolls: PollsService = {
  async listActive() {
    const { data, error } = await supabase()
      .from('polls')
      .select(POLL_SELECT)
      .gt('closes_at', new Date().toISOString())
      .order('featured', { ascending: false })
      .order('closes_at');
    if (error) throw error;
    return (data as unknown as PollRow[]).map(toPoll);
  },
  async myVotes() {
    const uid = await ensureSession();
    const { data, error } = await supabase().from('poll_votes').select('poll_id, option_id').eq('user_id', uid);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((v) => [v.poll_id, v.option_id]));
  },
  async vote(pollId, optionId) {
    await ensureSession();
    const { error } = await supabase().rpc('cast_vote', { p_poll_id: pollId, p_option_id: optionId });
    if (error) throw error;
    const { data, error: fetchError } = await supabase().from('polls').select(POLL_SELECT).eq('id', pollId).single();
    if (fetchError) throw fetchError;
    return toPoll(data as unknown as PollRow);
  },
  async showcase() {
    const { data, error } = await supabase().from('showcase_items').select('*').order('launched_on', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      pollQuestion: r.poll_question,
      winningShare: r.winning_share,
      launchedOn: r.launched_on,
      status: r.status,
    }));
  },
  subscribe(onChange) {
    // Realtime honors RLS, so we listen to the public counters rather than private vote rows.
    const channel = supabase()
      .channel('poll-counts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poll_options' }, (payload) => {
        const pollId = (payload.new as { poll_id?: string }).poll_id;
        if (pollId) onChange(pollId);
      })
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  },
};

export const pollsService: PollsService = isLive ? livePolls : mockPolls;
