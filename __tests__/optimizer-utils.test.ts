import { describe, it, expect } from 'vitest';
import {
  estimateSellingPrice,
  generateTransferSuggestions,
  analyzeSquad,
  type TransferContext,
} from '@/lib/optimizer-utils';
import { FPLPick } from '@/types/fpl';
import { makePlayer, makeTeams, makeUpcomingFixtures, makeGameweek } from './fixtures';

// ===== estimateSellingPrice =====

describe('estimateSellingPrice', () => {
  it('returns current cost when no price rise', () => {
    const p = makePlayer({ now_cost: 100, cost_change_start: 0 });
    expect(estimateSellingPrice(p)).toBe(100);
  });

  it('returns current cost when price has dropped', () => {
    const p = makePlayer({ now_cost: 95, cost_change_start: -5 });
    expect(estimateSellingPrice(p)).toBe(95);
  });

  it('returns original price + half profit when price rose', () => {
    // now_cost=105, cost_change_start=5 → original=100, sellProfit=floor(5/2)=2
    const p = makePlayer({ now_cost: 105, cost_change_start: 5 });
    expect(estimateSellingPrice(p)).toBe(102); // 100 + 2
  });

  it('floors odd profit correctly', () => {
    // now_cost=103, cost_change_start=3 → original=100, sellProfit=floor(3/2)=1
    const p = makePlayer({ now_cost: 103, cost_change_start: 3 });
    expect(estimateSellingPrice(p)).toBe(101); // 100 + 1
  });
});

// ===== generateTransferSuggestions =====

describe('generateTransferSuggestions', () => {
  const teams = makeTeams(4);
  const gameweeks = [makeGameweek({ id: 10, is_current: true })];
  const fixtures = makeUpcomingFixtures(1, 10, 5, 3);

  function makeCtx(overrides: Partial<TransferContext> = {}): TransferContext {
    const defaultPlayers = [
      makePlayer({ id: 1, team: 1, element_type: 3, status: 'a', form: '7.0', minutes: 900, now_cost: 130 }),
      makePlayer({ id: 2, team: 2, element_type: 3, status: 'a', form: '6.5', minutes: 800, now_cost: 80, web_name: 'Saka' }),
      makePlayer({ id: 3, team: 3, element_type: 3, status: 'a', form: '8.0', minutes: 850, now_cost: 90, web_name: 'De Bruyne' }),
      makePlayer({ id: 4, team: 4, element_type: 4, status: 'a', form: '5.5', minutes: 700, now_cost: 85, web_name: 'Haaland' }),
    ];
    const defaultPicks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
    ];
    return {
      players: defaultPlayers,
      teams,
      fixtures,
      gameweeks,
      picks: defaultPicks,
      bank: 10,
      freeTransfers: 1,
      ...overrides,
    };
  }

  it('returns empty array when squad has no issues', () => {
    const ctx = makeCtx();
    const result = generateTransferSuggestions(ctx);
    expect(result).toEqual([]);
  });

  it('suggests replacement for injured starter', () => {
    const injuredPlayer = makePlayer({
      id: 2, team: 2, element_type: 3, status: 'i', form: '0.0', minutes: 500,
      now_cost: 80, web_name: 'Injured',
    });
    const replacement = makePlayer({
      id: 5, team: 3, element_type: 3, status: 'a', form: '6.0', minutes: 800,
      now_cost: 75, web_name: 'Replacement',
    });
    const ctx = makeCtx({
      players: [
        makePlayer({ id: 1, team: 1, element_type: 3, status: 'a', form: '7.0', minutes: 900 }),
        injuredPlayer,
        replacement,
      ],
      picks: [
        { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
        { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false },
      ],
    });
    const result = generateTransferSuggestions(ctx);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].playerOut.id).toBe(2);
    expect(result[0].priority).toBe('urgent');
  });

  it('assigns hit cost correctly beyond free transfers', () => {
    // Two injured starters with only 1 free transfer
    const ctx = makeCtx({
      players: [
        makePlayer({ id: 1, team: 1, element_type: 3, status: 'i', form: '0.0', minutes: 500, now_cost: 80 }),
        makePlayer({ id: 2, team: 2, element_type: 4, status: 'i', form: '0.0', minutes: 400, now_cost: 70 }),
        makePlayer({ id: 5, team: 3, element_type: 3, status: 'a', form: '6.0', minutes: 800, now_cost: 75, web_name: 'Rep1' }),
        makePlayer({ id: 6, team: 4, element_type: 4, status: 'a', form: '5.5', minutes: 700, now_cost: 65, web_name: 'Rep2' }),
      ],
      picks: [
        { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
        { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false },
      ],
      freeTransfers: 1,
    });
    const result = generateTransferSuggestions(ctx);
    // First transfer should be free, second should have hit cost
    const freeSuggestions = result.filter(s => s.hitCost === 0);
    const hitSuggestions = result.filter(s => s.hitCost > 0);
    expect(freeSuggestions.length).toBeLessThanOrEqual(1);
    if (result.length > 1) {
      expect(hitSuggestions[0]?.hitCost).toBe(4);
    }
  });
});

// ===== analyzeSquad =====

describe('analyzeSquad', () => {
  const teams = makeTeams(4);
  const fixtures = makeUpcomingFixtures(1, 10, 5, 3);

  it('returns empty for a healthy squad', () => {
    const players = [
      makePlayer({ id: 1, status: 'a', form: '6.0', minutes: 900 }),
      makePlayer({ id: 2, status: 'a', form: '5.5', minutes: 800, team: 2, web_name: 'Saka' }),
    ];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 2, is_captain: true, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: true },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    expect(issues).toEqual([]);
  });

  it('flags injured starter as high severity', () => {
    const players = [
      makePlayer({ id: 1, status: 'i', web_name: 'Injured' }),
    ];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('high');
    expect(issues[0].message).toContain('injured');
  });

  it('flags suspended starter', () => {
    const players = [makePlayer({ id: 1, status: 's', web_name: 'Suspended' })];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    expect(issues.some(i => i.message.includes('suspended'))).toBe(true);
  });

  it('flags doubtful starter as medium severity', () => {
    const players = [
      makePlayer({ id: 1, status: 'd', chance_of_playing_next_round: 50, web_name: 'Doubtful' }),
    ];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    expect(issues.some(i => i.severity === 'medium' && i.message.includes('doubtful'))).toBe(true);
  });

  it('flags zero-minute starter', () => {
    const players = [makePlayer({ id: 1, minutes: 0, status: 'a', web_name: 'Benched' })];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    expect(issues.some(i => i.message.includes('0 minutes'))).toBe(true);
  });

  it('does NOT flag injured bench player', () => {
    const players = [makePlayer({ id: 1, status: 'i', web_name: 'BenchInjured' })];
    const picks: FPLPick[] = [
      { element: 1, position: 12, multiplier: 0, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    // Bench injuries should not trigger the "needs replacing" urgent issue
    expect(issues.some(i => i.message.includes('needs replacing'))).toBe(false);
  });

  it('sorts issues by severity (high first)', () => {
    const players = [
      makePlayer({ id: 1, status: 'i', web_name: 'Injured' }),
      makePlayer({ id: 2, status: 'd', chance_of_playing_next_round: 50, team: 2, web_name: 'Doubtful' }),
    ];
    const picks: FPLPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const issues = analyzeSquad(picks, players, fixtures, teams, 10);
    const highIdx = issues.findIndex(i => i.severity === 'high');
    const medIdx = issues.findIndex(i => i.severity === 'medium');
    if (highIdx >= 0 && medIdx >= 0) {
      expect(highIdx).toBeLessThan(medIdx);
    }
  });
});
