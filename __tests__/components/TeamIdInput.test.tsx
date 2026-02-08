import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeamIdInput from '@/components/optimizer/TeamIdInput';
import { FPLEntry } from '@/types/fpl';

const baseProps = {
  teamIdInput: '',
  setTeamIdInput: vi.fn(),
  entryLoading: false,
  entryError: null as string | null,
  entry: null as FPLEntry | null,
  bank: 0,
  onLoad: vi.fn(),
};

describe('TeamIdInput', () => {
  it('renders input field with label', () => {
    render(<TeamIdInput {...baseProps} />);
    expect(screen.getByLabelText('FPL Team ID')).toBeInTheDocument();
  });

  it('renders Load Team button', () => {
    render(<TeamIdInput {...baseProps} />);
    expect(screen.getByRole('button', { name: /load team/i })).toBeInTheDocument();
  });

  it('disables button when no input', () => {
    render(<TeamIdInput {...baseProps} teamIdInput="" />);
    expect(screen.getByRole('button', { name: /load team/i })).toBeDisabled();
  });

  it('enables button when input is provided', () => {
    render(<TeamIdInput {...baseProps} teamIdInput="123456" />);
    expect(screen.getByRole('button', { name: /load team/i })).not.toBeDisabled();
  });

  it('shows Loading... when entryLoading', () => {
    render(<TeamIdInput {...baseProps} teamIdInput="123" entryLoading={true} />);
    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
  });

  it('calls onLoad when Load Team clicked', () => {
    const onLoad = vi.fn();
    render(<TeamIdInput {...baseProps} teamIdInput="123" onLoad={onLoad} />);
    fireEvent.click(screen.getByRole('button', { name: /load team/i }));
    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('calls onLoad on Enter key in input', () => {
    const onLoad = vi.fn();
    render(<TeamIdInput {...baseProps} teamIdInput="123" onLoad={onLoad} />);
    fireEvent.keyDown(screen.getByLabelText('FPL Team ID'), { key: 'Enter' });
    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('strips non-digit characters from input', () => {
    const setTeamIdInput = vi.fn();
    render(<TeamIdInput {...baseProps} setTeamIdInput={setTeamIdInput} teamIdInput="" />);
    fireEvent.change(screen.getByLabelText('FPL Team ID'), { target: { value: 'abc123def' } });
    expect(setTeamIdInput).toHaveBeenCalledWith('123');
  });

  it('shows error message when entryError exists', () => {
    render(<TeamIdInput {...baseProps} entryError="Team not found" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Team not found');
  });

  it('displays entry info when entry is loaded', () => {
    const entry: FPLEntry = {
      id: 1,
      joined_time: '2024-01-01T00:00:00Z',
      player_first_name: 'John',
      player_last_name: 'Doe',
      name: 'My FPL Team',
      summary_overall_points: 1500,
      summary_overall_rank: 50000,
      summary_event_points: 60,
      summary_event_rank: 10000,
      current_event: 10,
      last_deadline_bank: 15,
      last_deadline_value: 1000,
      last_deadline_total_transfers: 8,
    };
    render(<TeamIdInput {...baseProps} entry={entry} bank={15} />);
    expect(screen.getByText('My FPL Team')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('50,000')).toBeInTheDocument();
  });

  it('shows helper text about finding team ID', () => {
    render(<TeamIdInput {...baseProps} />);
    expect(screen.getByText(/Find it in your FPL URL/i)).toBeInTheDocument();
  });
});
