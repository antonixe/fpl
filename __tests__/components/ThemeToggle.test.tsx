import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeToggle, ThemeProvider } from '@/components/ThemeToggle';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
Object.defineProperty(window, 'matchMedia', { value: matchMediaMock });

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('renders with system theme icon by default', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Theme: system');
  });

  it('cycles through themes: system → light → dark → system', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // Start with system — cycle shows light
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Theme: light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('fpl-theme', 'light');

    // Cycle to dark
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Theme: dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('fpl-theme', 'dark');

    // Cycle back to system
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Theme: system');
  });

  it('displays correct icons per theme', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // system = ◐
    expect(button.textContent).toBe('◐');

    // click → light = ☀
    fireEvent.click(button);
    expect(button.textContent).toBe('☀');

    // click → dark = ☽
    fireEvent.click(button);
    expect(button.textContent).toBe('☽');
  });

  it('restores theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Theme: dark');
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('renders children after mounting', async () => {
    render(
      <ThemeProvider>
        <div>child content</div>
      </ThemeProvider>
    );
    // ThemeProvider renders null until mounted, then shows children
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('applies dark class when stored theme is dark', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    render(
      <ThemeProvider>
        <div>test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies dark class when system prefers dark and theme is system', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <div>test</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
