import { NextResponse } from 'next/server';
import { getFixtures } from '@/lib/fpl-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getFixtures();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixtures. The FPL API may be unreachable.' },
      { status: 502 }
    );
  }
}
