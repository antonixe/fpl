import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardSkeleton, TableSkeleton, StatsSkeleton, PageSkeleton } from '@/components/LoadingSkeleton';

describe('CardSkeleton', () => {
  it('renders default 5 rows × 4 cols', () => {
    const { container } = render(<CardSkeleton />);
    // Each row has 4 skeleton bars
    const bars = container.querySelectorAll('.bg-\\[var\\(--bg-hover\\)\\]');
    // 1 header bar + 5*4 = 21
    expect(bars.length).toBe(21);
  });

  it('respects custom rows and cols', () => {
    const { container } = render(<CardSkeleton rows={2} cols={2} />);
    // 1 header + 2*2 = 5
    const bars = container.querySelectorAll('.bg-\\[var\\(--bg-hover\\)\\]');
    expect(bars.length).toBe(5);
  });

  it('has animate-pulse class', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('renders default 8 rows', () => {
    const { container } = render(<TableSkeleton />);
    // header row + 8 data rows = 9 total row-like divs with border-b
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  it('respects custom row count', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    // Should have fewer rows
    const allDivs = container.querySelectorAll('.flex.items-center');
    expect(allDivs.length).toBe(4); // 1 header + 3 rows
  });
});

describe('StatsSkeleton', () => {
  it('renders correct number of stat placeholders', () => {
    const { container } = render(<StatsSkeleton count={3} />);
    const stats = container.querySelectorAll('.p-4');
    expect(stats.length).toBe(3);
  });

  it('defaults to 5 stats', () => {
    const { container } = render(<StatsSkeleton />);
    const stats = container.querySelectorAll('.p-4');
    expect(stats.length).toBe(5);
  });
});

describe('PageSkeleton', () => {
  it('renders title, stats, and table sections', () => {
    const { container } = render(<PageSkeleton />);
    // Should have multiple animate-pulse containers
    const pulseEls = container.querySelectorAll('.animate-pulse');
    expect(pulseEls.length).toBeGreaterThanOrEqual(3);
  });
});
