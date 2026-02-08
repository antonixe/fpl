import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makePlayer, makeTeam, makeFixture, makeGameweek } from '../fixtures';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock useFPL
vi.mock('@/lib/use-fpl-data', () => ({
  useFPL: vi.fn(() => ({
    players: [], teams: [], fixtures: [], gameweeks: [],
    elementTypes: [], loading: false, error: null, lastUpdated: null, refresh: vi.fn(),
  })),
}));

// Mock ErrorState
vi.mock('@/components/ErrorState', () => ({
  EmptyState: ({ title, message }: any) => <div data-testid="empty-state">{title}: {message}</div>,
}));

// Test the mock-integrated TransferAdvisor
describe('TransferAdvisor', async () => {
  const { default: TransferAdvisor } = await import('@/components/optimizer/TransferAdvisor');
  const { useFPL } = await import('@/lib/use-fpl-data');

  const teams = [
    makeTeam({ id: 1, short_name: 'LIV' }),
    makeTeam({ id: 2, short_name: 'ARS' }),
  ];
  const players = [
    makePlayer({ id: 1, team: 1, web_name: 'Salah', element_type: 3 }),
    makePlayer({ id: 2, team: 2, web_name: 'Saka', element_type: 3 }),
  ];
  const gameweeks = [makeGameweek({ id: 10, is_current: true })];
  const fixtures = [makeFixture({ event: 11, team_h: 1, team_a: 2 })];

  beforeEach(() => {
    (useFPL as any).mockReturnValue({
      players, teams, fixtures, gameweeks,
      elementTypes: [], loading: false, error: null, lastUpdated: null, refresh: vi.fn(),
    });
  });

  const baseProps = {
    teamIdInput: '',
    setTeamIdInput: vi.fn(),
    entryLoading: false,
    entryError: null,
    entry: null,
    picks: [],
    bank: 0,
    freeTransfers: 1,
    fetchTeamData: vi.fn(),
  };

  it('renders empty state when no picks loaded', () => {
    render(<TransferAdvisor {...baseProps} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders Your FPL Team section', () => {
    render(<TransferAdvisor {...baseProps} />);
    expect(screen.getByText('Your FPL Team')).toBeInTheDocument();
  });

  it('renders FPL Team ID input', () => {
    render(<TransferAdvisor {...baseProps} />);
    expect(screen.getByLabelText('FPL Team ID')).toBeInTheDocument();
  });
});

describe('ChipAdvisor', async () => {
  const { default: ChipAdvisor } = await import('@/components/optimizer/ChipAdvisor');
  const { useFPL } = await import('@/lib/use-fpl-data');

  const teams = [makeTeam({ id: 1, short_name: 'LIV' })];
  const players = [makePlayer({ id: 1, team: 1 })];
  const gameweeks = [makeGameweek({ id: 10, is_current: true })];

  beforeEach(() => {
    (useFPL as any).mockReturnValue({
      players, teams, fixtures: [], gameweeks,
      elementTypes: [], loading: false, error: null, lastUpdated: null, refresh: vi.fn(),
    });
  });

  const baseProps = {
    teamIdInput: '',
    setTeamIdInput: vi.fn(),
    entryLoading: false,
    entryError: null,
    entry: null,
    picks: [],
    bank: 0,
    chipsPlayed: [],
    fetchTeamData: vi.fn(),
  };

  it('renders empty state when no picks', () => {
    render(<ChipAdvisor {...baseProps} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders Your FPL Team section', () => {
    render(<ChipAdvisor {...baseProps} />);
    expect(screen.getByText('Your FPL Team')).toBeInTheDocument();
  });
});
