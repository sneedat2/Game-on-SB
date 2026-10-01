// SAMPLE DATA - generated relative to "now" so the countdown banner always has an upcoming game.
// Real schedules should be loaded into the gameday_events table (manually or via a sports data feed).
import type { GamedayEvent } from '@/types';
import { barLocalDate, daysUntilWeekday } from '@/lib/time';

const bucketSpecials = ['$20 domestic buckets', '$3 souvenir cup refills', '50¢ wings during the game'];

export function buildMockGamedayEvents(now: Date = new Date()): GamedayEvent[] {
  const next = (weekday: number, hour: number, minute = 0) => {
    let days = daysUntilWeekday(weekday, now);
    // If today's game has already kicked off long ago, roll to next week.
    if (days === 0 && barLocalDate(0, hour, minute, now).getTime() < now.getTime() - 4 * 3600_000) days = 7;
    return barLocalDate(days, hour, minute, now).toISOString();
  };

  return [
    { id: 'g1', team: 'bengals', opponent: 'Steelers', homeAway: 'home', startsAt: next(0, 13), broadcast: 'CBS', specials: bucketSpecials },
    { id: 'g2', team: 'bearcats', opponent: 'Kansas State', homeAway: 'home', startsAt: next(6, 15, 30), broadcast: 'ESPN2', specials: ['$15 seltzer buckets', 'Free app with any bucket'] },
    { id: 'g3', team: 'fcc', opponent: 'Columbus Crew', homeAway: 'away', startsAt: next(3, 19, 30), broadcast: 'Apple TV', specials: ['$5 Rhinegeist Truth pints', '$3 souvenir cup refills'] },
    { id: 'g4', team: 'reds', opponent: 'Cubs', homeAway: 'home', startsAt: next(5, 19, 10), broadcast: 'FanDuel Sports Ohio', specials: ['$4 domestic drafts', 'Half-off pretzel sticks'] },
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) as GamedayEvent[];
}
