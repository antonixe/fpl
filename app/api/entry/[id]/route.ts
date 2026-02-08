import { NextResponse } from 'next/server';
import { FPL_API_BASE } from '@/lib/constants';
import { fplFetch } from '@/lib/fpl-fetch';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId) || entryId <= 0) {
    return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
  }

  try {
    // Fetch entry info to determine current GW
    let entry: { current_event?: number };
    try {
      entry = await fplFetch<{ current_event?: number }>(`/entry/${entryId}/`, {
        cache: 'no-store',
      });
    } catch {
      return NextResponse.json({ error: 'Team not found. Check your FPL ID.' }, { status: 404 });
    }

    const currentEvent = entry.current_event;

    // Fetch current GW picks and transfer history in parallel
    const [picks, history] = await Promise.all([
      currentEvent
        ? fplFetch(`/entry/${entryId}/event/${currentEvent}/picks/`, { cache: 'no-store' }).catch(() => null)
        : null,
      fplFetch<{ chips?: unknown[]; current?: unknown[] }>(`/entry/${entryId}/history/`, { cache: 'no-store' }).catch(() => null),
    ]);

    return NextResponse.json({
      entry,
      picks,
      chips: history?.chips || [],
      season_history: history?.current || [],
    });
  } catch (error) {
    console.error('Error fetching FPL entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team data. Please try again.' },
      { status: 500 }
    );
  }
}
