// Upcoming Cincinnati games, pulled automatically from ESPN's public schedule feed (no key needed).
// It's an unofficial feed, so failures fall back to the last good copy (or just manual games).
// Specials per team are set in /admin → Gameday.

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const CACHE_MS = 60 * 60_000; // schedules change rarely; refresh hourly
const LIVE_WINDOW_MS = 4 * 3600_000; // keep a game up for ~4h after kickoff

// Each team: ESPN schedule URLs to merge (regular season/fixtures + postseason).
const TEAM_FEEDS = {
  bengals: [`${ESPN}/football/nfl/teams/cin/schedule`, `${ESPN}/football/nfl/teams/cin/schedule?seasontype=3`],
  bearcats: [`${ESPN}/football/college-football/teams/2132/schedule`, `${ESPN}/football/college-football/teams/2132/schedule?seasontype=3`],
  reds: [`${ESPN}/baseball/mlb/teams/cin/schedule?seasontype=2`, `${ESPN}/baseball/mlb/teams/cin/schedule?seasontype=3`],
  fcc: [`${ESPN}/soccer/usa.1/teams/18267/schedule?fixture=true`],
};
const ESPN_TEAM_IDS = { bengals: '4', bearcats: '2132', reds: '17', fcc: '18267' };

let cache = null; // { at, games }
let inflight = null;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function broadcastOf(competition) {
  const names = (competition.broadcasts ?? [])
    .map((b) => b.media?.shortName ?? (Array.isArray(b.names) ? b.names[0] : undefined))
    .filter((n) => n && !/\.TV$/i.test(n)); // skip streaming-only labels like "MLB.TV"
  return [...new Set(names)].slice(0, 2).join(' / ') || undefined;
}

function toGame(team, event) {
  const competition = event.competitions?.[0];
  if (!competition) return null;
  const state = competition.status?.type?.state;
  if (state === 'post') return null;
  const us = competition.competitors?.find((c) => String(c.team?.id ?? c.id) === ESPN_TEAM_IDS[team]);
  const them = competition.competitors?.find((c) => c !== us);
  if (!us || !them) return null;
  return {
    id: `espn-${event.id}`,
    team,
    opponent: them.team?.shortDisplayName || them.team?.location || them.team?.displayName || 'TBD',
    homeAway: us.homeAway === 'away' ? 'away' : 'home',
    startsAt: new Date(event.date).toISOString(),
    timeTBA: competition.timeValid === false || event.timeValid === false || undefined,
    broadcast: broadcastOf(competition),
    auto: true,
  };
}

async function loadAll() {
  const games = [];
  await Promise.all(
    Object.entries(TEAM_FEEDS).map(async ([team, urls]) => {
      for (const url of urls) {
        try {
          const data = await fetchJson(url);
          for (const event of data.events ?? []) {
            const game = toGame(team, event);
            if (game && !games.some((g) => g.id === game.id)) games.push(game);
          }
        } catch (e) {
          console.warn(`[schedule] ${team} feed failed (${url}):`, e.message);
        }
      }
    }),
  );
  return games;
}

/** Upcoming (and in-progress) games for all local teams, soonest first. Never throws. */
export async function upcomingAutoGames() {
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    inflight ??= loadAll()
      .then((games) => {
        // Keep the previous copy if every feed failed this time.
        if (games.length > 0 || !cache) cache = { at: Date.now(), games };
        else cache.at = Date.now() - CACHE_MS + 5 * 60_000; // retry in ~5 min
      })
      .catch((e) => console.warn('[schedule]', e.message))
      .finally(() => {
        inflight = null;
      });
    await inflight;
  }
  const since = Date.now() - LIVE_WINDOW_MS;
  return (cache?.games ?? []).filter((g) => Date.parse(g.startsAt) > since);
}
