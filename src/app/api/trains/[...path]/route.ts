import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveTrainStatus, searchTrainsBackend } from '@/lib/trainsApi';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const pathParts = resolvedParams.path;
  const searchParams = request.nextUrl.searchParams;

  try {
    // 1. Search endpoint: /api/trains/search?q=...
    if (pathParts[0] === 'search') {
      const q = searchParams.get('q') || '';
      const results = await searchTrainsBackend(q);
      return NextResponse.json(results);
    }

    // 2. Train endpoints: /api/trains/:number/status or /api/trains/:number/info
    if (pathParts.length >= 2) {
      const trainNumber = pathParts[0];
      const action = pathParts[1];

      if (action === 'status' || action === 'info') {
        const liveData = await fetchLiveTrainStatus(trainNumber);
        if (liveData) {
          return NextResponse.json(liveData);
        }
      }
    }

    // Fallback if path matched single train number: /api/trains/:number
    if (pathParts.length === 1 && /^\d{4,5}$/.test(pathParts[0])) {
      const liveData = await fetchLiveTrainStatus(pathParts[0]);
      if (liveData) {
        return NextResponse.json(liveData);
      }
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error: any) {
    console.error(`[api/trains Error]:`, error);
    return NextResponse.json({ error: 'Server error processing request' }, { status: 500 });
  }
}
