import { NextResponse } from 'next/server';
import { fplFetch } from '@/lib/fpl-fetch';

export async function GET() {
  try {
    const data = await fplFetch('/bootstrap-static/', {
      next: { revalidate: 300 },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching FPL data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FPL data. The FPL API may be unreachable.' },
      { status: 502 }
    );
  }
}
