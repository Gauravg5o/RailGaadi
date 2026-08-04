import { NextRequest, NextResponse } from 'next/server';

// Use server-side env var (not NEXT_PUBLIC_) so it's never exposed to browser
const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND}/api/trains/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[trains proxy] Backend error ${res.status} for ${url}`);
      return NextResponse.json({ error: `Backend returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[trains proxy] Connection error for ${url}:`, error.message);
    return NextResponse.json(
      { error: 'Backend unreachable. Make sure backend server is running on port 4000.' },
      { status: 503 }
    );
  }
}
