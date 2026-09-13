import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveTrainStatus } from '@/lib/trainsApi';
import { computeDelayPrediction, countRemainingStations, DelayPrediction } from '@/lib/delayEngine';

/**
 * GET /api/predict-delay/:trainId
 *
 * Returns a delay forecast for a given train, built from:
 *   1. The current live delay (fetched from the existing status cache in trainsApi)
 *   2. The OLS trend computed over observations stored in Phase 1
 *
 * Response shape:
 *   {
 *     currentDelay:      number,           // live delay in minutes
 *     projectedDelay:    number | null,    // null = not enough data
 *     confidence:        'none'|'low'|'medium'|'high',
 *     trendDirection:    'growing'|'recovering'|'stable',
 *     trendSlopePerStation: number,        // minutes per station (OLS result)
 *     basis:             string,           // "X observations across Y sessions"
 *     trendNote:         string,           // plain English explanation
 *     remainingStations: number,
 *     computedAt:        number,           // Unix ms
 *     cachedUntil:       number,           // Unix ms (for client-side display)
 *   }
 *
 * Caching: responses are cached in-process for CACHE_TTL_MS per train.
 * This prevents recomputing the prediction on every 30-second frontend poll —
 * the regression result only changes meaningfully when a new station is passed,
 * which happens every 10–30 minutes in practice.
 */

// ─── TTL Cache ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes — prediction doesn't change faster than this

interface CacheEntry {
  prediction: DelayPrediction;
  remainingStations: number;
  cachedAt: number;
}

const _predictionCache = new Map<string, CacheEntry>();

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trainId: string }> }
) {
  const { trainId } = await params;

  if (!trainId || !/^\d{4,5}$/.test(trainId)) {
    return NextResponse.json(
      { error: 'Invalid trainId — must be a 4- or 5-digit train number.' },
      { status: 400 }
    );
  }

  const nowMs = Date.now();

  // ── Check TTL cache ────────────────────────────────────────────────────────
  const cached = _predictionCache.get(trainId);
  if (cached && nowMs - cached.cachedAt < CACHE_TTL_MS) {
    console.log(`[predict-delay] Cache HIT for train ${trainId}`);
    return NextResponse.json(formatResponse(cached.prediction, cached.remainingStations, cached.cachedAt + CACHE_TTL_MS));
  }

  // ── Fetch live status to get current delay + remaining stations ────────────
  // Re-uses the existing fetchLiveTrainStatus which has its own 90-second cache,
  // so this does NOT add extra calls to the RailRadar API.
  let currentDelayMinutes = 0;
  let remainingStations = 0;

  try {
    const liveStatus = await fetchLiveTrainStatus(trainId);
    if (liveStatus) {
      currentDelayMinutes = liveStatus.delayMinutes ?? 0;
      remainingStations   = liveStatus.route?.stations
        ? countRemainingStations(liveStatus.route.stations)
        : 0;
    }
  } catch (err) {
    console.error(`[predict-delay] fetchLiveTrainStatus failed for ${trainId}:`, err);
    // Continue — we can still return a prediction even if live status fails,
    // using 0 as current delay (worst case: projection is 0 + slope * remaining)
  }

  // ── Compute prediction ─────────────────────────────────────────────────────
  const prediction = computeDelayPrediction(trainId, currentDelayMinutes, remainingStations);

  // ── Populate cache ─────────────────────────────────────────────────────────
  _predictionCache.set(trainId, { prediction, remainingStations, cachedAt: nowMs });

  console.log(
    `[predict-delay] train=${trainId} | ` +
    `currentDelay=${currentDelayMinutes}m | remainingStations=${remainingStations} | ` +
    `projected=${prediction.projectedDelayMinutes}m | confidence=${prediction.confidence}`
  );

  return NextResponse.json(
    formatResponse(prediction, remainingStations, nowMs + CACHE_TTL_MS)
  );
}

// ─── Response formatter ───────────────────────────────────────────────────────

function formatResponse(
  prediction: DelayPrediction,
  remainingStations: number,
  cachedUntil: number
) {
  return {
    trainId:              prediction.trainId,
    currentDelay:         prediction.currentDelayMinutes,
    projectedDelay:       prediction.projectedDelayMinutes,
    confidence:           prediction.confidence,
    trendDirection:       prediction.trendDirection,
    trendSlopePerStation: prediction.trendSlopePerStation,
    basis:                prediction.basisDescription,
    trendNote:            prediction.trendNote,
    remainingStations,
    recentObservations:   prediction.recentObservationCount,
    totalObservations:    prediction.totalObservationCount,
    computedAt:           prediction.computedAt,
    cachedUntil,
  };
}
