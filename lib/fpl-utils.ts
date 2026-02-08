import { Player, Team, Fixture, GameWeek } from "@/types/fpl";

// ===== Position Utilities =====

const POSITION_LABELS = ['', 'GK', 'DEF', 'MID', 'FWD'] as const;
const POSITION_CLASSES = ['', 'pos-gk', 'pos-def', 'pos-mid', 'pos-fwd'] as const;

export function getPositionLabel(pos: number): string {
  return POSITION_LABELS[pos] || '';
}

export function getPositionClass(pos: number): string {
  return POSITION_CLASSES[pos] || '';
}

// ===== Team Utilities =====

export function getTeamShort(teams: Team[], teamId: number): string {
  return teams.find(t => t.id === teamId)?.short_name || '—';
}

export function getTeamName(teams: Team[], teamId: number): string {
  return teams.find(t => t.id === teamId)?.name || 'Unknown';
}

// ===== Status Utilities =====

export interface StatusBadge {
  text: string;
  className: string;
}

export function getStatusBadge(player: Player): StatusBadge | null {
  if (player.status === 'i') return { text: 'INJ', className: 'label-danger' };
  if (player.status === 's') return { text: 'SUS', className: 'label-danger' };
  if (player.status === 'd') return { text: 'DBT', className: 'label-warning' };
  if (player.status === 'n') return { text: 'N/A', className: 'label-danger' };
  if (
    player.chance_of_playing_next_round !== null &&
    player.chance_of_playing_next_round < 100
  ) {
    return {
      text: `${player.chance_of_playing_next_round}%`,
      className: player.chance_of_playing_next_round <= 50 ? 'label-danger' : 'label-warning',
    };
  }
  return null;
}

export function isPlayerAvailable(player: Player): boolean {
  return player.status !== 'u' && player.status !== 'i' && player.status !== 's';
}

// ===== FDR / Fixture Utilities =====

export function getFDRClass(difficulty: number): string {
  if (difficulty <= 2) return 'fdr-2';
  if (difficulty === 3) return 'fdr-3';
  if (difficulty === 4) return 'fdr-4';
  return 'fdr-5';
}

export interface FixtureInfo {
  opponent: string;
  difficulty: number;
  isHome: boolean;
  gw: number;
}

export function getUpcomingFixtures(
  fixtures: Fixture[],
  teams: Team[],
  teamId: number,
  currentGW: number,
  count = 5
): FixtureInfo[] {
  return fixtures
    .filter(
      f =>
        !f.finished &&
        f.event !== null &&
        f.event >= currentGW &&
        (f.team_h === teamId || f.team_a === teamId)
    )
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

export function getFixtureDifficultyScore(
  fixtures: Fixture[],
  teams: Team[],
  teamId: number,
  currentGW: number
): number {
  const upcoming = getUpcomingFixtures(fixtures, teams, teamId, currentGW, 5);
  if (!upcoming.length) return 3;
  const avg = upcoming.reduce((s, f) => s + f.difficulty, 0) / upcoming.length;
  return 6 - avg; // Invert: higher = easier
}

// ===== Data Calculations =====

export function calcPPM(player: Player): number {
  if (player.now_cost === 0) return 0;
  return player.total_points / (player.now_cost / 10);
}

export function getCurrentGW(gameweeks: GameWeek[]): number {
  const current = gameweeks.find(gw => gw.is_current);
  if (current) return current.id;
  const next = gameweeks.find(gw => gw.is_next);
  if (next) return next.id;
  return 1;
}

// ===== Expected Points Model =====
// Simple forward-looking projection: form × fixture ease × minutes probability

export function calcExpectedPoints(
  player: Player,
  fixtures: Fixture[],
  teams: Team[],
  currentGW: number
): number {
  const form = parseFloat(player.form) || 0;
  const fixtureEase = getFixtureDifficultyScore(fixtures, teams, player.team, currentGW);
  const minutesProbability = player.minutes > 0 ? Math.min(player.minutes / (currentGW * 90), 1) : 0;

  // Playing chance factor
  let playingChance = 1;
  if (player.chance_of_playing_next_round !== null) {
    playingChance = player.chance_of_playing_next_round / 100;
  }
  if (player.status === 'i' || player.status === 's') playingChance = 0;

  // Weighted projection
  const xPts = form * (fixtureEase / 3) * minutesProbability * playingChance;
  return Math.round(xPts * 10) / 10;
}

// ===== Player Image =====

export function getPlayerImageUrl(player: Player, size: '40x40' | '110x140' | '250x250' = '110x140'): string {
  // FPL photo field is like "223340.jpg" — PL image server uses .png and "p" prefix
  const photoId = player.photo?.replace('.jpg', '.png');
  if (!photoId) return '';
  return `https://resources.premierleague.com/premierleague/photos/players/${size}/p${photoId}`;
}

// ===== Formatting =====

export function formatPrice(cost: number): string {
  return `£${(cost / 10).toFixed(1)}`;
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
