import { describe, it, expect } from 'vitest';
import {
  getPositionLabel,
  getPositionClass,
  getTeamShort,
  getTeamName,
  getStatusBadge,
  isPlayerAvailable,
  getFDRClass,
  getUpcomingFixtures,
  getFixtureDifficultyScore,
  calcPPM,
  getCurrentGW,
  calcExpectedPoints,
  getPlayerImageUrl,
  formatPrice,
  formatDate,
  formatDateTime,
  timeAgo,
} from '@/lib/fpl-utils';
import { makePlayer, makeTeam, makeTeams, makeFixture, makeGameweek, makeUpcomingFixtures } from './fixtures';

// ===== Position Utilities =====

describe('getPositionLabel', () => {
  it('returns correct labels for valid positions', () => {
    expect(getPositionLabel(1)).toBe('GK');
    expect(getPositionLabel(2)).toBe('DEF');
    expect(getPositionLabel(3)).toBe('MID');
    expect(getPositionLabel(4)).toBe('FWD');
  });

  it('returns empty string for invalid positions', () => {
    expect(getPositionLabel(0)).toBe('');
    expect(getPositionLabel(5)).toBe('');
    expect(getPositionLabel(-1)).toBe('');
  });
});

describe('getPositionClass', () => {
  it('returns correct CSS classes', () => {
    expect(getPositionClass(1)).toBe('pos-gk');
    expect(getPositionClass(2)).toBe('pos-def');
    expect(getPositionClass(3)).toBe('pos-mid');
    expect(getPositionClass(4)).toBe('pos-fwd');
  });

  it('returns empty string for out-of-range', () => {
    expect(getPositionClass(0)).toBe('');
    expect(getPositionClass(99)).toBe('');
  });
});

// ===== Team Utilities =====

describe('getTeamShort', () => {
  const teams = makeTeams(3);

  it('returns short name for known team', () => {
    expect(getTeamShort(teams, 1)).toBe('LIV');
    expect(getTeamShort(teams, 2)).toBe('ARS');
  });

  it('returns dash for unknown team', () => {
    expect(getTeamShort(teams, 99)).toBe('—');
  });

  it('returns dash for empty teams array', () => {
    expect(getTeamShort([], 1)).toBe('—');
  });
});

describe('getTeamName', () => {
  const teams = makeTeams(2);

  it('returns full name for known team', () => {
    expect(getTeamName(teams, 1)).toBe('Liverpool');
  });

  it('returns Unknown for unknown team', () => {
    expect(getTeamName(teams, 99)).toBe('Unknown');
  });
});

// ===== Status Utilities =====

describe('getStatusBadge', () => {
  it('returns INJ for injured player', () => {
    const p = makePlayer({ status: 'i' });
    expect(getStatusBadge(p)).toEqual({ text: 'INJ', className: 'label-danger' });
  });

  it('returns SUS for suspended player', () => {
    const p = makePlayer({ status: 's' });
    expect(getStatusBadge(p)).toEqual({ text: 'SUS', className: 'label-danger' });
  });

  it('returns DBT for doubtful player', () => {
    const p = makePlayer({ status: 'd' });
    expect(getStatusBadge(p)).toEqual({ text: 'DBT', className: 'label-warning' });
  });

  it('returns N/A for unavailable player', () => {
    const p = makePlayer({ status: 'n' });
    expect(getStatusBadge(p)).toEqual({ text: 'N/A', className: 'label-danger' });
  });

  it('returns percentage badge for partial chance', () => {
    const p = makePlayer({ status: 'a', chance_of_playing_next_round: 75 });
    expect(getStatusBadge(p)).toEqual({ text: '75%', className: 'label-warning' });
  });

  it('returns danger class for <=50% chance', () => {
    const p = makePlayer({ status: 'a', chance_of_playing_next_round: 25 });
    expect(getStatusBadge(p)?.className).toBe('label-danger');
  });

  it('returns null for fully available player', () => {
    const p = makePlayer({ status: 'a', chance_of_playing_next_round: 100 });
    expect(getStatusBadge(p)).toBeNull();
  });

  it('returns null when chance_of_playing_next_round is null', () => {
    const p = makePlayer({ status: 'a', chance_of_playing_next_round: null });
    expect(getStatusBadge(p)).toBeNull();
  });
});

describe('isPlayerAvailable', () => {
  it('returns true for available player', () => {
    expect(isPlayerAvailable(makePlayer({ status: 'a' }))).toBe(true);
  });

  it('returns true for doubtful player', () => {
    expect(isPlayerAvailable(makePlayer({ status: 'd' }))).toBe(true);
  });

  it('returns false for injured player', () => {
    expect(isPlayerAvailable(makePlayer({ status: 'i' }))).toBe(false);
  });

  it('returns false for suspended player', () => {
    expect(isPlayerAvailable(makePlayer({ status: 's' }))).toBe(false);
  });

  it('returns false for unavailable player', () => {
    expect(isPlayerAvailable(makePlayer({ status: 'u' }))).toBe(false);
  });
});

// ===== FDR / Fixture Utilities =====

describe('getFDRClass', () => {
  it('returns correct class for each difficulty', () => {
    expect(getFDRClass(1)).toBe('fdr-2');
    expect(getFDRClass(2)).toBe('fdr-2');
    expect(getFDRClass(3)).toBe('fdr-3');
    expect(getFDRClass(4)).toBe('fdr-4');
    expect(getFDRClass(5)).toBe('fdr-5');
  });
});

describe('getUpcomingFixtures', () => {
  const teams = makeTeams(4);

  it('returns upcoming fixtures sorted by GW', () => {
    const fixtures = [
      makeFixture({ id: 1, event: 12, team_h: 1, team_a: 3, team_h_difficulty: 2, team_a_difficulty: 4 }),
      makeFixture({ id: 2, event: 11, team_h: 2, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 3 }),
      makeFixture({ id: 3, event: 13, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 5 }),
    ];
    const result = getUpcomingFixtures(fixtures, teams, 1, 10, 3);
    expect(result).toHaveLength(3);
    expect(result[0].gw).toBe(11);
    expect(result[1].gw).toBe(12);
    expect(result[2].gw).toBe(13);
  });

  it('sets correct opponent and isHome for home match', () => {
    const fixtures = [makeFixture({ event: 10, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 })];
    const result = getUpcomingFixtures(fixtures, teams, 1, 10, 1);
    expect(result[0].opponent).toBe('ARS');
    expect(result[0].isHome).toBe(true);
    expect(result[0].difficulty).toBe(2);
  });

  it('sets correct opponent and isHome for away match', () => {
    const fixtures = [makeFixture({ event: 10, team_h: 2, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 4 })];
    const result = getUpcomingFixtures(fixtures, teams, 1, 10, 1);
    expect(result[0].opponent).toBe('ARS');
    expect(result[0].isHome).toBe(false);
    expect(result[0].difficulty).toBe(4);
  });

  it('excludes finished fixtures', () => {
    const fixtures = [makeFixture({ event: 10, finished: true, team_h: 1, team_a: 2 })];
    const result = getUpcomingFixtures(fixtures, teams, 1, 10, 5);
    expect(result).toHaveLength(0);
  });

  it('respects count parameter', () => {
    const fixtures = makeUpcomingFixtures(1, 10, 5);
    const result = getUpcomingFixtures(fixtures, teams, 1, 10, 3);
    expect(result).toHaveLength(3);
  });

  it('returns empty for no matching fixtures', () => {
    const result = getUpcomingFixtures([], teams, 1, 10, 5);
    expect(result).toHaveLength(0);
  });
});

describe('getFixtureDifficultyScore', () => {
  const teams = makeTeams(4);

  it('returns inverted average (higher = easier)', () => {
    // All difficulty 2 → avg 2 → score = 6 - 2 = 4
    const fixtures = makeUpcomingFixtures(1, 10, 5, 2);
    const score = getFixtureDifficultyScore(fixtures, teams, 1, 10);
    expect(score).toBe(4);
  });

  it('returns 3 when no fixtures found', () => {
    expect(getFixtureDifficultyScore([], teams, 1, 10)).toBe(3);
  });
});

// ===== Data Calculations =====

describe('calcPPM', () => {
  it('calculates points per million correctly', () => {
    const p = makePlayer({ total_points: 100, now_cost: 100 }); // £10.0m
    expect(calcPPM(p)).toBe(10); // 100 / 10
  });

  it('returns 0 when cost is 0', () => {
    const p = makePlayer({ now_cost: 0 });
    expect(calcPPM(p)).toBe(0);
  });

  it('handles expensive player correctly', () => {
    const p = makePlayer({ total_points: 130, now_cost: 130 }); // £13.0m
    expect(calcPPM(p)).toBe(10); // 130 / 13
  });
});

describe('getCurrentGW', () => {
  it('returns current GW when available', () => {
    const gws = [
      makeGameweek({ id: 9, is_current: false, is_next: false }),
      makeGameweek({ id: 10, is_current: true, is_next: false }),
      makeGameweek({ id: 11, is_current: false, is_next: true }),
    ];
    expect(getCurrentGW(gws)).toBe(10);
  });

  it('falls back to next GW when no current', () => {
    const gws = [
      makeGameweek({ id: 10, is_current: false, is_next: false }),
      makeGameweek({ id: 11, is_current: false, is_next: true }),
    ];
    expect(getCurrentGW(gws)).toBe(11);
  });

  it('returns 1 when no current or next', () => {
    expect(getCurrentGW([])).toBe(1);
  });
});

// ===== Expected Points Model =====

describe('calcExpectedPoints', () => {
  const teams = makeTeams(4);

  it('returns 0 for injured player', () => {
    const p = makePlayer({ status: 'i', form: '8.0', minutes: 900 });
    const fixtures = makeUpcomingFixtures(1, 10, 5, 2);
    expect(calcExpectedPoints(p, fixtures, teams, 10)).toBe(0);
  });

  it('returns 0 for suspended player', () => {
    const p = makePlayer({ status: 's', form: '6.0', minutes: 800 });
    const fixtures = makeUpcomingFixtures(1, 10, 5, 3);
    expect(calcExpectedPoints(p, fixtures, teams, 10)).toBe(0);
  });

  it('returns 0 for player with 0 minutes', () => {
    const p = makePlayer({ minutes: 0, form: '5.0' });
    const fixtures = makeUpcomingFixtures(1, 10, 5, 2);
    expect(calcExpectedPoints(p, fixtures, teams, 10)).toBe(0);
  });

  it('returns positive value for available in-form player', () => {
    const p = makePlayer({ status: 'a', form: '7.5', minutes: 900, team: 1 });
    const fixtures = makeUpcomingFixtures(1, 10, 5, 2); // easy fixtures
    const xPts = calcExpectedPoints(p, fixtures, teams, 10);
    expect(xPts).toBeGreaterThan(0);
  });

  it('scales with playing chance', () => {
    const fixtures = makeUpcomingFixtures(1, 10, 5, 3);
    const full = makePlayer({ status: 'a', chance_of_playing_next_round: 100, form: '5.0', minutes: 900 });
    const half = makePlayer({ status: 'a', chance_of_playing_next_round: 50, form: '5.0', minutes: 900 });
    const xFull = calcExpectedPoints(full, fixtures, teams, 10);
    const xHalf = calcExpectedPoints(half, fixtures, teams, 10);
    expect(xFull).toBeGreaterThan(xHalf);
    expect(xHalf).toBeCloseTo(xFull / 2, 1);
  });

  it('easier fixtures produce higher xPts', () => {
    const p = makePlayer({ form: '6.0', minutes: 900 });
    const easyFixtures = makeUpcomingFixtures(1, 10, 5, 2); // difficulty 2
    const hardFixtures = makeUpcomingFixtures(1, 10, 5, 5); // difficulty 5
    const xEasy = calcExpectedPoints(p, easyFixtures, teams, 10);
    const xHard = calcExpectedPoints(p, hardFixtures, teams, 10);
    expect(xEasy).toBeGreaterThan(xHard);
  });
});

// ===== Player Image =====

describe('getPlayerImageUrl', () => {
  it('builds correct URL with default size', () => {
    const p = makePlayer({ photo: '118748.jpg' });
    expect(getPlayerImageUrl(p)).toBe(
      'https://resources.premierleague.com/premierleague/photos/players/110x140/p118748.png'
    );
  });

  it('builds URL with custom size', () => {
    const p = makePlayer({ photo: '118748.jpg' });
    expect(getPlayerImageUrl(p, '250x250')).toContain('250x250');
  });

  it('returns empty string when no photo', () => {
    const p = makePlayer({ photo: '' });
    expect(getPlayerImageUrl(p)).toBe('');
  });
});

// ===== Formatting =====

describe('formatPrice', () => {
  it('formats cost in millions', () => {
    expect(formatPrice(130)).toBe('£13.0');
    expect(formatPrice(45)).toBe('£4.5');
    expect(formatPrice(100)).toBe('£10.0');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2025-03-15T12:00:00Z');
    expect(result).toContain('15');
    expect(result).toContain('Mar');
  });

  it('returns "Invalid Date" for invalid date string', () => {
    // new Date('not-a-date') doesn't throw, it returns Invalid Date
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('timeAgo', () => {
  it('returns seconds for recent times', () => {
    const result = timeAgo(new Date(Date.now() - 30000));
    expect(result).toBe('30s ago');
  });

  it('returns minutes', () => {
    const result = timeAgo(new Date(Date.now() - 5 * 60000));
    expect(result).toBe('5m ago');
  });

  it('returns hours', () => {
    const result = timeAgo(new Date(Date.now() - 3 * 3600000));
    expect(result).toBe('3h ago');
  });

  it('returns days', () => {
    const result = timeAgo(new Date(Date.now() - 2 * 86400000));
    expect(result).toBe('2d ago');
  });
});
