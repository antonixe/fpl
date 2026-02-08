/**
 * Squad Builder logic — runs in a Web Worker to avoid blocking the main thread.
 *
 * Message protocol:
 *   Main → Worker: { type: 'generate', payload: SquadBuilderInput }
 *   Worker → Main: { type: 'result', payload: SquadBuilderResult }
 */

// ===== Types (inlined to avoid import issues in Worker context) =====

interface PlayerInput {
  id: number;
  web_name: string;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  team: number;
  now_cost: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  form: string;
  status: string;
  chance_of_playing_next_round: number | null;
  minutes: number;
}

interface TeamInput {
  id: number;
  short_name: string;
}

interface FixtureInput {
  event: number | null;
  finished: boolean;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

type Formation = '3-4-3' | '3-5-2' | '4-3-3' | '4-4-2' | '4-5-1' | '5-3-2' | '5-4-1';
type Strategy = 'balanced' | 'attack' | 'defense' | 'form' | 'xPts';

interface ScoredPlayer extends PlayerInput {
  score: number;
  teamName: string;
  xPts: number;
  upcomingFixtures: { opponent: string; difficulty: number; isHome: boolean; gw: number }[];
}

export interface SquadBuilderInput {
  players: PlayerInput[];
  teams: TeamInput[];
  fixtures: FixtureInput[];
  currentGW: number;
  budget: number;
  strategy: Strategy;
  formation: Formation;
  builderContext: 'regular' | 'wildcard' | 'freehit';
}

export interface SquadBuilderResult {
  startingXI: ScoredPlayer[];
  bench: ScoredPlayer[];
  totalCost: number;
  totalPoints: number;
}

// ===== Pure utility functions (no external imports) =====

const FORMATIONS: Record<Formation, { def: number; mid: number; fwd: number }> = {
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-5-1': { def: 4, mid: 5, fwd: 1 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
};

function isPlayerAvailable(p: PlayerInput): boolean {
  return p.status !== 'u' && p.status !== 'i' && p.status !== 's';
}

function getTeamShort(teams: TeamInput[], teamId: number): string {
  return teams.find(t => t.id === teamId)?.short_name || '—';
}

function getUpcomingFixtures(
  fixtures: FixtureInput[], teams: TeamInput[], teamId: number, currentGW: number, count = 5
): { opponent: string; difficulty: number; isHome: boolean; gw: number }[] {
  return fixtures
    .filter(f => !f.finished && f.event !== null && (f.event ?? 0) >= currentGW && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event || 0) - (b.event || 0))
    .slice(0, count)
    .map(f => {
      const isHome = f.team_h === teamId;
      return {
        opponent: getTeamShort(teams, isHome ? f.team_a : f.team_h),
        difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        isHome,
        gw: f.event || 0,
      };
    });
}

function getFixtureDifficultyScore(
  fixtures: FixtureInput[], teams: TeamInput[], teamId: number, currentGW: number
): number {
  const upcoming = getUpcomingFixtures(fixtures, teams, teamId, currentGW, 5);
  if (!upcoming.length) return 3;
  const avg = upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length;
  return 6 - avg;
}

function calcExpectedPoints(
  player: PlayerInput, fixtures: FixtureInput[], teams: TeamInput[], currentGW: number
): number {
  const form = parseFloat(player.form) || 0;
  const fixtureEase = getFixtureDifficultyScore(fixtures, teams, player.team, currentGW);
  const minutesProbability = player.minutes > 0 ? Math.min(player.minutes / (currentGW * 90), 1) : 0;
  let playingChance = 1;
  if (player.chance_of_playing_next_round !== null) playingChance = player.chance_of_playing_next_round / 100;
  if (player.status === 'i' || player.status === 's') playingChance = 0;
  const xPts = form * (fixtureEase / 3) * minutesProbability * playingChance;
  return Math.round(xPts * 10) / 10;
}

// ===== Main algorithm =====

function generateSquad(input: SquadBuilderInput): SquadBuilderResult {
  const { players, teams, fixtures, currentGW, budget, strategy, formation, builderContext } = input;

  const effectiveBudget = builderContext === 'regular' ? 100 : Math.min(100, Math.max(63, budget));
  const budgetInTenths = effectiveBudget * 10;

  const available = players.filter(p => isPlayerAvailable(p) && p.minutes > 0);

  const scored: ScoredPlayer[] = available.map(p => {
    const form = parseFloat(p.form) || 0;
    const fixtureBonus = getFixtureDifficultyScore(fixtures, teams, p.team, currentGW);
    const xPts = calcExpectedPoints(p, fixtures, teams, currentGW);
    let score: number;

    switch (strategy) {
      case 'attack':
        score = p.element_type >= 3
          ? p.total_points * 1.3 + p.goals_scored * 5 + p.assists * 3 + fixtureBonus * 5
          : p.total_points + fixtureBonus * 3;
        break;
      case 'defense':
        score = p.element_type <= 2
          ? p.total_points * 1.3 + p.clean_sheets * 4 + fixtureBonus * 5
          : p.total_points + fixtureBonus * 3;
        break;
      case 'form':
        score = form * 20 + p.total_points * 0.5 + fixtureBonus * 5;
        break;
      case 'xPts':
        score = xPts * 15 + form * 5 + fixtureBonus * 8;
        break;
      default:
        score = p.total_points + form * 5 + fixtureBonus * 5;
    }

    if (p.status === 'd') {
      score *= (p.chance_of_playing_next_round ?? 50) / 100;
    }

    return {
      ...p, score, xPts,
      teamName: getTeamShort(teams, p.team),
      upcomingFixtures: getUpcomingFixtures(fixtures, teams, p.team, currentGW, 5),
    };
  });

  const POS_REQUIREMENTS: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 };
  const squad: ScoredPlayer[] = [];
  const teamCounts: Record<number, number> = {};

  // Seed with cheapest available per position
  for (const pos of [1, 2, 3, 4]) {
    const posPlayers = scored.filter(p => p.element_type === pos).sort((a, b) => a.now_cost - b.now_cost);
    let needed = POS_REQUIREMENTS[pos];
    for (const player of posPlayers) {
      if (needed <= 0) break;
      if (squad.some(p => p.id === player.id)) continue;
      if ((teamCounts[player.team] || 0) >= 3) continue;
      squad.push(player);
      teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
      needed--;
    }
  }

  // Iterative improvement
  const MAX_ITERATIONS = 200;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const currentCost = squad.reduce((s, p) => s + p.now_cost, 0);
    const headroom = budgetInTenths - currentCost;
    if (headroom < 0) break;

    let bestSwapGain = 0;
    let bestSwapIdx = -1;
    let bestSwapPlayer: ScoredPlayer | null = null;

    for (let i = 0; i < squad.length; i++) {
      const current = squad[i];
      const maxCost = current.now_cost + headroom;
      const candidates = scored.filter(p =>
        p.element_type === current.element_type &&
        p.score > current.score &&
        p.now_cost <= maxCost &&
        !squad.some(pp => pp.id === p.id) &&
        ((teamCounts[p.team] || 0) < 3 || p.team === current.team)
      );
      for (const candidate of candidates) {
        const gain = candidate.score - current.score;
        if (gain > bestSwapGain) {
          bestSwapGain = gain;
          bestSwapIdx = i;
          bestSwapPlayer = candidate;
        }
      }
    }

    if (bestSwapIdx === -1 || !bestSwapPlayer) break;
    const old = squad[bestSwapIdx];
    teamCounts[old.team] = Math.max(0, (teamCounts[old.team] || 0) - 1);
    teamCounts[bestSwapPlayer.team] = (teamCounts[bestSwapPlayer.team] || 0) + 1;
    squad[bestSwapIdx] = bestSwapPlayer;
  }

  // Fill any gaps
  for (const pos of [1, 2, 3, 4]) {
    const posPlayers = squad.filter(p => p.element_type === pos);
    let needed = POS_REQUIREMENTS[pos] - posPlayers.length;
    if (needed > 0) {
      const fillers = scored.filter(p => p.element_type === pos && !squad.some(pp => pp.id === p.id)).sort((a, b) => a.now_cost - b.now_cost);
      for (const filler of fillers) {
        if (needed <= 0) break;
        squad.push(filler);
        needed--;
      }
    }
  }

  // Split into XI and bench based on formation
  const formationReq = FORMATIONS[formation];
  const byPos: Record<number, ScoredPlayer[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of squad) {
    if (byPos[p.element_type]) byPos[p.element_type].push(p);
  }
  for (const pos of [1, 2, 3, 4]) {
    byPos[pos].sort((a, b) => b.score - a.score);
  }

  const xiCounts: Record<number, number> = { 1: 1, 2: formationReq.def, 3: formationReq.mid, 4: formationReq.fwd };
  const xi: ScoredPlayer[] = [];
  const benchArr: ScoredPlayer[] = [];

  for (const pos of [1, 2, 3, 4]) {
    const posPlayers = byPos[pos];
    for (let i = 0; i < posPlayers.length; i++) {
      if (i < xiCounts[pos]) xi.push(posPlayers[i]);
      else benchArr.push(posPlayers[i]);
    }
  }

  benchArr.sort((a, b) => {
    if (a.element_type === 1 && b.element_type !== 1) return 1;
    if (a.element_type !== 1 && b.element_type === 1) return -1;
    return b.score - a.score;
  });

  return {
    startingXI: xi,
    bench: benchArr,
    totalCost: squad.reduce((s, p) => s + p.now_cost, 0),
    totalPoints: squad.reduce((s, p) => s + p.total_points, 0),
  };
}

// ===== Worker message handler =====

self.onmessage = (e: MessageEvent<{ type: string; payload: SquadBuilderInput }>) => {
  if (e.data.type === 'generate') {
    const result = generateSquad(e.data.payload);
    self.postMessage({ type: 'result', payload: result });
  }
};
