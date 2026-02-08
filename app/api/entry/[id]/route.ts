import { NextResponse } from 'next/server';
import { getEntry } from '@/lib/fpl-server';

export const dynamic = 'force-dynamic';

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
    const data = await getEntry(entryId);

    if (!data) {
      return NextResponse.json(
        { error: 'Team not found. Check your FPL ID.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching FPL entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team data. Please try again.' },
      { status: 500 }
    );
  }
}
