import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/vitals
 * Receives Web Vitals metrics from the client.
 * Logs them for server-side aggregation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    logger.info('web-vital', {
      metric: body.name,
      value: body.value,
      rating: body.rating,
      page: body.page,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
