// Type definitions for FPL API responses

export interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_code: number;
  element_type: number; // Position: 1=GK, 2=DEF, 3=MID, 4=FWD
  now_cost: number; // Cost in 0.1m (e.g., 100 = £10.0m)
  cost_change_start: number;
  total_points: number;
  points_per_game: string;
  form: string;
  selected_by_percent: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value_form: string;
  value_season: string;
  transfers_in: number;
  transfers_out: number;
  transfers_in_event: number;
  transfers_out_event: number;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  status: string;
  news: string;
  photo: string;
  code: number;
}

export interface Team {
  code: number;
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface Fixture {
  id: number;
  code: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  started: boolean | null;
  kickoff_time: string;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  stats: FixtureStat[];
  pulse_id: number;
}

export interface FixtureStat {
  identifier: string; // 'goals_scored', 'assists', 'own_goals', 'penalties_saved', 'penalties_missed', 'yellow_cards', 'red_cards', 'saves', 'bonus', 'bps'
  a: { element: number; value: number }[];
  h: { element: number; value: number }[];
}

export interface LiveElement {
  id: number;
  stats: {
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
    influence: string;
    creativity: string;
    threat: string;
    ict_index: string;
    total_points: number;
    in_dreamteam: boolean;
  };
  explain: {
    fixture: number;
    stats: { identifier: string; points: number; value: number }[];
  }[];
}

export interface FPLData {
  events: GameWeek[];
  teams: Team[];
  elements: Player[];
  element_types: ElementType[];
}

export interface GameWeek {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface ElementType {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
}

export interface PlayerHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  selected: number;
}

// ===== FPL Entry / Manager types =====

export interface FPLEntry {
  id: number;
  joined_time: string;
  player_first_name: string;
  player_last_name: string;
  name: string; // team name
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  summary_event_rank: number | null;
  current_event: number;
  last_deadline_bank: number; // in 0.1m
  last_deadline_value: number; // in 0.1m
  last_deadline_total_transfers: number;
}

export interface FPLPick {
  element: number; // player id
  position: number; // 1-15 (1-11 = starting, 12-15 = bench)
  multiplier: number; // 0=benched, 1=playing, 2=captain, 3=triple-captain
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FPLEntryEvent {
  active_chip: string | null; // 'wildcard', 'freehit', 'bboost', '3xc', null
  automatic_subs: { entry: number; element_in: number; element_out: number }[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number; // in 0.1m
    value: number; // in 0.1m
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: FPLPick[];
}

export interface FPLChipsPlayed {
  status_for_entry: string; // 'available', 'played', 'unavailable'
  played_by_entry: number[];
  name: string; // 'wildcard', 'freehit', 'bboost', '3xc'
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: string;
}

export interface TransferSuggestion {
  playerOut: Player;
  playerIn: Player;
  xPtsGain: number;
  costDelta: number; // positive = need to spend more
  reason: string;
  priority: 'urgent' | 'recommended' | 'optional';
  hitCost: number; // 0 = free transfer, 4 = one hit, etc.
  netGain: number; // xPtsGain - hitCost (for ranking)
}

export interface ChipRecommendation {
  chip: 'wildcard' | 'freehit' | 'bboost' | '3xc';
  label: string;
  score: number; // 0-100
  available: boolean;
  reason: string;
  verdict: 'strong' | 'moderate' | 'weak';
  bestGW: number | null; // which GW is best to play this chip
  bestGWReason: string; // why that GW is best
}
