import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory sliding window rate limiter
// In production, use Redis or similar for distributed rate limiting
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP

const requestLog = new Map<string, number[]>();

// Clean up stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of requestLog) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}

function isRateLimited(ip: string): boolean {
  cleanup();
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const timestamps = requestLog.get(ip) ?? [];
  const recent = timestamps.filter(t => t > cutoff);
  
  if (recent.length >= MAX_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }
  
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

export function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_REQUESTS),
        },
      }
    );
  }

  // Add Server-Timing header for observability
  const start = Date.now();
  const response = NextResponse.next();
  const duration = Date.now() - start;

  response.headers.set('Server-Timing', `middleware;dur=${duration}`);
  response.headers.set('X-Request-Id', crypto.randomUUID());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
