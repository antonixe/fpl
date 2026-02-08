import { NextResponse } from 'next/server';
import { fplFetch } from '@/lib/fpl-fetch';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId) || playerId <= 0) {
    return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
  }

  try {
    const data = await fplFetch(`/element-summary/${playerId}/`, {
      next: { revalidate: 300 },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data. The FPL API may be unreachable.' },
      { status: 502 }
    );
  }
}
