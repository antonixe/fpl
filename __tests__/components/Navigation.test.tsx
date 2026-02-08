import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

// Mock next/link as a simple anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock useFPL
vi.mock('@/lib/use-fpl-data', () => ({
  useFPL: vi.fn(() => ({
    lastUpdated: null,
    loading: false,
    error: null,
    players: [],
    teams: [],
    fixtures: [],
    gameweeks: [],
    elementTypes: [],
    refresh: vi.fn(),
  })),
}));

// Mock ThemeToggle
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="Theme toggle mock">T</button>,
}));

import Navigation from '@/components/Navigation';
import { usePathname } from 'next/navigation';
import { useFPL } from '@/lib/use-fpl-data';

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePathname as any).mockReturnValue('/');
    document.body.style.overflow = '';
  });

  it('renders the brand logo', () => {
    render(<Navigation />);
    expect(screen.getByText('FPL')).toBeInTheDocument();
    expect(screen.getByText('GRID')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Navigation />);
    const navLabels = ['Dashboard', 'Players', 'Fixtures', 'Live', 'Optimizer'];
    for (const label of navLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders skip to content link', () => {
    render(<Navigation />);
    const skip = screen.getByText('Skip to main content');
    expect(skip).toBeInTheDocument();
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('marks current page with aria-current', () => {
    (usePathname as any).mockReturnValue('/players');
    render(<Navigation />);
    const playerLinks = screen.getAllByText('Players');
    const hasAriaCurrent = playerLinks.some(
      el => el.getAttribute('aria-current') === 'page'
    );
    expect(hasAriaCurrent).toBe(true);
  });

  it('renders hamburger button for mobile', () => {
    render(<Navigation />);
    const hamburger = screen.getByLabelText('Toggle menu');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens mobile menu on hamburger click', () => {
    render(<Navigation />);
    const hamburger = screen.getByLabelText('Toggle menu');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    // Mobile menu dialog should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes mobile menu on Escape key', () => {
    render(<Navigation />);
    const hamburger = screen.getByLabelText('Toggle menu');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape on the dialog
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows LIVE status when no error and not loading', () => {
    render(<Navigation />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows ERR status on error', () => {
    (useFPL as any).mockReturnValue({
      lastUpdated: null,
      loading: false,
      error: 'Network error',
      players: [], teams: [], fixtures: [], gameweeks: [], elementTypes: [],
      refresh: vi.fn(),
    });
    render(<Navigation />);
    expect(screen.getByText('ERR')).toBeInTheDocument();
  });

  it('shows SYNC status when loading', () => {
    (useFPL as any).mockReturnValue({
      lastUpdated: null,
      loading: true,
      error: null,
      players: [], teams: [], fixtures: [], gameweeks: [], elementTypes: [],
      refresh: vi.fn(),
    });
    render(<Navigation />);
    expect(screen.getByText('SYNC')).toBeInTheDocument();
  });

  it('prevents body scroll when mobile menu is open', () => {
    render(<Navigation />);
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(document.body.style.overflow).toBe('hidden');
  });
});
