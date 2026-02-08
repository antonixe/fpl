import { fplFetch } from '@/lib/fpl-fetch';
import { logger } from '@/lib/logger';
import type { Player, Team, Fixture, GameWeek, ElementType } from '@/types/fpl';

export interface BootstrapData {
  elements: Player[];
  teams: Team[];
  events: GameWeek[];
  element_types: ElementType[];
}

/** Combined initial data shape passed to FPLProvider for SSR hydration */
export interface FPLInitialData {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  gameweeks: GameWeek[];
  elementTypes: ElementType[];
}

// ---- Server-side in-memory cache ----
// The FPL bootstrap-static endpoint returns ~2.5MB which exceeds Next.js's
// 2MB data cache limit. We cache it in-memory with a 5-minute TTL instead.

const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let bootstrapCache: { data: BootstrapData; timestamp: number } | null = null;
let fixturesCache: { data: Fixture[]; timestamp: number } | null = null;

function isValid<T>(cache: { data: T; timestamp: number } | null): cache is { data: T; timestamp: number } {
  return cache !== null && Date.now() - cache.timestamp < SERVER_CACHE_TTL;
}

/**
 * Fetch the FPL bootstrap-static data on the server with in-memory caching.
 * Uses fplFetch for timeout + retry resilience.
 */
export async function getBootstrapData(): Promise<BootstrapData> {
  if (isValid(bootstrapCache)) {
    logger.debug('bootstrap cache hit');
    return bootstrapCache.data;
  }

  const data = await logger.time('fetch bootstrap-static', () =>
    fplFetch<BootstrapData>('/bootstrap-static/', {
      cache: 'no-store',
    }),
    { source: 'fpl-server' }
  );

  bootstrapCache = { data, timestamp: Date.now() };
  return data;
}

/**
 * Fetch fixtures data on the server with in-memory caching.
 */
export async function getFixtures(): Promise<Fixture[]> {
  if (isValid(fixturesCache)) {
    logger.debug('fixtures cache hit');
    return fixturesCache.data;
  }

  const data = await logger.time('fetch fixtures', () =>
    fplFetch<Fixture[]>('/fixtures/', {
      cache: 'no-store',
    }),
    { source: 'fpl-server' }
  );

  fixturesCache = { data, timestamp: Date.now() };
  return data;
}

/**
 * Look up a player by ID from the bootstrap data.
 */
export async function getPlayerById(id: number): Promise<Player | undefined> {
  const data = await getBootstrapData();
  return data.elements.find(p => p.id === id);
}

// ---- Element-summary cache (per-player detail) ----
const playerDetailCache = new Map<number, { data: PlayerDetailData; timestamp: number }>();

export interface PlayerDetailData {
  history: Array<Record<string, unknown>>;
  fixtures: Array<Record<string, unknown>>;
}

/**
 * Fetch a player's element-summary (history + upcoming fixtures)
 * with in-memory caching (5-min TTL per player).
 */
export async function getPlayerDetail(playerId: number): Promise<PlayerDetailData | null> {
  const cached = playerDetailCache.get(playerId);
  if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL) {
    logger.debug(`player detail cache hit: ${playerId}`);
    return cached.data;
  }

  try {
    const data = await logger.time(`fetch element-summary/${playerId}`, () =>
      fplFetch<PlayerDetailData>(`/element-summary/${playerId}/`, {
        cache: 'no-store',
      }),
      { source: 'fpl-server' }
    );
    playerDetailCache.set(playerId, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    logger.error(`Failed to fetch element-summary/${playerId}`, err instanceof Error ? { message: err.message } : undefined);
    return null;
  }
}

/**
 * Get a team's name from the bootstrap data.
 */
export async function getTeamById(teamId: number): Promise<Team | undefined> {
  const data = await getBootstrapData();
  return data.teams.find(t => t.id === teamId);
}

/**
 * Fetch all initial data for SSR hydration.
 * Used by the root layout to pre-populate FPLProvider.
 */
export async function getInitialData(): Promise<FPLInitialData> {
  const [bootstrap, fixtures] = await Promise.all([
    getBootstrapData(),
    getFixtures(),
  ]);

  return {
    players: bootstrap.elements,
    teams: bootstrap.teams,
    fixtures,
    gameweeks: bootstrap.events,
    elementTypes: bootstrap.element_types ?? [],
  };
}
