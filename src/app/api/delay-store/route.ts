import { NextRequest, NextResponse } from 'next/server';
import {
  getObservationCount,
  getTrainObservationCounts,
  getAllObservations,
  getObservationsForTrain,
} from '@/lib/delayStore';

/**
 * GET /api/delay-store
 *   Returns a summary of everything in the observation store.
 *   Use this to verify Phase 1 is collecting data correctly.
 *
 * GET /api/delay-store?trainId=12561
 *   Returns only observations for that train, newest-first.
 *
 * GET /api/delay-store?trainId=12561&last=5
 *   Returns the N most recent observations for that train.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trainId = searchParams.get('trainId');
  const last = parseInt(searchParams.get('last') || '20', 10);

  if (trainId) {
    const obs = getObservationsForTrain(trainId).slice(0, last);
    return NextResponse.json({
      trainId,
      count: obs.length,
      observations: obs,
    });
  }

  // Summary view — all trains
  const allObs = getAllObservations();
  const counts = getTrainObservationCounts();

  // Last 20 observations across all trains, newest first
  const recent = [...allObs]
    .sort((a, b) => b.observedAt - a.observedAt)
    .slice(0, 20);

  return NextResponse.json({
    totalObservations: getObservationCount(),
    perTrain: counts,
    recentObservations: recent,
    note: 'This is the Phase 1 delay observation store (in-memory, Option A). Add ?trainId=XXXX to filter by train.',
  });
}
