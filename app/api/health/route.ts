import { NextResponse } from 'next/server';
import { FPL_API_BASE } from '@/lib/constants';
import { logger } from '@/lib/logger';

/**
 * Health check endpoint for uptime monitoring, load balancers, and deployment verification.
 * Returns the app status, version, uptime, and external dependency connectivity.
 *
 * GET /api/health
 */
export async function GET() {
  const start = Date.now();

  // Check FPL API connectivity
  let fplApiStatus: 'ok' | 'degraded' | 'down' = 'down';
  let fplApiLatency = 0;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    const fplStart = Date.now();

    const res = await fetch(`${FPL_API_BASE}/bootstrap-static/`, {
      signal: controller.signal,
      cache: 'no-store',
      method: 'HEAD',
    });

    clearTimeout(timer);
    fplApiLatency = Date.now() - fplStart;

    if (res.ok) {
      fplApiStatus = fplApiLatency > 3_000 ? 'degraded' : 'ok';
    } else {
      fplApiStatus = 'degraded';
    }
  } catch {
    fplApiStatus = 'down';
  }

  const overallStatus = fplApiStatus === 'down' ? 'degraded' : 'ok';
  const statusCode = overallStatus === 'ok' ? 200 : 503;

  logger.info('health check', {
    status: overallStatus,
    fplApi: fplApiStatus,
    fplApiLatency,
    totalLatency: Date.now() - start,
  });

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      latency: Date.now() - start,
      checks: {
        fplApi: {
          status: fplApiStatus,
          latency: fplApiLatency,
          url: FPL_API_BASE,
        },
      },
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
