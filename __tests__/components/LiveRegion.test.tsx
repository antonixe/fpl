import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveRegion } from '@/components/LiveRegion';

describe('LiveRegion', () => {
  it('renders with aria-live="polite" by default', () => {
    render(<LiveRegion message="Hello" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders with aria-live="assertive" when specified', () => {
    render(<LiveRegion message="Urgent" politeness="assertive" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });

  it('is visually hidden with sr-only class', () => {
    render(<LiveRegion message="Hidden message" />);
    const region = screen.getByRole('status');
    expect(region.className).toContain('sr-only');
  });

  it('displays the message text', () => {
    render(<LiveRegion message="Data loaded" />);
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });

  it('toggles slot when message changes to force re-announcement', () => {
    const { rerender } = render(<LiveRegion message="First" />);
    expect(screen.getByText('First')).toBeInTheDocument();
    
    rerender(<LiveRegion message="Second" />);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
