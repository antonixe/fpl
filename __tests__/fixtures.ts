import { Player, Team, Fixture, GameWeek } from '@/types/fpl';

// ===== Test Fixtures =====
// Minimal realistic data for testing pure functions.

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    web_name: 'Salah',
    first_name: 'Mohamed',
    second_name: 'Salah',
    team: 1,
    team_code: 14,
    element_type: 3, // MID
    now_cost: 130,
    cost_change_start: 5,
    total_points: 120,
    points_per_game: '8.0',
    form: '7.5',
    selected_by_percent: '45.0',
    minutes: 900,
    goals_scored: 10,
    assists: 5,
    clean_sheets: 3,
    goals_conceded: 8,
    bonus: 15,
    bps: 250,
    influence: '500.0',
    creativity: '400.0',
    threat: '600.0',
    ict_index: '150.0',
    value_form: '0.6',
    value_season: '9.2',
    transfers_in: 100000,
    transfers_out: 30000,
    transfers_in_event: 15000,
    transfers_out_event: 5000,
    chance_of_playing_this_round: 100,
    chance_of_playing_next_round: 100,
    status: 'a',
    news: '',
    photo: '118748.jpg',
    code: 118748,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    code: 14,
    id: 1,
    name: 'Liverpool',
    short_name: 'LIV',
    strength: 5,
    strength_overall_home: 1300,
    strength_overall_away: 1280,
    strength_attack_home: 1350,
    strength_attack_away: 1300,
    strength_defence_home: 1250,
    strength_defence_away: 1200,
    ...overrides,
  };
}

export function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 1,
    code: 100,
    event: 10,
    finished: false,
    finished_provisional: false,
    started: false,
    kickoff_time: '2025-11-01T15:00:00Z',
    minutes: 0,
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 2,
    team_a_difficulty: 4,
    stats: [],
    pulse_id: 100,
    ...overrides,
  };
}

export function makeGameweek(overrides: Partial<GameWeek> = {}): GameWeek {
  return {
    id: 10,
    name: 'Gameweek 10',
    deadline_time: '2025-11-01T11:00:00Z',
    finished: false,
    is_current: true,
    is_next: false,
    ...overrides,
  };
}

/** Create a set of teams for testing */
export function makeTeams(count = 4): Team[] {
  const names = [
    { name: 'Liverpool', short_name: 'LIV' },
    { name: 'Arsenal', short_name: 'ARS' },
    { name: 'Man City', short_name: 'MCI' },
    { name: 'Chelsea', short_name: 'CHE' },
    { name: 'Man Utd', short_name: 'MUN' },
    { name: 'Tottenham', short_name: 'TOT' },
  ];
  return Array.from({ length: count }, (_, i) =>
    makeTeam({ id: i + 1, code: i + 10, ...names[i] })
  );
}

/** Create upcoming fixtures for a team */
export function makeUpcomingFixtures(
  teamId: number,
  currentGW: number,
  count: number,
  difficulty: number = 3
): Fixture[] {
  return Array.from({ length: count }, (_, i) =>
    makeFixture({
      id: 100 + i,
      event: currentGW + i,
      team_h: teamId,
      team_a: teamId + 1,
      team_h_difficulty: difficulty,
      team_a_difficulty: 5 - difficulty + 1,
    })
  );
}
