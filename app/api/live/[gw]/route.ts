import { NextResponse } from 'next/server';
import { fplFetch } from '@/lib/fpl-fetch';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gw: string }> }
) {
  try {
    const { gw } = await params;
    const gwNum = parseInt(gw, 10);
    if (isNaN(gwNum) || gwNum < 1 || gwNum > 38) {
      return NextResponse.json(
        { error: 'Invalid gameweek' },
        { status: 400 }
      );
    }

    // Fetch both GW fixtures and live element data in parallel
    const [fixtures, liveData] = await Promise.all([
      fplFetch<unknown[]>(`/fixtures/?event=${gwNum}`, { cache: 'no-store' }),
      fplFetch<{ elements?: unknown[] }>(`/event/${gwNum}/live/`, { cache: 'no-store' }),
    ]);

    return NextResponse.json({
      fixtures,
      elements: liveData.elements || [],
    });
  } catch (error) {
    console.error('Error fetching live data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
}
