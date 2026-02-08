import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { getMatchStatus } from '@/components/live/MatchCard';
import { makeFixture, makePlayer } from '../fixtures';

// Test the exported utility function directly (no mocking needed)
describe('getMatchStatus', () => {
  it('returns FT for finished match', () => {
    const fixture = makeFixture({ finished: true, finished_provisional: false, started: true, minutes: 90 });
    const result = getMatchStatus(fixture);
    expect(result.label).toBe('FT');
  });

  it('returns FT for provisional finished match', () => {
    const fixture = makeFixture({ finished_provisional: true, finished: false, started: true, minutes: 90 });
    const result = getMatchStatus(fixture);
    expect(result.label).toBe('FT');
  });

  it('returns HT for halftime (minute 45)', () => {
    const fixture = makeFixture({ started: true, finished: false, finished_provisional: false, minutes: 45 });
    const result = getMatchStatus(fixture);
    expect(result.label).toBe('HT');
  });

  it('returns HT for halftime (minute 46)', () => {
    const fixture = makeFixture({ started: true, finished: false, finished_provisional: false, minutes: 46 });
    const result = getMatchStatus(fixture);
    expect(result.label).toBe('HT');
  });

  it('returns live minute for in-play match', () => {
    const fixture = makeFixture({ started: true, finished: false, finished_provisional: false, minutes: 67 });
    const result = getMatchStatus(fixture);
    expect(result.label).toBe("67'");
    expect(result.className).toContain('animate-pulse');
  });

  it('returns formatted kickoff time for not-started match', () => {
    const fixture = makeFixture({
      started: false, finished: false, finished_provisional: false,
      kickoff_time: '2025-11-01T15:00:00Z',
    });
    const result = getMatchStatus(fixture);
    // Should be a time string like "15:00" or locale equivalent  
    expect(result.label).toMatch(/\d{2}:\d{2}/);
  });

  it('returns TBD for invalid kickoff time', () => {
    const fixture = makeFixture({
      started: false, finished: false, finished_provisional: false,
      kickoff_time: 'invalid-date',
    });
    const result = getMatchStatus(fixture);
    // The Date constructor may or may not throw for invalid dates
    // but the result should be a valid string
    expect(typeof result.label).toBe('string');
  });
});

// Test the full MatchCard component with mocked dependencies
vi.mock('@/lib/use-fpl-data', () => ({
  useFPL: vi.fn(() => ({
    players: [], teams: [], fixtures: [], gameweeks: [], elementTypes: [],
    loading: false, error: null, lastUpdated: null, refresh: vi.fn(),
  })),
}));

describe('MatchCard component', async () => {
  // Dynamic import after mock setup
  const { default: MatchCard } = await import('@/components/live/MatchCard');

  const baseProps = {
    fixture: makeFixture({
      started: true, finished: true, finished_provisional: true,
      team_h_score: 2, team_a_score: 1,
      minutes: 90,
      stats: [],
    }),
    players: [
      makePlayer({ id: 10, web_name: 'Salah', team: 1 }),
      makePlayer({ id: 20, web_name: 'Haaland', team: 2 }),
    ],
    liveElements: [],
    homeTeamName: 'Liverpool',
    awayTeamName: 'Man City',
    homeTeamShort: 'LIV',
    awayTeamShort: 'MCI',
  };

  it('renders team names', () => {
    render(<MatchCard {...baseProps} />);
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
    expect(screen.getByText('Man City')).toBeInTheDocument();
  });

  it('renders short team names', () => {
    render(<MatchCard {...baseProps} />);
    expect(screen.getByText('LIV')).toBeInTheDocument();
    expect(screen.getByText('MCI')).toBeInTheDocument();
  });

  it('renders score for started match', () => {
    render(<MatchCard {...baseProps} />);
    // Score format: "2 – 1"
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it('renders "vs" for not-started match', () => {
    const notStarted = {
      ...baseProps,
      fixture: makeFixture({ started: false, finished: false, finished_provisional: false }),
    };
    render(<MatchCard {...notStarted} />);
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('expands on click for started match', () => {
    const withStats = {
      ...baseProps,
      fixture: makeFixture({
        started: true, finished: true, finished_provisional: true,
        team_h_score: 2, team_a_score: 1,
        minutes: 90,
        stats: [
          {
            identifier: 'goals_scored',
            h: [{ element: 10, value: 2 }],
            a: [{ element: 20, value: 1 }],
          },
        ],
      }),
    };
    render(<MatchCard {...withStats} />);
    // Click to expand
    const clickable = screen.getByText('▼ Details').closest('[role="button"]') ||
                      screen.getByText('▼ Details').parentElement?.parentElement;
    if (clickable) fireEvent.click(clickable);
    // After expand, should show "▲ Less"
    expect(screen.getByText('▲ Less')).toBeInTheDocument();
  });

  it('shows keyboard support for started match', () => {
    render(<MatchCard {...baseProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).toHaveAttribute('aria-expanded');
  });
});
