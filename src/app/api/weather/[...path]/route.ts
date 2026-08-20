import { NextRequest, NextResponse } from 'next/server';
import { GET as weatherHandler } from '../route';

export async function GET(request: NextRequest) {
  return weatherHandler(request);
}
