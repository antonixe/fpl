import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState, EmptyState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('renders default title and message', () => {
    render(<ErrorState message="Network failure" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="API Error" message="Timeout" />);
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('renders retry button when retry prop given', () => {
    const retry = vi.fn();
    render(<ErrorState message="fail" retry={retry} />);
    const btn = screen.getByRole('button', { name: /try again/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(retry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when no retry prop', () => {
    render(<ErrorState message="fail" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('contains a decorative SVG icon', () => {
    const { container } = render(<ErrorState message="test" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('EmptyState', () => {
  it('renders icon, title, and message', () => {
    render(<EmptyState icon="📭" title="No data" message="Try again later" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });
});
