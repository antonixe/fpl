import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '@/components/Toast';

// Helper component that triggers toasts
function ToastTrigger({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, type)}>Show Toast</button>;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows a toast message on trigger', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Hello toast" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('auto-dismisses toast after 4 seconds', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Disappearing" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Disappearing')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Disappearing')).not.toBeInTheDocument();
  });

  it('dismiss button removes toast immediately', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Dismissable" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Dismissable')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
  });

  it('limits to 5 toasts max', () => {
    function MultiTrigger() {
      const { toast } = useToast();
      return <button onClick={() => {
        for (let i = 1; i <= 7; i++) toast(`Toast ${i}`);
      }}>Many</button>;
    }

    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Many'));
    // Should only keep the last 5
    const dismissBtns = screen.getAllByRole('button', { name: /dismiss/i });
    expect(dismissBtns.length).toBeLessThanOrEqual(5);
  });

  it('has aria-live region for accessibility', () => {
    const { container } = render(
      <ToastProvider>
        <div>test</div>
      </ToastProvider>
    );
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      function Bad() { useToast(); return null; }
      render(<Bad />);
    }).toThrow('useToast must be used within ToastProvider');
    spy.mockRestore();
  });
});
