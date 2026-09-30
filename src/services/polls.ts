import type { Poll, ShowcaseItem } from '@/types';
import { seedPolls, showcase as mockShowcase } from '@/data/mock/polls';
import { apiFetch, ApiError, ApiUnavailable, getDeviceId } from './api';
import { loadContent } from './content';
import { mockDelay, readJSON, writeJSON } from './storage';

/** pollId -> optionId the current guest picked. */
export type MyVotes = Record<string, string>;

export interface PollsService {
  /** Open polls plus this device's votes, in one call. */
  load(): Promise<{ polls: Poll[]; mine: MyVotes }>;
  /** Casts a vote and returns the updated poll (with fresh counts). */
  vote(pollId: string, optionId: string): Promise<Poll>;
  showcase(): Promise<ShowcaseItem[]>;
}

// Polls are created at /admin and votes are counted on the server (one per phone). Without the
// server (local dev), the sample polls below are used and votes stay on this device.

// ---------------- Fallback (no server) ----------------

const VOTES_KEY = 'poll-votes';

async function mockLoad() {
  await mockDelay();
  const mine = await readJSON<MyVotes>(VOTES_KEY, {});
  const polls = seedPolls.map((p) => ({
    ...p,
    options: p.options.map((o) => ({ ...o, votes: o.votes + (mine[p.id] === o.id ? 1 : 0) })),
  }));
  return { polls, mine };
}

async function mockVote(pollId: string, optionId: string): Promise<Poll> {
  await mockDelay(250);
  const mine = await readJSON<MyVotes>(VOTES_KEY, {});
  if (mine[pollId]) throw new Error('You already voted in this poll.');
  const poll = seedPolls.find((p) => p.id === pollId);
  if (!poll) throw new Error('Poll not found');
  await writeJSON(VOTES_KEY, { ...mine, [pollId]: optionId });
  return { ...poll, options: poll.options.map((o) => ({ ...o, votes: o.votes + (o.id === optionId ? 1 : 0) })) };
}

// ---------------- Service ----------------

let usingServer: boolean | null = null;

export const pollsService: PollsService = {
  async load() {
    try {
      const device = await getDeviceId();
      const res = await apiFetch<{ polls: Poll[]; myVotes: MyVotes }>(`/api/polls?device=${encodeURIComponent(device)}`);
      usingServer = true;
      return { polls: res.polls, mine: res.myVotes };
    } catch (e) {
      if (!(e instanceof ApiUnavailable)) throw e;
      usingServer = false;
      return mockLoad();
    }
  },

  async vote(pollId, optionId) {
    if (usingServer === false) return mockVote(pollId, optionId);
    try {
      return await apiFetch<Poll>(`/api/polls/${encodeURIComponent(pollId)}/vote`, {
        method: 'POST',
        body: JSON.stringify({ deviceId: await getDeviceId(), optionId }),
      });
    } catch (e) {
      if (e instanceof ApiError) throw new Error(e.message);
      throw new Error('Couldn’t reach Game On - check your connection and try again.');
    }
  },

  async showcase() {
    const content = await loadContent();
    if (content) return content.showcase;
    await mockDelay();
    return mockShowcase;
  },
};
