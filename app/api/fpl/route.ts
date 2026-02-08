import { NextResponse } from 'next/server';
import { getBootstrapData } from '@/lib/fpl-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getBootstrapData();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching FPL data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FPL data. The FPL API may be unreachable.' },
      { status: 502 }
    );
  }
}
