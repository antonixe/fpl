import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants
vi.mock('@/lib/constants', () => ({
  FPL_API_BASE: 'https://fantasy.premierleague.com/api',
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 200 with ok status when FPL API is reachable', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.fplApi.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('latency');
    expect(body.checks.fplApi).toHaveProperty('latency');
    expect(body.checks.fplApi).toHaveProperty('url');
  });

  it('returns 503 with degraded status when FPL API is down', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.checks.fplApi.status).toBe('down');
  });

  it('returns degraded when FPL API returns non-ok status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.fplApi.status).toBe('degraded');
  });

  it('includes environment and version info', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const body = await response.json();

    expect(body.environment).toBe('test');
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });

  it('sets no-cache headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe(
      'no-cache, no-store, must-revalidate'
    );
  });
});
