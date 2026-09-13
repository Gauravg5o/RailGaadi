import { NextRequest, NextResponse } from 'next/server';
import {
  getObservationCount,
  getTrainObservationCounts,
  getAllObservations,
  getObservationsForTrain,
  persistDelayObservation,
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
 *
 * POST /api/delay-store/seed  (body: { trainId, scenario })
 *   Injects demo observations so you can see the full prediction UI immediately.
 *   scenario: "growing" | "recovering" | "stable"
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
    note: 'Add ?trainId=XXXX to filter. POST with {trainId,scenario} to seed demo data.',
  });
}

export async function POST(request: NextRequest) {
  let body: { trainId?: string; scenario?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const trainId = body.trainId || '12561';
  const scenario = (body.scenario || 'growing') as 'growing' | 'recovering' | 'stable';

  // Build realistic delay sequences for each scenario.
  // Spread observations 6+ minutes apart so they clear the 5-min dedupe window.
  const now = Date.now();
  const SIX_MIN = 6 * 60 * 1000;
  const dayOfWeek = new Date().getDay();

  type ScenarioRow = { code: string; delay: number; sched: string };
  const SCENARIOS: Record<string, ScenarioRow[]> = {
    growing: [
      { code: 'CNB',  delay: 3,  sched: '08:10' },
      { code: 'ALD',  delay: 5,  sched: '09:45' },
      { code: 'PRYJ', delay: 8,  sched: '10:30' },
      { code: 'MUV',  delay: 12, sched: '11:50' },
      { code: 'DDU',  delay: 17, sched: '13:15' },
    ],
    recovering: [
      { code: 'CNB',  delay: 20, sched: '08:10' },
      { code: 'ALD',  delay: 16, sched: '09:45' },
      { code: 'PRYJ', delay: 11, sched: '10:30' },
      { code: 'MUV',  delay: 7,  sched: '11:50' },
      { code: 'DDU',  delay: 3,  sched: '13:15' },
    ],
    stable: [
      { code: 'CNB',  delay: 8,  sched: '08:10' },
      { code: 'ALD',  delay: 7,  sched: '09:45' },
      { code: 'PRYJ', delay: 9,  sched: '10:30' },
      { code: 'MUV',  delay: 8,  sched: '11:50' },
      { code: 'DDU',  delay: 8,  sched: '13:15' },
    ],
  };

  const rows = SCENARIOS[scenario] ?? SCENARIOS.growing;
  let injected = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Spread each observation 6+ minutes apart so dedupe window is cleared
    const observedAt = now - (rows.length - i) * SIX_MIN;

    // Compute actualTime = scheduled + delay
    const [hStr, mStr] = row.sched.split(':');
    const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + row.delay;
    const ah = Math.floor(totalMins / 60) % 24;
    const am = totalMins % 60;
    const actualTime = `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`;

    persistDelayObservation({
      trainId,
      stationCode: row.code,
      scheduledTime: row.sched,
      actualTime,
      delayMinutes: row.delay,
      observedAt,
      dayOfWeek,
    });
    injected++;
  }

  return NextResponse.json({
    ok: true,
    trainId,
    scenario,
    injected,
    message: `Seeded ${injected} observations for train ${trainId} (scenario: ${scenario}). Now call GET /api/predict-delay/${trainId} to see the prediction.`,
  });
}
